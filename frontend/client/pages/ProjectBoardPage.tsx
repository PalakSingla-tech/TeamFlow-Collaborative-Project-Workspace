import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  GripVertical,
  Kanban,
  LayoutDashboard,
  ListTodo,
  LoaderCircle,
  MessageSquare,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
  Download,
  FileText,
  Paperclip,
  PlayCircle,
  Upload,
  CheckSquare,
  Link2,
  Share2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useRealtimeNotifications } from "@/lib/realtime-notifications";
import { ProjectRealtimeClient, ConnectionStatus } from "@/lib/realtime";
import { useOfflineSync } from "@/lib/offlineQueue";
import { RichTaskDescription } from "@/components/RichTaskDescription";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";

export interface AttachmentItem {
  id: number;
  taskId: number;
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  uploadedById?: number;
  uploadedByName?: string;
  uploadedAt?: string;
}

export interface TaskItem {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  assigneeId?: number;
  assigneeName?: string;
  status: TaskStatus;
  deadline?: string;
  version?: number;
  updatedAt?: string;
}

export interface ProjectMember {
  memberId: number;
  userId: number;
  username: string;
  email: string;
  role: string;
}

export interface ProjectDetail {
  projectId: number;
  name: string;
  description?: string;
  ownerId?: number;
  ownerUsername?: string;
  members?: ProjectMember[];
}

export interface MemberWorkload {
  userId?: number | null;
  username: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks?: number;
  todoTasks?: number;
  reviewTasks?: number;
  pendingTasks: number;
  progressPercentage?: number;
}

export interface ProjectDashboard {
  projectId: number;
  projectName?: string;
  totalTasks: number;
  tasksByStatus?: Record<string, number>;
  completionPercentage: number;
  overdueTasks: number;
  tasksDueToday: number;
  tasksDueThisWeek: number;
  memberWorkloads?: MemberWorkload[];
}

export interface CommentItem {
  id: number;
  taskId: number;
  authorId?: number;
  authorName?: string;
  authorEmail?: string;
  body: string;
  createdAt?: string;
}

const COLUMNS: {
  status: TaskStatus;
  label: string;
  badgeClass: string;
  headerBorder: string;
  dropBorder: string;
  barColor: string;
}[] = [
  {
    status: "TODO",
    label: "To Do",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    headerBorder: "border-slate-300",
    dropBorder: "border-brand-500 bg-brand-50/40 ring-2 ring-brand-200",
    barColor: "bg-slate-300",
  },
  {
    status: "IN_PROGRESS",
    label: "In Progress",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    headerBorder: "border-amber-400",
    dropBorder: "border-amber-500 bg-amber-50/40 ring-2 ring-amber-200",
    barColor: "bg-amber-500",
  },
  {
    status: "REVIEW",
    label: "In Review",
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200",
    headerBorder: "border-indigo-400",
    dropBorder: "border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-200",
    barColor: "bg-indigo-500",
  },
  {
    status: "DONE",
    label: "Completed",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    headerBorder: "border-emerald-400",
    dropBorder: "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-200",
    barColor: "bg-emerald-500",
  },
];

function formatDeadline(isoString?: string) {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.valueOf())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function isOverdue(isoString?: string, status?: TaskStatus) {
  if (!isoString || status === "DONE") return false;
  const date = new Date(isoString);
  return date.getTime() < Date.now();
}

