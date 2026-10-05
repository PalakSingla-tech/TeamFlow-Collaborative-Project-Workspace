import { getStoredToken } from "@/lib/api";

export type ConnectionStatus = "connected" | "reconnecting" | "offline";

export type ProjectEvent<T = unknown> = {
  type: string;
  projectId: string;
  message?: string;
  actorName?: string;
  payload: T;
};

type ProjectRealtimeOptions = {
  projectId: string;
  onEvent: (event: ProjectEvent) => void;
  onStatusChange: (status: ConnectionStatus) => void;
};

function getSocketUrl(): string {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
  }
  return "ws://127.0.0.1:8081/ws";
}

export class ProjectRealtimeClient {
  private socket: WebSocket | null = null;
  private retryTimer: number | null = null;
  private retryCount = 0;
  private stopped = false;

  constructor(private readonly options: ProjectRealtimeOptions) {}

  connect() {
    this.stopped = false;
    this.openSocket();
  }

  disconnect() {
    this.stopped = true;

    if (this.retryTimer) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    this.socket?.close();
    this.socket = null;
    this.options.onStatusChange("offline");
  }

  private openSocket() {
    if (this.stopped) {
      return;
    }

    const socketUrl = getSocketUrl();
    this.options.onStatusChange(this.retryCount ? "reconnecting" : "offline");

    try {
      this.socket = new WebSocket(socketUrl);

      this.socket.onopen = () => {
        this.retryCount = 0;
        const token = getStoredToken();
        const connectHeaders: Record<string, string> = {
          "accept-version": "1.2",
          "heart-beat": "10000,10000",
        };
        if (token) {
          connectHeaders.Authorization = `Bearer ${token}`;
        }
        this.sendFrame("CONNECT", connectHeaders);
      };

      this.socket.onmessage = (message) => this.handleMessage(message);
      this.socket.onclose = () => this.scheduleReconnect();
      this.socket.onerror = () => {
        try {
          this.socket?.close();
        } catch {
          // ignore
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private handleMessage(message: MessageEvent) {
    if (typeof message.data !== "string") {
      return;
    }

    for (const rawFrame of message.data.split("\0")) {
      if (!rawFrame.trim()) {
        continue;
      }

      const [head, ...bodyParts] = rawFrame.split("\n\n");
      const [command] = head.split("\n");
      const body = bodyParts.join("\n\n");

      if (command === "CONNECTED") {
        // Subscribe to /topic/project/{projectId} (matching Spring Boot ProjectEventPublisher)
        this.sendFrame("SUBSCRIBE", {
          id: `project-${this.options.projectId}`,
          destination: `/topic/project/${this.options.projectId}`,
          ack: "auto",
        });
        this.options.onStatusChange("connected");
      }

      if (command === "MESSAGE") {
        try {
          const parsed = JSON.parse(body);
          this.options.onEvent({
            type: parsed.eventType || parsed.type || "UNKNOWN",
            projectId: String(parsed.projectId || this.options.projectId),
            message: parsed.message,
            actorName: parsed.actorName,
            payload: parsed.data ?? parsed,
          });
        } catch {
          continue;
        }
      }
    }
  }

  private sendFrame(command: string, headers: Record<string, string>, body = "") {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }

    const headerLines = Object.entries(headers)
      .map(([key, value]) => `${key}:${value}`)
      .join("\n");
    this.socket.send(`${command}\n${headerLines}\n\n${body}\0`);
  }

  private scheduleReconnect() {
    if (this.stopped) {
      return;
    }

    this.retryCount += 1;
    this.options.onStatusChange("reconnecting");
    const delay = Math.min(1000 * 2 ** (this.retryCount - 1), 10000);
    this.retryTimer = window.setTimeout(() => this.openSocket(), delay);
  }
}
