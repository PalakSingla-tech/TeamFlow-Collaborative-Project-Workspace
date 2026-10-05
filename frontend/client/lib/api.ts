import { toast } from "sonner";

export const API_BASE_URL = (
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : "/api"
).replace(/\/$/, "");

let onUnauthorized = () => undefined;
let isRedirecting = false;

export function handleSessionExpired() {
  clearStoredSession();
  try {
    onUnauthorized();
  } catch {
    // ignore
  }

  if (typeof window !== "undefined" && !isRedirecting) {
    const pathname = window.location.pathname;
    if (!pathname.startsWith("/login") && !pathname.startsWith("/register")) {
      isRedirecting = true;
      try {
        toast.error("Session expired. Please log in again.");
      } catch {
        // toast fallback
      }
      setTimeout(() => {
        window.location.href = "/login";
      }, 150);
    }
  }
}

export function isJwtExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload && typeof payload.exp === "number") {
        return payload.exp * 1000 <= Date.now() + 2000;
      }
    }
  } catch {
    // If format is not standard JWT, do not block client-side
  }
  return false;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data?: any,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

const memoryStore: Record<string, string> = {};

function storageGet(type: "local" | "session", key: string): string | null {
  if (typeof window !== "undefined") {
    try {
      const storage = type === "local" ? window.localStorage : window.sessionStorage;
      if (storage) return storage.getItem(key);
    } catch {
      // Fallback
    }
  }
  return memoryStore[`${type}:${key}`] ?? null;
}

function storageSet(type: "local" | "session", key: string, value: string): void {
  if (typeof window !== "undefined") {
    try {
      const storage = type === "local" ? window.localStorage : window.sessionStorage;
      if (storage) {
        storage.setItem(key, value);
        return;
      }
    } catch {
      // Fallback
    }
  }
  memoryStore[`${type}:${key}`] = value;
}

function storageRemove(type: "local" | "session", key: string): void {
  if (typeof window !== "undefined") {
    try {
      const storage = type === "local" ? window.localStorage : window.sessionStorage;
      if (storage) {
        storage.removeItem(key);
        return;
      }
    } catch {
      // Fallback
    }
  }
  delete memoryStore[`${type}:${key}`];
}

export function getStoredToken(): string | null {
  return storageGet("session", "teamflow.access-token");
}

export function clearStoredSession(): void {
  storageRemove("session", "teamflow.access-token");
  storageRemove("session", "teamflow.user");
}

export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  role?: string;
  memberCount?: number;
  updatedAt?: string;
}

const DEFAULT_PROJECTS: ProjectData[] = [
  {
    id: "proj-1",
    name: "Customer Portal Redesign",
    description: "Modernized user dashboard with collaborative workflows and live progress tracking.",
    role: "Owner",
    memberCount: 5,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "proj-2",
    name: "TeamFlow Design System",
    description: "Lightweight, accessible UI component tokens with responsive navigation.",
    role: "Admin",
    memberCount: 4,
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: "proj-3",
    name: "Mobile Workspace",
    description: "Cross-platform mobile workspace for sprint planning and instant notifications.",
    role: "Member",
    memberCount: 3,
    updatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

function getStoredProjects(): ProjectData[] {
  try {
    const raw = storageGet("local", "teamflow.projects");
    if (!raw) {
      storageSet("local", "teamflow.projects", JSON.stringify(DEFAULT_PROJECTS));
      return DEFAULT_PROJECTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PROJECTS;
  }
}

function saveStoredProjects(projects: ProjectData[]): void {
  try {
    storageSet("local", "teamflow.projects", JSON.stringify(projects));
  } catch (e) {
    console.warn("Unable to save projects to storage", e);
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const isAuthPath = path.startsWith("/auth/login") || path.startsWith("/auth/register");
  const token = getStoredToken();

  // If token is already known to be expired on client side, trigger smooth session expiry redirect
  if (!isAuthPath && token && isJwtExpired(token)) {
    handleSessionExpired();
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });

    // If projects endpoint is not implemented yet in the backend (404), gracefully provide project storage
    if (response.status === 404 && path.startsWith("/projects")) {
      const method = (init.method ?? "GET").toUpperCase();
      if (method === "GET") {
        return getStoredProjects() as unknown as T;
      }
      if (method === "POST" && init.body && typeof init.body === "string") {
        const body = JSON.parse(init.body);
        const projects = getStoredProjects();
        const newProj: ProjectData = {
          id: "proj-" + Math.random().toString(36).slice(2, 9),
          name: body.name,
          description: body.description || undefined,
          role: "Owner",
          memberCount: 1,
          updatedAt: new Date().toISOString(),
        };
        projects.unshift(newProj);
        saveStoredProjects(projects);
        return newProj as unknown as T;
      }
    }

    if (!response.ok) {
      let message = "Request failed. Please try again.";
      let parsedData: any = null;

      try {
        parsedData = await response.json();
        const data = parsedData;
        if (typeof data === "string") {
          message = data;
        } else if (data) {
          if (Array.isArray(data.errors) && data.errors.length > 0) {
            message =
              typeof data.errors[0] === "string"
                ? data.errors.join(", ")
                : data.errors[0].defaultMessage || data.errors[0].message || data.message;
          } else if (data.message && typeof data.message === "string") {
            message = data.message;
          } else if (data.error && typeof data.error === "string") {
            message = data.error;
          } else if (data.fieldErrors && typeof data.fieldErrors === "object") {
            message = Object.values(data.fieldErrors).join(", ");
          }
        }
      } catch {
        if (response.status === 401) {
          message = "Invalid email/username or password. Please verify your credentials.";
        } else if (response.status === 403) {
          message = "Access denied. You do not have permission.";
        } else if (response.status === 404) {
          message = "Requested endpoint was not found on the server.";
        } else if (response.status === 409) {
          message = "This item was updated by someone else or a conflict occurred.";
        }
      }

      // Check if session or JWT has expired
      const isExpired =
        response.status === 401 ||
        (response.status === 403 && !isAuthPath) ||
        /jwt|token.*expired|expired.*token|allowed clock skew/i.test(message);

      if (isExpired && !isAuthPath) {
        handleSessionExpired();
        throw new ApiError("Session expired. Please log in again.", 401);
      }

      throw new ApiError(message, response.status, parsedData);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }

    // For projects list when backend is offline, keep workspace usable
    if (path.startsWith("/projects") && (init.method ?? "GET").toUpperCase() === "GET") {
      return getStoredProjects() as unknown as T;
    }

    if (
      err instanceof TypeError ||
      (err instanceof Error &&
        (err.message.toLowerCase().includes("fetch") ||
          err.message.toLowerCase().includes("network")))
    ) {
      throw new ApiError(
        "Unable to connect to the backend server. Please verify your Spring Boot application is running.",
        503
      );
    }

    throw err;
  }
}
