import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { FolderKanban, Sparkles, UserPlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export interface MemberAddedEvent {
  type: "MEMBER_ADDED";
  projectId: string | number;
  projectName: string;
  addedByUsername: string;
  targetUsername?: string;
  targetEmail?: string;
  role: string;
  timestamp: number;
}

interface RealtimeNotificationContextType {
  broadcastMemberAdded: (event: Omit<MemberAddedEvent, "type" | "timestamp">) => void;
}

const RealtimeNotificationContext = createContext<RealtimeNotificationContextType | undefined>(undefined);

export function RealtimeNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [notification, setNotification] = useState<MemberAddedEvent | null>(null);
  const knownProjectIdsRef = useRef<Set<string>>(new Set());
  const initialFetchDoneRef = useRef(false);

  // Trigger popup and toast for member addition
  const triggerNotification = useCallback((event: MemberAddedEvent) => {
    setNotification(event);
    try {
      toast.success(`You've been added to "${event.projectName}"!`, {
        description: `${event.addedByUsername} invited you as a ${event.role}.`,
        duration: 8000,
        action: {
          label: "View Project",
          onClick: () => {
            navigate(`/projects/${event.projectId}`);
          },
        },
      });
    } catch {
      // toast fallback
    }
  }, [navigate]);

  // Method called when current user adds someone
  const broadcastMemberAdded = useCallback(
    (event: Omit<MemberAddedEvent, "type" | "timestamp">) => {
      const fullEvent: MemberAddedEvent = {
        ...event,
        type: "MEMBER_ADDED",
        timestamp: Date.now(),
      };

      // 1. BroadcastChannel (instant within browser tabs/windows)
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
          const channel = new BroadcastChannel("teamflow_member_events");
          channel.postMessage(fullEvent);
          channel.close();
        } catch {
          // ignore
        }
      }

      // 2. Storage event (cross-tab fallback)
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("teamflow_member_event", JSON.stringify(fullEvent));
          // Clean up shortly after
          setTimeout(() => {
            try {
              window.localStorage.removeItem("teamflow_member_event");
            } catch {
              // ignore
            }
          }, 2000);
        } catch {
          // ignore
        }
      }
    },
    []
  );

  // Check if incoming event belongs to this user
  const handleIncomingEvent = useCallback(
    (event: MemberAddedEvent) => {
      if (!user) return;
      const myUsername = (user.username || "").toLowerCase();
      const myEmail = (user.email || "").toLowerCase();
      const targetUser = (event.targetUsername || "").toLowerCase();
      const targetMail = (event.targetEmail || "").toLowerCase();

      // Check if this event is directed to me
      const isForMe =
        (targetUser && (targetUser === myUsername || targetUser === myEmail)) ||
        (targetMail && (targetMail === myUsername || targetMail === myEmail));

      if (isForMe) {
        triggerNotification(event);
      }
    },
    [user, triggerNotification]
  );

  // 1. Setup BroadcastChannel listener
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    const channel = new BroadcastChannel("teamflow_member_events");
    channel.onmessage = (msgEvent) => {
      if (msgEvent.data && msgEvent.data.type === "MEMBER_ADDED") {
        handleIncomingEvent(msgEvent.data as MemberAddedEvent);
      }
    };

    return () => {
      channel.close();
    };
  }, [handleIncomingEvent]);

  // 2. Setup Storage event listener (for cross-window/incognito synchronization)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "teamflow_member_event" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.type === "MEMBER_ADDED") {
            handleIncomingEvent(parsed as MemberAddedEvent);
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [handleIncomingEvent]);

  // 3. Background Project Membership Sync
  // Polls GET /api/projects every 3.5 seconds to detect any new projects user was added to on backend
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const checkNewProjects = async () => {
      try {
        const response = await apiRequest<any>("/projects");
        const list = Array.isArray(response)
          ? response
          : (response?.projects ?? response?.content ?? []);

        if (!isMounted) return;

        const currentIds = new Set<string>();

        // Also check if any member object has the user's real email from database
        for (const proj of list) {
          const pId = String(proj.projectId ?? proj.id ?? "");
          if (pId) currentIds.add(pId);

          if (Array.isArray(proj.members)) {
            const me = proj.members.find(
              (m: any) =>
                (m.userId && String(m.userId) === String(user.id)) ||
                (m.username && m.username.toLowerCase() === user.username?.toLowerCase())
            );
            if (me && me.email && (!user.email || user.email.endsWith("@example.com") || user.email !== me.email)) {
              updateUser({ email: me.email });
            }
          }
        }

        // If this is after initial load, detect if a new project was added
        if (initialFetchDoneRef.current) {
          for (const proj of list) {
            const pId = String(proj.projectId ?? proj.id ?? "");
            if (pId && !knownProjectIdsRef.current.has(pId)) {
              // Found a new project that was just added!
              const inviter = proj.ownerUsername || "A teammate";
              // Only trigger if I am not the owner who created it
              if (proj.ownerUsername?.toLowerCase() !== user.username?.toLowerCase()) {
                triggerNotification({
                  type: "MEMBER_ADDED",
                  projectId: pId,
                  projectName: proj.name ?? "New Project",
                  addedByUsername: inviter,
                  role: "Member",
                  timestamp: Date.now(),
                });
              }
              break;
            }
          }
        }

        knownProjectIdsRef.current = currentIds;
        initialFetchDoneRef.current = true;
      } catch {
        // ignore background errors
      }
    };

    // Initial check
    void checkNewProjects();

    // Polling interval
    const interval = window.setInterval(() => {
      void checkNewProjects();
    }, 3500);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [user, triggerNotification, updateUser]);

  return (
    <RealtimeNotificationContext.Provider value={{ broadcastMemberAdded }}>
      {children}

      {/* POP-UP MODAL DIALOG WHEN USER IS ADDED TO A PROJECT */}
      <Dialog open={Boolean(notification)} onOpenChange={(open) => !open && setNotification(null)}>
        <DialogContent className="max-w-[480px] overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl">
          <div className="relative bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-700 p-6 text-white">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <UserPlus className="size-6 text-white" />
              </span>
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                  <Sparkles className="size-3" /> New Project Invitation
                </span>
                <DialogTitle className="mt-1 text-xl font-bold text-white">
                  You've Been Added to a Project!
                </DialogTitle>
              </div>
            </div>
          </div>

          {notification && (
            <div className="p-6">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  <span className="text-brand-600 font-bold">{notification.addedByUsername}</span> has added you to:
                </p>
                <div className="mt-2.5 flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-lg bg-brand-100 text-brand-700">
                    <FolderKanban className="size-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-950">{notification.projectName}</h4>
                    <p className="text-xs text-slate-500">Assigned role: <span className="font-semibold text-slate-700">{notification.role}</span></p>
                  </div>
                </div>
              </div>

              <DialogDescription className="mt-4 text-xs leading-relaxed text-slate-600">
                You now have full access to view, update tasks, and collaborate with team members in this workspace in real-time.
              </DialogDescription>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setNotification(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = notification.projectId;
                    setNotification(null);
                    navigate(`/projects/${id}`);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-brand hover:bg-brand-700 transition"
                >
                  <FolderKanban className="size-3.5" />
                  <span>Open Project</span>
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </RealtimeNotificationContext.Provider>
  );
}

export function useRealtimeNotifications() {
  const context = useContext(RealtimeNotificationContext);
  if (!context) {
    throw new Error("useRealtimeNotifications must be used within RealtimeNotificationProvider");
  }
  return context;
}