function getInitials(name?: string) {
  if (!name) return "TF";
  return name
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function ProjectBoardPage({
  defaultTab = "board",
}: {
  defaultTab?: "board" | "dashboard" | "members";
}) {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { broadcastMemberAdded } = useRealtimeNotifications();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [dashboard, setDashboard] = useState<ProjectDashboard | null>(null);

  const initialTab =
    (searchParams.get("tab") as "board" | "dashboard" | "members") || defaultTab;
  const [activeTab, setActiveTab] = useState<"board" | "dashboard" | "members">(initialTab);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingDashboard, setIsRefreshingDashboard] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Drag and drop state
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);

  // Safety listener to ensure drag state always clears on drop or cancel
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setDraggingTaskId(null);
      setDragOverCol(null);
    };
    window.addEventListener("dragend", handleGlobalDragEnd);
    window.addEventListener("drop", handleGlobalDragEnd);
    return () => {
      window.removeEventListener("dragend", handleGlobalDragEnd);
      window.removeEventListener("drop", handleGlobalDragEnd);
    };
  }, []);

  // Java Spring Boot WebSocket real-time client
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>("offline");

  useEffect(() => {
    if (!projectId) return;

    const realtime = new ProjectRealtimeClient({
      projectId,
      onStatusChange: (status) => setWsStatus(status),
      onEvent: (event) => {
        // Refresh project data live upon receiving WebSocket events from Java backend
        void loadProjectData();
      },
    });

    realtime.connect();

    return () => {
      realtime.disconnect();
    };
  }, [projectId]);

  // Offline optimistic local queue sync hook
  const { isOnline, pendingCount, queueAction, syncNow } = useOfflineSync(() => {
    void loadProjectData();
  });

  // Share & Auto-Join State
  const [isAutoJoinOpen, setIsAutoJoinOpen] = useState(false);
  const [isJoiningProject, setIsJoiningProject] = useState(false);

  // Modals state
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState<TaskStatus>("TODO");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState<string>("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberIdentifier, setNewMemberIdentifier] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("MEMBER");
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  // Selected task drawer/comments/attachments
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [taskComments, setTaskComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [taskAttachments, setTaskAttachments] = useState<AttachmentItem[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  // Edit Task Title and Description with optimistic concurrency control
  const [isEditingTaskContent, setIsEditingTaskContent] = useState(false);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDesc, setEditTaskDesc] = useState("");
  const [isSavingTaskContent, setIsSavingTaskContent] = useState(false);

  // Current user's project-specific member record & role calculation
  const currentMember = useMemo(() => {
    if (!user) return null;
    return members.find(
      (m) =>
        (m.userId && user.id && String(m.userId) === String(user.id)) ||
        (m.username && user.username && m.username.toLowerCase() === user.username.toLowerCase()) ||
        (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())
    );
  }, [members, user]);

  const isProjectOwner = Boolean(
    (project?.ownerId && user?.id && String(project.ownerId) === String(user.id)) ||
    (project?.ownerUsername && user?.username && project.ownerUsername.toLowerCase() === user.username.toLowerCase()) ||
    (currentMember?.role?.toUpperCase() === "OWNER")
  );

  const isProjectAdmin = Boolean(
    currentMember?.role?.toUpperCase() === "ADMIN"
  );

  // Members are NOT allowed to delete tasks from the Kanban board or Task Details
  const canDeleteTask = isProjectOwner || isProjectAdmin;

  // Auto-join preview dialog when visiting with ?invite=true
  useEffect(() => {
    if (isLoading || !project || !user) return;
    const isInvite = searchParams.get("invite") === "true";
    if (!isInvite) return;

    const isAlreadyMember = members.some(
      (m) =>
        (m.userId && user.id && String(m.userId) === String(user.id)) ||
        (m.username && user.username && m.username.toLowerCase() === user.username.toLowerCase()) ||
        (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())
    );

    if (isAlreadyMember) {
      toast.info(`You are already a collaborator on ${project.name}`);
      navigate(`/projects/${projectId}`, { replace: true });
    } else {
      setIsAutoJoinOpen(true);
    }
  }, [isLoading, project, members, user, searchParams, projectId, navigate]);

  // Copy shareable invite link with auto-join parameter
  const handleCopyInviteLink = () => {
    if (!projectId) return;
    const inviteUrl = `${window.location.origin}/projects/${projectId}?invite=true`;
    navigator.clipboard
      .writeText(inviteUrl)
      .then(() => {
        toast.success("Copied to clipboard!", {
          description: "Teammates who open this link can preview and instantly join this project.",
        });
      })
      .catch(() => {
        toast.error("Failed to copy invite link.");
      });
  };

  // Auto-join execution when teammate accepts invite preview using backend self-join API
  const handleAcceptInvite = async () => {
    if (!projectId || !user) return;
    setIsJoiningProject(true);
    try {
      let addedMember: ProjectMember;
      try {
        // Call the dedicated self-join endpoint: POST /api/projects/{projectId}/join
        addedMember = await apiRequest<ProjectMember>(`/projects/${projectId}/join`, {
          method: "POST",
        });
      } catch (err) {
        // Fallback to members endpoint if needed
        const identifier = user.email || user.username || `user_${user.id}`;
        addedMember = await apiRequest<ProjectMember>(`/projects/${projectId}/members`, {
          method: "POST",
          body: JSON.stringify({
            emailOrUsername: identifier,
            role: "MEMBER",
          }),
        });
      }

      setMembers((prev) => {
        const exists = prev.some(
          (m) =>
            (m.userId && addedMember.userId && String(m.userId) === String(addedMember.userId)) ||
            (m.username && addedMember.username && m.username.toLowerCase() === addedMember.username.toLowerCase())
        );
        return exists ? prev : [...prev, addedMember];
      });

      toast.success(`🎉 You've successfully joined ${project?.name || "this project"}!`, {
        description: "You now have full access to view, update, and manage tasks.",
      });

      setIsAutoJoinOpen(false);
      navigate(`/projects/${projectId}`, { replace: true });

      if (project) {
        broadcastMemberAdded({
          projectId: Number(projectId),
          projectName: project.name,
          targetEmail: addedMember.email || user.email || "",
          targetUsername: addedMember.username || user.username || "Team Member",
          role: "MEMBER",
          addedByUsername: user.username || "Team Member",
        });
      }
    } catch {
      toast.success(`Welcome to ${project?.name || "this project"}!`);
      setIsAutoJoinOpen(false);
      navigate(`/projects/${projectId}`, { replace: true });
    } finally {
      setIsJoiningProject(false);
    }
  };

  // Load project details, members, tasks, dashboard
  const loadProjectData = async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError("");

    try {
      // 1. Load project info
      const projRes = await apiRequest<any>(`/projects/${projectId}`);
      const normProject: ProjectDetail = {
        projectId: Number(projRes.projectId ?? projRes.id ?? projectId),
        name: projRes.name ?? "Project Workspace",
        description: projRes.description,
        ownerId: projRes.ownerId,
        ownerUsername: projRes.ownerUsername,
        members: projRes.members,
      };
      setProject(normProject);

      // 2. Load members
      try {
        const memRes = await apiRequest<any[]>(`/projects/${projectId}/members`);
        if (Array.isArray(memRes)) {
          setMembers(memRes);
        } else if (normProject.members) {
          setMembers(normProject.members);
        }
      } catch {
        if (normProject.members) setMembers(normProject.members);
      }

      // 3. Load tasks
      try {
        const tasksRes = await apiRequest<any>(`/projects/${projectId}/tasks?size=200`);
        const taskList: TaskItem[] = Array.isArray(tasksRes)
          ? tasksRes
          : (tasksRes?.content ?? []);
        setTasks(taskList);
      } catch {
        setTasks([]);
      }

      // 4. Load dashboard
      try {
        const dashRes = await apiRequest<ProjectDashboard>(`/projects/${projectId}/dashboard`);
        if (dashRes) setDashboard(dashRes);
      } catch {
        // Fallback calculation will handle metrics if endpoint is unavailable
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to load project workspace.");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshDashboard = async () => {
    if (!projectId) return;
    setIsRefreshingDashboard(true);
    try {
      const dashRes = await apiRequest<ProjectDashboard>(`/projects/${projectId}/dashboard`);
      if (dashRes) setDashboard(dashRes);
    } catch {
      // ignore
    } finally {
      setIsRefreshingDashboard(false);
    }
  };

  useEffect(() => {
    void loadProjectData();
  }, [projectId]);

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData("text/plain", String(taskId));
    e.dataTransfer.effectAllowed = "move";
    setDraggingTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e: React.DragEvent, colStatus: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCol !== colStatus) {
      setDragOverCol(colStatus);
    }
  };

  const handleDragLeave = (e: React.DragEvent, colStatus: TaskStatus) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverCol === colStatus) {
      setDragOverCol(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskIdStr = e.dataTransfer.getData("text/plain");
    const taskId = Number(taskIdStr) || draggingTaskId;
    setDraggingTaskId(null);
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    // Optimistic UI update
    const previousTasks = [...tasks];
    const previousDashboard = dashboard;
    setTasks((current) =>
      current.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );

    // Optimistic dashboard counters update
    setDashboard((prev) => {
      if (!prev) return prev;
      const oldStatus = task.status;
      const newStatusMap = { ...(prev.tasksByStatus || {}) };
      newStatusMap[oldStatus] = Math.max(0, (newStatusMap[oldStatus] || 1) - 1);
      newStatusMap[targetStatus] = (newStatusMap[targetStatus] || 0) + 1;
      const done = newStatusMap.DONE || 0;
      const total = prev.totalTasks || tasks.length;
      return {
        ...prev,
        tasksByStatus: newStatusMap,
        completionPercentage: total > 0 ? Math.round((done / total) * 1000) / 10 : 0,
      };
    });

    // If offline, queue action with optimistic zero delay
    if (!navigator.onLine) {
      queueAction({
        method: "PATCH",
        url: `/tasks/${taskId}/status`,
        body: { status: targetStatus },
        description: `Move task to ${targetStatus}`,
      });
      const col = COLUMNS.find((c) => c.status === targetStatus);
      toast.info(`⚡ Offline: Moved to ${col?.label ?? targetStatus}. Saved locally.`);
      return;
    }

    try {
      await apiRequest<TaskItem>(`/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: targetStatus }),
      });
      const col = COLUMNS.find((c) => c.status === targetStatus);
      toast.success(`Task moved to ${col?.label ?? targetStatus}`);
      void refreshDashboard();
    } catch (err) {
      if (!navigator.onLine || (err instanceof TypeError && err.message.toLowerCase().includes("fetch"))) {
        queueAction({
          method: "PATCH",
          url: `/tasks/${taskId}/status`,
          body: { status: targetStatus },
          description: `Move task to ${targetStatus}`,
        });
        toast.info("⚡ Connection lost. Change saved locally in offline queue.");
        return;
      }
      setTasks(previousTasks);
      setDashboard(previousDashboard);
      toast.error(err instanceof Error ? err.message : "Failed to update task status");
    }
  };

  // Quick status change handler
  const handleQuickStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const previousTasks = [...tasks];
    const previousDashboard = dashboard;
    setTasks((current) =>
      current.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    setDashboard((prev) => {
      if (!prev) return prev;
      const oldStatus = task.status;
      const newStatusMap = { ...(prev.tasksByStatus || {}) };
      newStatusMap[oldStatus] = Math.max(0, (newStatusMap[oldStatus] || 1) - 1);
      newStatusMap[newStatus] = (newStatusMap[newStatus] || 0) + 1;
      const done = newStatusMap.DONE || 0;
      const total = prev.totalTasks || tasks.length;
      return {
        ...prev,
        tasksByStatus: newStatusMap,
        completionPercentage: total > 0 ? Math.round((done / total) * 1000) / 10 : 0,
      };
    });

    // If offline, queue action with optimistic zero delay
    if (!navigator.onLine) {
      queueAction({
        method: "PATCH",
        url: `/tasks/${taskId}/status`,
        body: { status: newStatus },
        description: `Move task to ${newStatus}`,
      });
      const col = COLUMNS.find((c) => c.status === newStatus);
      toast.info(`⚡ Offline: Moved to ${col?.label ?? newStatus}. Saved locally.`);
      return;
    }

    try {
      await apiRequest<TaskItem>(`/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      const col = COLUMNS.find((c) => c.status === newStatus);
      toast.success(`Task moved to ${col?.label ?? newStatus}`);
      void refreshDashboard();
    } catch (err) {
      if (!navigator.onLine || (err instanceof TypeError && err.message.toLowerCase().includes("fetch"))) {
        queueAction({
          method: "PATCH",
          url: `/tasks/${taskId}/status`,
          body: { status: newStatus },
          description: `Move task to ${newStatus}`,
        });
        toast.info("⚡ Connection lost. Change saved locally in offline queue.");
        return;
      }
      setTasks(previousTasks);
      setDashboard(previousDashboard);
      toast.error(err instanceof Error ? err.message : "Failed to update task status");
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      toast.error("Please enter a task title.");
      return;
    }
    if (!projectId) return;

    setIsSubmittingTask(true);
    try {
      const payload: any = {
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        status: createTaskStatus,
        assigneeId: newTaskAssigneeId ? Number(newTaskAssigneeId) : undefined,
        deadline: newTaskDeadline ? `${newTaskDeadline}:00` : undefined,
      };

      const created = await apiRequest<TaskItem>(`/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setTasks((current) => [created, ...current]);
      toast.success("Task created successfully!");
      setIsCreateTaskOpen(false);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskAssigneeId("");
      setNewTaskDeadline("");
      void refreshDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create task.");
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Delete Task using interactive Sonner toast confirmation instead of generic browser alert
  const handleDeleteTask = (taskId: number) => {
    if (!canDeleteTask) {
      toast.error("Permission Denied: Members are not permitted to delete tasks from this project. Only Admins or the Project Owner can delete tasks.");
      return;
    }
    toast("Delete this task permanently?", {
      description: "This deliverable will be removed from the project workspace.",
      action: {
        label: "Confirm Delete",
        onClick: () => void executeDeleteTask(taskId),
      },
      cancel: {
        label: "Cancel",
        onClick: () => {},
      },
      duration: 6000,
    });
  };

  const executeDeleteTask = async (taskId: number) => {
    const previousTasks = [...tasks];
    setTasks((current) => current.filter((t) => t.id !== taskId));

    try {
      await apiRequest(`/tasks/${taskId}`, { method: "DELETE" });
      toast.success("Task deleted successfully.");
      if (selectedTask?.id === taskId) setSelectedTask(null);
      void refreshDashboard();
    } catch (err) {
      setTasks(previousTasks);
      toast.error(err instanceof Error ? err.message : "Failed to delete task.");
    }
  };

  // Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberIdentifier.trim()) {
      toast.error("Please enter a username or email address.");
      return;
    }
    if (!projectId) return;

    setIsSubmittingMember(true);
    try {
      const res = await apiRequest<ProjectMember>(`/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify({
          emailOrUsername: newMemberIdentifier.trim(),
          role: newMemberRole,
        }),
      });

      setMembers((current) => [...current, res]);
      toast.success(`Member added as ${newMemberRole}!`);

      // Trigger instant real-time notification to the added member
      try {
        broadcastMemberAdded({
          projectId: Number(projectId),
          projectName: project?.name || "Collaborative Project",
          addedByUsername: user?.name || user?.username || "A teammate",
          targetUsername: res.username || newMemberIdentifier.trim(),
          targetEmail: res.email || (newMemberIdentifier.includes("@") ? newMemberIdentifier.trim() : undefined),
          role: newMemberRole,
        });
      } catch (e) {
        console.warn("Realtime notification broadcast error:", e);
      }

      setIsAddMemberOpen(false);
      setNewMemberIdentifier("");
      setNewMemberRole("MEMBER");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add member to project.");
    } finally {
      setIsSubmittingMember(false);
    }
  };

  // Load comments and attachments when task is opened
  const openTaskDetail = async (task: TaskItem) => {
    setSelectedTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDesc(task.description || "");
    setIsEditingTaskContent(false);
    setIsLoadingComments(true);
    setIsLoadingAttachments(true);
    try {
      const comments = await apiRequest<CommentItem[]>(`/tasks/${task.id}/comments`);
      setTaskComments(Array.isArray(comments) ? comments : []);
    } catch {
      setTaskComments([]);
    } finally {
      setIsLoadingComments(false);
    }

    try {
      const atts = await apiRequest<AttachmentItem[]>(`/tasks/${task.id}/attachments`);
      setTaskAttachments(Array.isArray(atts) ? atts : []);
    } catch {
      setTaskAttachments([]);
    } finally {
      setIsLoadingAttachments(false);
    }
  };

  // Save task title and description with optimistic concurrency control (Spring Boot 409 Conflict handling) & offline queue
  const handleSaveTaskContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !editTaskTitle.trim()) return;

    if (!navigator.onLine) {
      const updated: TaskItem = {
        ...selectedTask,
        title: editTaskTitle.trim(),
        description: editTaskDesc.trim() || undefined,
      };
      setTasks((cur) => cur.map((t) => (t.id === selectedTask.id ? updated : t)));
      setSelectedTask(updated);
      setIsEditingTaskContent(false);
      queueAction({
        method: "PUT",
        url: `/tasks/${selectedTask.id}`,
        body: {
          title: editTaskTitle.trim(),
          description: editTaskDesc.trim() || undefined,
          baseVersion: selectedTask.version,
        },
        description: `Update task "${editTaskTitle.trim()}"`,
      });
      toast.info("⚡ Offline: Task updated locally. Will sync when reconnected.");
      return;
    }

    setIsSavingTaskContent(true);
    try {
      const updated = await apiRequest<TaskItem>(`/tasks/${selectedTask.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editTaskTitle.trim(),
          description: editTaskDesc.trim() || undefined,
          baseVersion: selectedTask.version,
        }),
      });

      setTasks((cur) => cur.map((t) => (t.id === selectedTask.id ? updated : t)));
      setSelectedTask(updated);
      setIsEditingTaskContent(false);
      toast.success("Task updated successfully!");
      void refreshDashboard();
    } catch (err) {
      if (!navigator.onLine || (err instanceof TypeError && err.message.toLowerCase().includes("fetch"))) {
        const updated: TaskItem = {
          ...selectedTask,
          title: editTaskTitle.trim(),
          description: editTaskDesc.trim() || undefined,
        };
        setTasks((cur) => cur.map((t) => (t.id === selectedTask.id ? updated : t)));
        setSelectedTask(updated);
        setIsEditingTaskContent(false);
        queueAction({
          method: "PUT",
          url: `/tasks/${selectedTask.id}`,
          body: {
            title: editTaskTitle.trim(),
            description: editTaskDesc.trim() || undefined,
            baseVersion: selectedTask.version,
          },
          description: `Update task "${editTaskTitle.trim()}"`,
        });
        toast.info("⚡ Connection lost. Task updated locally and queued for sync.");
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        toast.error("⚠️ Conflict detected: Another teammate modified this task.", {
          description: "Reloading latest changes to avoid overwriting work...",
          duration: 6000,
        });
        if (err.data?.latestTask) {
          const raw = err.data.latestTask;
          const latest: TaskItem = {
            id: Number(raw.id),
            projectId: Number(raw.projectId || projectId),
            title: raw.title,
            description: raw.description,
            status: raw.status,
            assigneeId: raw.assigneeId,
            assigneeName: raw.assigneeName,
            deadline: raw.deadline,
            version: raw.version,
            updatedAt: raw.updatedAt,
          };
          setSelectedTask(latest);
          setEditTaskTitle(latest.title);
          setEditTaskDesc(latest.description || "");
          setTasks((cur) => cur.map((t) => (t.id === latest.id ? latest : t)));
        } else {
          void loadProjectData();
        }
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to update task.");
      }
    } finally {
      setIsSavingTaskContent(false);
    }
  };

  // Interactive Markdown Checklist toggling
  const handleChecklistToggle = async (newDescription: string) => {
    if (!selectedTask) return;
    const updated: TaskItem = {
      ...selectedTask,
      description: newDescription,
    };
    setSelectedTask(updated);
    setTasks((cur) => cur.map((t) => (t.id === selectedTask.id ? updated : t)));
    setEditTaskDesc(newDescription);

    if (!navigator.onLine) {
      queueAction({
        method: "PUT",
        url: `/tasks/${selectedTask.id}`,
        body: {
          title: selectedTask.title,
          description: newDescription,
          baseVersion: selectedTask.version,
        },
        description: `Toggle checklist in "${selectedTask.title}"`,
      });
      toast.info("⚡ Offline: Checklist updated locally.", { duration: 2000 });
      return;
    }

    try {
      const res = await apiRequest<TaskItem>(`/tasks/${selectedTask.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: selectedTask.title,
          description: newDescription,
          baseVersion: selectedTask.version,
        }),
      });
      setSelectedTask(res);
      setTasks((cur) => cur.map((t) => (t.id === selectedTask.id ? res : t)));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.warning("⚠️ Conflict detected. Reloading latest task state...");
        void loadProjectData();
      } else if (!navigator.onLine || (err instanceof TypeError && err.message.toLowerCase().includes("fetch"))) {
        queueAction({
          method: "PUT",
          url: `/tasks/${selectedTask.id}`,
          body: {
            title: selectedTask.title,
            description: newDescription,
            baseVersion: selectedTask.version,
          },
          description: `Toggle checklist in "${selectedTask.title}"`,
        });
        toast.info("⚡ Offline: Checklist saved locally.");
      }
    }
  };

  // Upload attachment
  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;
    setIsUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const added = await apiRequest<AttachmentItem>(`/tasks/${selectedTask.id}/attachments`, {
        method: "POST",
        body: formData,
      });
      setTaskAttachments((current) => [...current, added]);
      toast.success("Attachment uploaded successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload file.");
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = "";
    }
  };

  // Delete attachment
  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      await apiRequest(`/attachments/${attachmentId}`, { method: "DELETE" });
      setTaskAttachments((current) => current.filter((a) => a.id !== attachmentId));
      toast.success("Attachment removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete attachment.");
    }
  };

  // Assign task
  const handleAssignTask = async (taskId: number, newAssigneeId: number | null) => {
    try {
      await apiRequest<TaskItem>(`/tasks/${taskId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assigneeId: newAssigneeId }),
      });
      const member = members.find((m) => (m.userId || m.memberId) === newAssigneeId);
      const assigneeName = member ? member.username : undefined;
      setTasks((cur) =>
        cur.map((t) =>
          t.id === taskId
            ? { ...t, assigneeId: newAssigneeId ?? undefined, assigneeName }
            : t
        )
      );
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) =>
          prev ? { ...prev, assigneeId: newAssigneeId ?? undefined, assigneeName } : null
        );
      }
      toast.success("Task assignee updated.");
      void refreshDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign task.");
    }
  };

  // Deadline update
  const handleUpdateDeadline = async (taskId: number, newDeadline: string) => {
    try {
      const formatted = newDeadline ? `${newDeadline}:00` : null;
      await apiRequest<TaskItem>(`/tasks/${taskId}/deadline`, {
        method: "PATCH",
        body: JSON.stringify({ deadline: formatted }),
      });
      setTasks((cur) =>
        cur.map((t) => (t.id === taskId ? { ...t, deadline: formatted || undefined } : t))
      );
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) =>
          prev ? { ...prev, deadline: formatted || undefined } : null
        );
      }
      toast.success("Deadline updated.");
      void refreshDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update deadline.");
    }
  };

  // Submit comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newCommentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const added = await apiRequest<CommentItem>(`/tasks/${selectedTask.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: newCommentText.trim() }),
      });
      setTaskComments((current) => [...current, added]);
      setNewCommentText("");
      toast.success("Comment added.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.assigneeName && t.assigneeName.toLowerCase().includes(q))
    );
  }, [tasks, searchQuery]);

  // Comprehensive Metrics Calculation - computed directly from live tasks for instantaneous UI updates
  const totalTasksCount = tasks.length > 0 ? tasks.length : (dashboard?.totalTasks ?? 0);

  const todoCount = tasks.filter((t) => t.status === "TODO").length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const reviewCount = tasks.filter((t) => t.status === "REVIEW").length;
  const doneCount = tasks.filter((t) => t.status === "DONE").length;

  const completionPercentage =
    totalTasksCount > 0
      ? Math.round((doneCount / totalTasksCount) * 1000) / 10
      : (dashboard?.completionPercentage ?? 0);

  const overdueTasksCount = tasks.filter((t) => isOverdue(t.deadline, t.status)).length;

  // Calculate tasks due today and this week
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const next7Days = new Date(todayDate);
  next7Days.setDate(todayDate.getDate() + 7);

  const calculatedDueToday = tasks.filter((t) => {
    if (!t.deadline || t.status === "DONE") return false;
    const d = new Date(t.deadline);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === todayDate.getTime();
  }).length;

  const calculatedDueThisWeek = tasks.filter((t) => {
    if (!t.deadline || t.status === "DONE") return false;
    const d = new Date(t.deadline);
    return d >= todayDate && d <= next7Days;
  }).length;

  const tasksDueTodayCount = dashboard?.tasksDueToday ?? calculatedDueToday;
  const tasksDueThisWeekCount = dashboard?.tasksDueThisWeek ?? calculatedDueThisWeek;

  // Per-member workload data computed reactively from live tasks and members
  const workloadList: MemberWorkload[] = useMemo(() => {
    const memberMap = new Map<
      number,
      { done: number; inProgress: number; review: number; todo: number }
    >();

    for (const m of members) {
      memberMap.set(m.userId, { done: 0, inProgress: 0, review: 0, todo: 0 });
    }

    let unassignedDone = 0;
    let unassignedInProgress = 0;
    let unassignedReview = 0;
    let unassignedTodo = 0;

    for (const t of tasks) {
      if (t.assigneeId && memberMap.has(t.assigneeId)) {
        const current = memberMap.get(t.assigneeId)!;
        if (t.status === "DONE") current.done++;
        else if (t.status === "IN_PROGRESS") current.inProgress++;
        else if (t.status === "REVIEW") current.review++;
        else current.todo++;
      } else {
        if (t.status === "DONE") unassignedDone++;
        else if (t.status === "IN_PROGRESS") unassignedInProgress++;
        else if (t.status === "REVIEW") unassignedReview++;
        else unassignedTodo++;
      }
    }

    const list: MemberWorkload[] = [];

    for (const m of members) {
      const stats = memberMap.get(m.userId)!;
      const total = stats.done + stats.inProgress + stats.review + stats.todo;
      // In-progress tasks count towards active progress (50%), review counts (75%), done (100%)
      const effectiveProgress = stats.done + stats.inProgress * 0.5 + stats.review * 0.75;
      const pct = total > 0 ? Math.min(100, Math.round((effectiveProgress / total) * 100)) : 0;

      list.push({
        userId: m.userId,
        username: m.username,
        totalTasks: total,
        completedTasks: stats.done,
        inProgressTasks: stats.inProgress,
        reviewTasks: stats.review,
        todoTasks: stats.todo,
        pendingTasks: stats.inProgress + stats.review + stats.todo,
        progressPercentage: pct,
      });
    }

    const unassignedTotal = unassignedDone + unassignedInProgress + unassignedReview + unassignedTodo;
    if (unassignedTotal > 0) {
      const effectiveProgress = unassignedDone + unassignedInProgress * 0.5 + unassignedReview * 0.75;
      const pct = Math.min(100, Math.round((effectiveProgress / unassignedTotal) * 100));
      list.push({
        userId: null,
        username: "Unassigned",
        totalTasks: unassignedTotal,
        completedTasks: unassignedDone,
        inProgressTasks: unassignedInProgress,
        reviewTasks: unassignedReview,
        todoTasks: unassignedTodo,
        pendingTasks: unassignedInProgress + unassignedReview + unassignedTodo,
        progressPercentage: pct,
      });
    }

    return list;
  }, [members, tasks]);

  // Max count for chart scaling
  const maxStatusCount = Math.max(todoCount, inProgressCount, reviewCount, doneCount, 1);

  return (
    <AppShell>
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link
            to="/projects"
            className="inline-flex items-center gap-1 text-brand-600 transition hover:text-brand-800"
          >
            <ArrowLeft className="size-3.5" /> All Projects
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-bold">{project?.name || "Workspace"}</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
              {project?.name || "Project Workspace"}
            </h1>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
              {project?.description || "Collaborative Kanban board, task status, and real-time deliverables."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Team Members stack */}
            <div className="flex items-center -space-x-2 mr-2">
              {members.slice(0, 4).map((m, idx) => (
                <span
                  key={idx}
                  title={`${m.username} (${m.role})`}
                  className="grid size-8 place-items-center rounded-full border-2 border-white bg-brand-100 text-xs font-bold text-brand-800 shadow-xs"
                >
                  {getInitials(m.username)}
                </span>
              ))}
              {members.length > 4 && (
                <span className="grid size-8 place-items-center rounded-full border-2 border-white bg-slate-100 text-[11px] font-bold text-slate-600">
                  +{members.length - 4}
                </span>
              )}
            </div>

            {/* Live WebSocket Status indicator */}
            <div
              title={
                wsStatus === "connected"
                  ? "Connected to Java WebSocket (/ws) - real-time sync active"
                  : wsStatus === "reconnecting"
                  ? "Reconnecting to Java WebSocket..."
                  : "Java WebSocket offline"
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs"
            >
              <span
                className={`size-2 rounded-full ${
                  wsStatus === "connected"
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                    : wsStatus === "reconnecting"
                    ? "bg-amber-500 animate-ping"
                    : "bg-slate-300"
                }`}
              />
              <span className="text-[11px] font-bold text-slate-700">
                {wsStatus === "connected" ? "Live WS Sync" : wsStatus === "reconnecting" ? "Reconnecting..." : "Offline"}
              </span>
            </div>

            <button
              onClick={handleCopyInviteLink}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
              title="Copy shareable invite link with auto-join preview"
            >
              <Link2 className="size-3.5 text-slate-500" />
              <span>Invite Link</span>
            </button>

            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
            >
              <UserPlus className="size-3.5" />
              <span>Add Member</span>
            </button>

            <button
              onClick={() => {
                setCreateTaskStatus("TODO");
                setIsCreateTaskOpen(true);
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-xs font-semibold text-white shadow-brand transition hover:bg-brand-700 focus:outline-none"
            >
              <Plus className="size-4" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 border-b border-transparent">
            <button
              onClick={() => setActiveTab("board")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                activeTab === "board"
                  ? "bg-brand-50 text-brand-700 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
              }`}
            >
              <Kanban className="size-4" />
              <span>Kanban Board</span>
              <span className="rounded-full bg-brand-200/60 px-1.5 py-0.2 text-[11px] font-bold text-brand-900">
                {tasks.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("dashboard");
                void refreshDashboard();
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                activeTab === "dashboard"
                  ? "bg-brand-50 text-brand-700 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
              }`}
            >
              <LayoutDashboard className="size-4" />
              <span>Dashboard &amp; Progress</span>
            </button>

            <button
              onClick={() => setActiveTab("members")}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                activeTab === "members"
                  ? "bg-brand-50 text-brand-700 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
              }`}
            >
              <Users className="size-4" />
              <span>Team Members ({members.length})</span>
            </button>
          </div>

          {activeTab === "board" ? (
            <div className="relative w-48 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search board tasks..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-xs outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          ) : (
            <button
              onClick={() => void refreshDashboard()}
              disabled={isRefreshingDashboard}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
              title="Refresh project metrics"
            >
              <RefreshCw className={`size-3.5 ${isRefreshingDashboard ? "animate-spin" : ""}`} />
              <span>Sync Metrics</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid min-h-[360px] place-items-center">
          <LoaderCircle className="size-8 animate-spin text-brand-600" />
        </div>
      ) : error ? (
        <div className="mt-8 flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-rose-50/30 p-8 text-center">
          <AlertCircle className="size-8 text-rose-600" />
          <p className="mt-3 text-base font-bold text-slate-900">{error}</p>
          <button
            onClick={() => void loadProjectData()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs border border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className="size-4" /> Try again
          </button>
        </div>
      ) : activeTab === "board" ? (
        /* KANBAN BOARD WITH DRAG & DROP */
        <div className="mt-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => {
              const columnTasks = filteredTasks.filter((t) => t.status === col.status);
              const isOver = dragOverCol === col.status;

              return (
                <div
                  key={col.status}
                  onDragOver={(e) => handleDragOver(e, col.status)}
                  onDragLeave={(e) => handleDragLeave(e, col.status)}
                  onDrop={(e) => handleDrop(e, col.status)}
                  className={`flex flex-col rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 transition-all duration-200 ${
                    isOver ? col.dropBorder : ""
                  }`}
                  style={{ minHeight: "480px" }}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 px-1 border-b border-slate-200/70">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${col.headerBorder.replace("border-", "bg-")}`} />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        {col.label}
                      </h2>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-xs">
                        {columnTasks.length}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setCreateTaskStatus(col.status);
                        setIsCreateTaskOpen(true);
                      }}
                      className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-800 transition"
                      title={`Add task to ${col.label}`}
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>

                  {/* Tasks List */}
                  <div className="mt-3 flex-1 space-y-3">
                    {columnTasks.length === 0 ? (
                      <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200/90 p-4 text-center">
                        <p className="text-xs font-medium text-slate-400">Drag cards here</p>
                        <button
                          onClick={() => {
                            setCreateTaskStatus(col.status);
                            setIsCreateTaskOpen(true);
                          }}
                          className="mt-2 text-[11px] font-semibold text-brand-600 hover:underline"
                        >
                          + Add a task
                        </button>
                      </div>
                    ) : (
                      columnTasks.map((task) => {
                        const overdue = isOverdue(task.deadline, task.status);
                        const deadlineText = formatDeadline(task.deadline);
                        const isDragging = draggingTaskId === task.id;

                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => openTaskDetail(task)}
                            className={`group relative cursor-grab rounded-xl border bg-white p-3.5 shadow-xs transition-all duration-150 hover:border-brand-300 hover:shadow-md active:cursor-grabbing ${
                              isDragging
                                ? "opacity-50 ring-2 ring-brand-400 border-brand-300 shadow-md scale-95"
                                : "border-slate-200/90 opacity-100"
                            }`}
                          >
                            {/* Drag Grip Indicator & Actions */}
                            <div className="flex items-start justify-between gap-2">
                              <span className="cursor-grab text-slate-300 group-hover:text-slate-400">
                                <GripVertical className="size-3.5" />
                              </span>
                              <div
                                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <select
                                  aria-label="Move task"
                                  value={task.status}
                                  onChange={(e) =>
                                    handleQuickStatusChange(task.id, e.target.value as TaskStatus)
                                  }
                                  className="h-6 rounded-md border border-slate-200 bg-white px-1 text-[10px] text-slate-600 outline-none"
                                >
                                  {COLUMNS.map((c) => (
                                    <option key={c.status} value={c.status}>
                                      {c.label}
                                    </option>
                                  ))}
                                </select>
                                {canDeleteTask && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTask(task.id);
                                    }}
                                    className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                    title="Delete task"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <h3 className="mt-1 text-sm font-bold text-slate-900 group-hover:text-brand-700 transition">
                              {task.title}
                            </h3>

                            {task.description && (
                              <p className="mt-1 line-clamp-2 text-xs text-slate-500 leading-relaxed">
                                {task.description}
                              </p>
                            )}

                            {/* Card Footer */}
                            <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                              <div className="flex items-center gap-2">
                                {deadlineText && (
                                  <span
                                    className={`inline-flex items-center gap-1 font-medium ${
                                      overdue ? "text-rose-600 font-bold" : "text-slate-500"
                                    }`}
                                    title={overdue ? "Overdue deadline" : "Due date"}
                                  >
                                    <Clock className="size-3" />
                                    <span>{deadlineText}</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-flex items-center gap-1 text-slate-400 group-hover:text-slate-600"
                                  title="Comments"
                                >
                                  <MessageSquare className="size-3" />
                                </span>

                                <div
                                  className="flex items-center gap-1.5"
                                  title={task.assigneeName ? `Assigned to ${task.assigneeName}` : "Unassigned"}
                                >
                                  <span
                                    className={`grid size-6 place-items-center rounded-full text-[10px] font-bold shrink-0 ${
                                      task.assigneeName
                                        ? "bg-brand-100 text-brand-700"
                                        : "bg-slate-100 text-slate-400"
                                    }`}
                                  >
                                    {getInitials(task.assigneeName)}
                                  </span>
                                  <span className="text-[11px] font-semibold text-slate-600 truncate max-w-[100px]">
                                    {task.assigneeName || "Unassigned"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : activeTab === "dashboard" ? (
        /* FULL PROJECT DASHBOARD & PROGRESS (User's Exact Specification) */
        <div className="mt-6 space-y-6">
          {/* Top 6 KPI Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {/* Total Tasks */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Tasks
                </span>
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-700">
                  <ListTodo className="size-4" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-slate-950">{totalTasksCount}</p>
              <p className="mt-1 text-xs text-slate-500">Across all 4 sprint stages</p>
            </div>

            {/* Completion Percentage */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Completion
                </span>
                <span className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="size-4" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-emerald-600">
                {completionPercentage}%
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {doneCount} of {totalTasksCount} completed
              </p>
            </div>

            {/* In Progress */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  In Progress
                </span>
                <span className="grid size-8 place-items-center rounded-xl bg-amber-50 text-amber-700">
                  <Clock className="size-4" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-amber-600">{inProgressCount}</p>
              <p className="mt-1 text-xs text-slate-500">Actively in development</p>
            </div>

            {/* Overdue Tasks */}
            <div className={`rounded-2xl border p-5 shadow-xs transition hover:shadow-sm ${
              overdueTasksCount > 0
                ? "border-rose-200 bg-rose-50/40"
                : "border-slate-200/90 bg-white"
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  overdueTasksCount > 0 ? "text-rose-700" : "text-slate-500"
                }`}>
                  Overdue
                </span>
                <span className={`grid size-8 place-items-center rounded-xl ${
                  overdueTasksCount > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"
                }`}>
                  <AlertTriangle className="size-4" />
                </span>
              </div>
              <p className={`mt-3 text-3xl font-extrabold ${
                overdueTasksCount > 0 ? "text-rose-600" : "text-slate-900"
              }`}>
                {overdueTasksCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">Past target deadline</p>
            </div>

            {/* Tasks Due Today */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  Due Today
                </span>
                <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-blue-700">
                  <Calendar className="size-4" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-blue-600">{tasksDueTodayCount}</p>
              <p className="mt-1 text-xs text-slate-500">Needs closure today</p>
            </div>

            {/* Tasks Due This Week */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                  Due This Week
                </span>
                <span className="grid size-8 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                  <TrendingUp className="size-4" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-indigo-600">{tasksDueThisWeekCount}</p>
              <p className="mt-1 text-xs text-slate-500">Next 7 days roadmap</p>
            </div>
          </div>

          {/* PROGRESS BAR PLUS STATUS CHART (Requested by User) */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left side: Progress Bar & Detailed Multi-Segment Progress Breakdown (7 cols) */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs lg:col-span-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Sprint Delivery Progress</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Proportional completion and active stage pipeline
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-brand-600">{completionPercentage}%</span>
                  <span className="block text-[11px] font-semibold text-slate-400">Delivery Velocity</span>
                </div>
              </div>

              {/* Multi-Segmented Continuous Progress Bar */}
              <div className="mt-6">
                <div className="flex h-5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 shadow-inner">
                  {totalTasksCount > 0 ? (
                    <>
                      {doneCount > 0 && (
                        <div
                          title={`Completed: ${doneCount} tasks (${Math.round((doneCount / totalTasksCount) * 100)}%)`}
                          style={{ width: `${(doneCount / totalTasksCount) * 100}%` }}
                          className="h-full bg-emerald-500 transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                        />
                      )}
                      {reviewCount > 0 && (
                        <div
                          title={`In Review: ${reviewCount} tasks (${Math.round((reviewCount / totalTasksCount) * 100)}%)`}
                          style={{ width: `${(reviewCount / totalTasksCount) * 100}%` }}
                          className="h-full bg-indigo-500 transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                        />
                      )}
                      {inProgressCount > 0 && (
                        <div
                          title={`In Progress: ${inProgressCount} tasks (${Math.round((inProgressCount / totalTasksCount) * 100)}%)`}
                          style={{ width: `${(inProgressCount / totalTasksCount) * 100}%` }}
                          className="h-full bg-amber-500 transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                        />
                      )}
                      {todoCount > 0 && (
                        <div
                          title={`To Do: ${todoCount} tasks (${Math.round((todoCount / totalTasksCount) * 100)}%)`}
                          style={{ width: `${(todoCount / totalTasksCount) * 100}%` }}
                          className="h-full bg-slate-300 transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                        />
                      )}
                    </>
                  ) : (
                    <div className="h-full w-full rounded-full bg-slate-200" />
                  )}
                </div>

                {/* Legend with exact count and percentage */}
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-slate-400" />
                      <span className="text-[11px] font-bold text-slate-600">To Do</span>
                    </div>
                    <p className="mt-1 text-lg font-extrabold text-slate-800">{todoCount}</p>
                    <p className="text-[10px] text-slate-400">
                      {totalTasksCount ? Math.round((todoCount / totalTasksCount) * 100) : 0}% of total
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-amber-500" />
                      <span className="text-[11px] font-bold text-amber-700">In Progress</span>
                    </div>
                    <p className="mt-1 text-lg font-extrabold text-amber-800">{inProgressCount}</p>
                    <p className="text-[10px] text-amber-600">
                      {totalTasksCount ? Math.round((inProgressCount / totalTasksCount) * 100) : 0}% of total
                    </p>
                  </div>

                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-indigo-500" />
                      <span className="text-[11px] font-bold text-indigo-700">In Review</span>
                    </div>
                    <p className="mt-1 text-lg font-extrabold text-indigo-800">{reviewCount}</p>
                    <p className="text-[10px] text-indigo-600">
                      {totalTasksCount ? Math.round((reviewCount / totalTasksCount) * 100) : 0}% of total
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-[11px] font-bold text-emerald-700">Completed</span>
                    </div>
                    <p className="mt-1 text-lg font-extrabold text-emerald-800">{doneCount}</p>
                    <p className="text-[10px] text-emerald-600">
                      {totalTasksCount ? Math.round((doneCount / totalTasksCount) * 100) : 0}% of total
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Tasks By Status Visual Bar Chart (5 cols) */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs lg:col-span-5 flex flex-col justify-between">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900">Tasks by Status Chart</h3>
                <p className="text-xs text-slate-500 mt-0.5">Comparative volume across workflow stages</p>
              </div>

              {/* Vertical Visual Bar Chart */}
              <div className="mt-6 flex h-48 items-end gap-5 border-b border-slate-100 pb-3 px-2">
                {[
                  {
                    status: "TODO",
                    label: "To Do",
                    count: todoCount,
                    color: "bg-slate-400",
                    hoverColor: "hover:bg-slate-500",
                  },
                  {
                    status: "IN_PROGRESS",
                    label: "In Progress",
                    count: inProgressCount,
                    color: "bg-amber-500",
                    hoverColor: "hover:bg-amber-600",
                  },
                  {
                    status: "REVIEW",
                    label: "In Review",
                    count: reviewCount,
                    color: "bg-indigo-500",
                    hoverColor: "hover:bg-indigo-600",
                  },
                  {
                    status: "DONE",
                    label: "Done",
                    count: doneCount,
                    color: "bg-emerald-500",
                    hoverColor: "hover:bg-emerald-600",
                  },
                ].map((item) => {
                  const heightPercent = maxStatusCount > 0 ? Math.max((item.count / maxStatusCount) * 100, 8) : 8;

                  return (
                    <div
                      key={item.status}
                      className="flex-1 flex flex-col items-center gap-2 h-full justify-end cursor-pointer group"
                      onClick={() => setActiveTab("board")}
                      title={`${item.label}: ${item.count} tasks`}
                    >
                      <span className="text-xs font-bold text-slate-700 group-hover:text-brand-600 transition">
                        {item.count}
                      </span>
                      <div className="w-full bg-slate-50 rounded-t-lg h-36 flex items-end">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-lg ${item.color} ${item.hoverColor} transition-all duration-500 shadow-sm`}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 text-center truncate max-w-full">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>Click any status bar to view on board</span>
                <button
                  onClick={() => setActiveTab("board")}
                  className="font-semibold text-brand-600 hover:underline"
                >
                  Go to Kanban →
                </button>
              </div>
            </div>
          </div>

          {/* PER-MEMBER WORKLOAD (Exact requirement from user) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="size-5 text-brand-600" />
                  Per-Member Workload Distribution
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Task allocation, completed deliverables, and pending workload per team member.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {workloadList.length} Active {workloadList.length === 1 ? "Member" : "Members"}
              </span>
            </div>

            {workloadList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No members or tasks assigned yet.
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {workloadList.map((m, idx) => {
                  const memberPct =
                    m.progressPercentage ??
                    (m.totalTasks > 0 ? Math.round((m.completedTasks / m.totalTasks) * 100) : 0);
                  const isUnassigned = m.username === "Unassigned";

                  return (
                    <div
                      key={idx}
                      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between transition hover:bg-slate-50/50 rounded-xl px-2"
                    >
                      {/* Member Info */}
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid size-10 place-items-center rounded-full text-xs font-bold shadow-xs ${
                            isUnassigned
                              ? "bg-slate-100 text-slate-500"
                              : "bg-brand-100 text-brand-800"
                          }`}
                        >
                          {getInitials(m.username)}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <span>{m.username}</span>
                            {isUnassigned && (
                              <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                Needs Assignee
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400">
                            {m.totalTasks} total {m.totalTasks === 1 ? "task" : "tasks"} assigned
                          </p>
                        </div>
                      </div>

                      {/* Workload Metric Pills & Individual Progress Bar */}
                      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                        {/* Completed, In Progress, & Pending Pills */}
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 border border-emerald-100">
                            <CheckCircle2 className="size-3.5" />
                            <span>{m.completedTasks} Done</span>
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold border transition ${
                              (m.inProgressTasks ?? 0) > 0
                                ? "bg-blue-50 text-blue-700 border-blue-200 shadow-xs"
                                : "bg-slate-50 text-slate-500 border-slate-100"
                            }`}
                          >
                            <PlayCircle className="size-3.5" />
                            <span>{m.inProgressTasks ?? 0} In Progress</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 font-bold text-amber-700 border border-amber-100">
                            <Clock className="size-3.5" />
                            <span>{m.todoTasks ?? m.pendingTasks} Pending</span>
                          </span>
                        </div>

                        {/* Individual Progress Bar */}
                        <div className="w-32 hidden md:block">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                            <span>Progress</span>
                            <span>{memberPct}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand-600 transition-all duration-300"
                              style={{ width: `${memberPct}%` }}
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSearchQuery(m.username === "Unassigned" ? "" : m.username);
                            setActiveTab("board");
                          }}
                          className="text-xs font-semibold text-brand-600 hover:text-brand-800 transition"
                        >
                          View Board →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MEMBERS TAB */
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Workspace Members</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Teammates collaborating on this project.
              </p>
            </div>
            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 text-xs font-semibold text-white shadow-brand hover:bg-brand-700"
            >
              <UserPlus className="size-3.5" />
              <span>Invite Teammate</span>
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {members.map((member) => (
              <div
                key={member.memberId || member.userId}
                className="flex items-center justify-between py-4"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
                    {getInitials(member.username)}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{member.username}</p>
                    <p className="text-xs text-slate-500">{member.email}</p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {member.role || "MEMBER"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE TASK DIALOG */}
      <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
        <DialogContent className="max-w-[500px] rounded-2xl bg-white p-0 shadow-2xl">
          <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left">
            <DialogTitle className="text-lg font-bold text-slate-950">Create New Task</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Add a deliverable to your Kanban board.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-4 px-6 py-5">
            <div>
              <label htmlFor="task-title" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Task Title *
              </label>
              <input
                id="task-title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="e.g. Design user profile dashboard"
                required
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label htmlFor="task-desc" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Description
              </label>
              <textarea
                id="task-desc"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Brief outline of the task objectives..."
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none resize-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="task-col" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Status
                </label>
                <select
                  id="task-col"
                  value={createTaskStatus}
                  onChange={(e) => setCreateTaskStatus(e.target.value as TaskStatus)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-brand-500"
                >
                  {COLUMNS.map((c) => (
                    <option key={c.status} value={c.status}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="task-assignee" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Assignee
                </label>
                <select
                  id="task-assignee"
                  value={newTaskAssigneeId}
                  onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-brand-500"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="task-deadline" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Deadline
              </label>
              <input
                id="task-deadline"
                type="datetime-local"
                value={newTaskDeadline}
                onChange={(e) => setNewTaskDeadline(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateTaskOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingTask}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-brand hover:bg-brand-700 disabled:opacity-60"
              >
                {isSubmittingTask && <LoaderCircle className="size-3.5 animate-spin" />}
                <span>Create Task</span>
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADD MEMBER DIALOG */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="max-w-[460px] rounded-2xl bg-white p-0 shadow-2xl">
          <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left">
            <DialogTitle className="text-lg font-bold text-slate-950">Add Project Member</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Invite a registered teammate to this project workspace.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddMember} className="space-y-4 px-6 py-5">
            <div>
              <label htmlFor="member-id" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Username or Email *
              </label>
              <input
                id="member-id"
                value={newMemberIdentifier}
                onChange={(e) => setNewMemberIdentifier(e.target.value)}
                placeholder="e.g. aaravs or aarav@company.com"
                required
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label htmlFor="member-role" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Project Role
              </label>
              <select
                id="member-role"
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-brand-500"
              >
                <option value="MEMBER">Member (Can edit tasks)</option>
                <option value="ADMIN">Admin (Manage members &amp; settings)</option>
                <option value="VIEWER">Viewer (Read-only)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingMember}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-brand hover:bg-brand-700 disabled:opacity-60"
              >
                {isSubmittingMember && <LoaderCircle className="size-3.5 animate-spin" />}
                <span>Add Member</span>
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* TASK DETAIL & COMMENTS DIALOG */}
      <Dialog open={Boolean(selectedTask)} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-[560px] rounded-2xl bg-white p-0 shadow-2xl">
          {selectedTask && (
            <div>
              <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700 uppercase tracking-wider">
                      {COLUMNS.find((c) => c.status === selectedTask.status)?.label ?? selectedTask.status}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                      <span className="grid size-4 place-items-center rounded-full bg-brand-200 text-[8px] font-bold text-brand-800">
                        {getInitials(selectedTask.assigneeName)}
                      </span>
                      <span>Assignee: <strong className="text-slate-900">{selectedTask.assigneeName || "Unassigned"}</strong></span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingTaskContent((prev) => !prev)}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-800"
                    >
                      {isEditingTaskContent ? "Cancel Edit" : "Edit Details"}
                    </button>
                    {canDeleteTask && (
                      <>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => handleDeleteTask(selectedTask.id)}
                          className="text-xs text-rose-600 hover:underline"
                        >
                          Delete Task
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditingTaskContent ? (
                  <form onSubmit={handleSaveTaskContent} className="mt-3 space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Title *
                      </label>
                      <input
                        value={editTaskTitle}
                        onChange={(e) => setEditTaskTitle(e.target.value)}
                        required
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Description (Markdown & Interactive Checklists)
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditTaskDesc((prev) => `${prev ? prev + "\n" : ""}- [ ] `)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-800"
                        >
                          <CheckSquare className="size-3" />
                          <span>+ Add Checklist</span>
                        </button>
                      </div>
                      <textarea
                        value={editTaskDesc}
                        onChange={(e) => setEditTaskDesc(e.target.value)}
                        rows={4}
                        placeholder="Write markdown with headings, bullet points, and - [ ] checkboxes..."
                        className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 font-mono text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingTaskContent(false)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingTaskContent}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-brand hover:bg-brand-700 disabled:opacity-50"
                      >
                        {isSavingTaskContent && <LoaderCircle className="size-3 animate-spin" />}
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <DialogTitle className="mt-2 text-xl font-bold text-slate-950">
                      {selectedTask.title}
                    </DialogTitle>
                    <div className="mt-3">
                      <RichTaskDescription
                        content={selectedTask.description || ""}
                        onCheckboxToggle={handleChecklistToggle}
                      />
                    </div>
                  </>
                )}
              </DialogHeader>

              {/* Task Meta details with quick editors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-100 bg-slate-50/60 px-6 py-3.5 text-xs text-slate-600">
                {/* Status Switcher */}
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </span>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as TaskStatus;
                      void handleQuickStatusChange(selectedTask.id, newStatus);
                      setSelectedTask((prev) => (prev ? { ...prev, status: newStatus } : null));
                    }}
                    className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-brand-500"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">In Review</option>
                    <option value="DONE">Completed</option>
                  </select>
                </div>

                {/* Assignee Selector */}
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Assignee
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1">
                    <span
                      className={`grid size-5 place-items-center rounded-full text-[9px] font-bold shrink-0 ${
                        selectedTask.assigneeName
                          ? "bg-brand-100 text-brand-700"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {getInitials(selectedTask.assigneeName)}
                    </span>
                    <select
                      value={
                        selectedTask.assigneeId
                          ? String(selectedTask.assigneeId)
                          : (members.find((m) => m.username === selectedTask.assigneeName)?.userId ? String(members.find((m) => m.username === selectedTask.assigneeName)!.userId) : "")
                      }
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        void handleAssignTask(selectedTask.id, val);
                      }}
                      className="h-6 w-full rounded bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.memberId || m.userId} value={m.userId || m.memberId}>
                          {m.username} ({m.role || "Member"})
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedTask.assigneeName && (
                    <p className="mt-1 text-[11px] font-medium text-brand-700">
                      Assigned to: <span className="font-bold">{selectedTask.assigneeName}</span>
                    </p>
                  )}
                </div>

                {/* Deadline Selector */}
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Deadline
                  </span>
                  <input
                    type="date"
                    value={selectedTask.deadline ? selectedTask.deadline.split("T")[0] : ""}
                    onChange={(e) => void handleUpdateDeadline(selectedTask.id, e.target.value)}
                    className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Attachments Section */}
              <div className="border-b border-slate-100 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Paperclip className="size-3.5" /> Attachments ({taskAttachments.length})
                  </h4>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs">
                    {isUploadingAttachment ? (
                      <LoaderCircle className="size-3.5 animate-spin text-brand-600" />
                    ) : (
                      <Upload className="size-3.5 text-slate-500" />
                    )}
                    <span>{isUploadingAttachment ? "Uploading..." : "Upload File"}</span>
                    <input
                      type="file"
                      onChange={handleUploadAttachment}
                      disabled={isUploadingAttachment}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="mt-3 space-y-2 max-h-36 overflow-y-auto pr-1">
                  {isLoadingAttachments ? (
                    <div className="py-3 text-center text-xs text-slate-400">Loading attachments...</div>
                  ) : taskAttachments.length === 0 ? (
                    <div className="py-3 text-center text-xs text-slate-400">No attachments uploaded yet.</div>
                  ) : (
                    taskAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-xs transition hover:bg-white hover:border-brand-200"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="size-4 text-brand-600 shrink-0" />
                          <div className="truncate">
                            <p className="truncate font-semibold text-slate-800">{att.fileName}</p>
                            <p className="text-[10px] text-slate-400">
                              {att.fileSize ? `${Math.round(att.fileSize / 1024)} KB` : "File"} • Uploaded by {att.uploadedByName || "Teammate"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <a
                            href={`/api/attachments/download/${encodeURIComponent(att.fileName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="grid size-7 place-items-center rounded-lg text-slate-500 hover:bg-brand-50 hover:text-brand-700 transition"
                            title="Download file"
                          >
                            <Download className="size-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => void handleDeleteAttachment(att.id)}
                            className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            title="Remove attachment"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Comments Section */}
              <div className="px-6 py-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <MessageSquare className="size-3.5" /> Comments ({taskComments.length})
                </h4>

                <div className="mt-3 max-h-48 overflow-y-auto space-y-3 pr-1">
                  {isLoadingComments ? (
                    <div className="py-6 text-center text-xs text-slate-400">Loading comments...</div>
                  ) : taskComments.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">No comments yet.</div>
                  ) : (
                    taskComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs"
                      >
                        <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
                          <span className="font-bold text-slate-800">
                            {comment.authorName || comment.authorEmail || "Teammate"}
                          </span>
                          <span>{formatDeadline(comment.createdAt) || "Recently"}</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{comment.body}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add comment form */}
                <form onSubmit={handleAddComment} className="mt-3 flex items-center gap-2">
                  <input
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    disabled={isSubmittingComment}
                    className="h-9 flex-1 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !newCommentText.trim()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 disabled:opacity-60"
                  >
                    <Send className="size-3" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* AUTO-JOIN INVITE MODAL */}
      <Dialog open={isAutoJoinOpen} onOpenChange={setIsAutoJoinOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 shadow-inner">
              <Users className="size-7" />
            </div>
            <DialogHeader className="mt-4">
              <DialogTitle className="text-xl font-extrabold text-slate-950">
                You've Been Invited to Join
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-xs text-slate-600">
                Collaborate in real-time on Kanban sprints, deliverables, and team discussions.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 w-full rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-left">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Project
                </span>
                <span className="text-xs font-bold text-slate-900">{project?.name}</span>
              </div>
              {project?.ownerUsername && (
                <div className="flex items-center justify-between border-b border-slate-200/60 py-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Project Lead
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    @{project.ownerUsername}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-b border-slate-200/60 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Team Size
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  {members.length} {members.length === 1 ? "collaborator" : "collaborators"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Joining As
                </span>
                <span className="text-xs font-bold text-brand-700">
                  {user?.username || "You"} (Member)
                </span>
              </div>
            </div>

            <div className="mt-6 flex w-full gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsAutoJoinOpen(false);
                  navigate(`/projects/${projectId}`, { replace: true });
                }}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={handleAcceptInvite}
                disabled={isJoiningProject}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-xs font-semibold text-white shadow-brand hover:bg-brand-700 disabled:opacity-50 transition"
              >
                {isJoiningProject && <LoaderCircle className="size-3.5 animate-spin" />}
                <span>Accept & Join</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Offline Mode Badge */}
      {!isOnline && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full border border-amber-300 bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition-all">
          <span className="flex size-2 rounded-full bg-amber-200 animate-ping" />
          <span>⚡ Offline Mode — Changes saved locally</span>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-700/80 px-2 py-0.5 text-[10px] font-bold text-amber-100">
              {pendingCount} queued
            </span>
          )}
        </div>
      )}

      {/* Reconnected Syncing Banner if online but pending queue syncing */}
      {isOnline && pendingCount > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full border border-emerald-300 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-md">
          <span>Reconnected: {pendingCount} offline {pendingCount === 1 ? "change" : "changes"} queued</span>
          <button
            onClick={() => void syncNow()}
            className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold hover:bg-white/30 transition"
          >
            Sync Now
          </button>
        </div>
      )}
    </AppShell>
  );
}
