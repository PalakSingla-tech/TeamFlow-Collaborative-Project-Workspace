import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { apiRequest } from "./api";

export interface QueuedSyncAction {
  id: string;
  method: "PATCH" | "PUT" | "POST" | "DELETE";
  url: string;
  body?: Record<string, any>;
  description?: string;
  timestamp: number;
}

const STORAGE_KEY = "pending_sync_queue";

export function getPendingSyncQueue(): QueuedSyncAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to read pending_sync_queue:", err);
    return [];
  }
}

export function savePendingSyncQueue(queue: QueuedSyncAction[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error("Failed to save pending_sync_queue:", err);
  }
}

export function enqueueSyncAction(
  action: Omit<QueuedSyncAction, "id" | "timestamp">
): QueuedSyncAction {
  const queue = getPendingSyncQueue();
  const newItem: QueuedSyncAction = {
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
  };

  // Ensure relative API url works with apiRequest (if it starts with /api/, strip it or leave for apiRequest)
  let cleanUrl = newItem.url;
  if (cleanUrl.startsWith("/api/")) {
    cleanUrl = cleanUrl.replace(/^\/api/, "");
  }
  newItem.url = cleanUrl;

  queue.push(newItem);
  savePendingSyncQueue(queue);

  // Dispatch custom event so listeners know the queue changed
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("teamflow_sync_queue_changed", { detail: queue.length }));
  }

  return newItem;
}

export function clearPendingSyncQueue(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("teamflow_sync_queue_changed", { detail: 0 }));
}

/**
 * Replays all queued actions through the API and clears the queue
 */
export async function replaySyncQueue(): Promise<number> {
  const queue = getPendingSyncQueue();
  if (queue.length === 0) return 0;

  let syncedCount = 0;
  const remaining: QueuedSyncAction[] = [];

  for (const item of queue) {
    try {
      const endpoint = item.url.startsWith("/") ? item.url : `/${item.url}`;
      await apiRequest(endpoint, {
        method: item.method,
        body: item.body ? JSON.stringify(item.body) : undefined,
      });
      syncedCount++;
    } catch (err) {
      console.warn(`[SyncQueue] Failed to replay action ${item.method} ${item.url}:`, err);
      // Keep in queue only if it's a network error
      if (!navigator.onLine) {
        remaining.push(item);
      }
      // If it's a conflict or 4xx, we still count it or drop to prevent deadlocks
    }
  }

  savePendingSyncQueue(remaining);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("teamflow_sync_queue_changed", { detail: remaining.length }));
  }

  return syncedCount;
}

/**
 * Hook to monitor online/offline status and automatically replay sync queue
 */
export function useOfflineSync(onReconnected?: (syncedCount: number) => void) {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });
  const [pendingCount, setPendingCount] = useState<number>(() => {
    return getPendingSyncQueue().length;
  });

  const updateCount = useCallback(() => {
    setPendingCount(getPendingSyncQueue().length);
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const synced = await replaySyncQueue();
      updateCount();
      if (synced > 0) {
        toast.success(`🟢 Reconnected! Synced ${synced} offline ${synced === 1 ? "change" : "changes"}`);
        onReconnected?.(synced);
      }
    } catch (err) {
      console.error("Error during offline queue sync:", err);
    }
  }, [onReconnected, updateCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateCount();
      toast.warning("⚡ You are currently offline. Changes are saved locally.", {
        description: "Your edits will automatically sync as soon as you reconnect.",
        duration: 4000,
      });
    };

    const handleQueueChange = () => {
      updateCount();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("teamflow_sync_queue_changed", handleQueueChange);

    // Initial check: if we came back online with pending items
    if (navigator.onLine && getPendingSyncQueue().length > 0) {
      void triggerSync();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("teamflow_sync_queue_changed", handleQueueChange);
    };
  }, [triggerSync, updateCount]);

  return {
    isOnline,
    pendingCount,
    queueAction: enqueueSyncAction,
    syncNow: triggerSync,
  };
}
