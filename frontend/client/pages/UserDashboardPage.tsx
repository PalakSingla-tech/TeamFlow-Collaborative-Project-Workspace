import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FolderKanban,
  Kanban,
  LayoutDashboard,
  ListTodo,
  LoaderCircle,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { CreateProjectDialog, Project } from "@/components/CreateProjectDialog";
import { apiRequest, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";

export interface WorkspaceTask {
  id: number;
  projectId: number;
  projectName?: string;
  title: string;
  description?: string;
  assigneeId?: number;
  assigneeName?: string;
  status: TaskStatus;
  deadline?: string;
  version?: number;
  updatedAt?: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  role?: string;
  ownerId?: number;
  ownerUsername?: string;
  memberCount: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionPercentage: number;
  overdueTasks: number;
  updatedAt?: string;
}

export interface WorkspaceCollaborator {
  userId: number;
  username: string;
  email?: string;
  role?: string;
  projectCount: number;
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; badgeClass: string; bgClass: string; textClass: string }
> = {
  TODO: {
    label: "To Do",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    bgClass: "bg-slate-100",
    textClass: "text-slate-700",
  },
  IN_PROGRESS: {
    label: "In Progress",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    bgClass: "bg-amber-500",
    textClass: "text-amber-700",
  },
  REVIEW: {
    label: "In Review",
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200",
    bgClass: "bg-indigo-500",
    textClass: "text-indigo-700",
  },
  DONE: {
    label: "Completed",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    bgClass: "bg-emerald-500",
    textClass: "text-emerald-700",
  },
};

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

export default function UserDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [allTasks, setAllTasks] = useState<WorkspaceTask[]>([]);
  const [collaborators, setCollaborators] = useState<WorkspaceCollaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  // My Tasks filter tab
  const [myTasksTab, setMyTasksTab] = useState<"all" | "in_progress" | "due_soon" | "overdue" | "done">("all");

  const loadWorkspaceData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    else setIsRefreshing(true);
    setError("");

    try {
      // 1. Fetch user's projects
      const projRes = await apiRequest<any>("/projects");
      const rawList = Array.isArray(projRes)
        ? projRes
        : (projRes?.projects ?? projRes?.content ?? []);

      const currentUserId = user?.id ? Number(user.id) : null;
      const currentUsername = user?.username?.toLowerCase() || "";

      const loadedTasks: WorkspaceTask[] = [];
      const collaboratorMap = new Map<string, WorkspaceCollaborator>();
      const projectSummaries: ProjectSummary[] = [];

      // Concurrently fetch tasks and dashboard for all projects
      await Promise.allSettled(
        rawList.map(async (rawProj: any) => {
          const pId = String(rawProj.projectId ?? rawProj.id ?? "");
          if (!pId) return;

          let projectTasks: WorkspaceTask[] = [];
          let totalTasks = 0;
          let completedTasks = 0;
          let pendingTasks = 0;
          let overdueTasks = 0;
          let completionPercentage = 0;

          // Attempt to load tasks
          try {
            const taskData = await apiRequest<any>(`/projects/${pId}/tasks?size=200`);
            const rawTasks = Array.isArray(taskData)
              ? taskData
              : (taskData?.content ?? []);

            projectTasks = rawTasks.map((t: any) => ({
              id: Number(t.id),
              projectId: Number(pId),
              projectName: rawProj.name ?? "Untitled Project",
              title: t.title,
              description: t.description,
              assigneeId: t.assigneeId ? Number(t.assigneeId) : undefined,
              assigneeName: t.assigneeName,
              status: (t.status as TaskStatus) || "TODO",
              deadline: t.deadline,
              version: t.version,
              updatedAt: t.updatedAt,
            }));

            loadedTasks.push(...projectTasks);
          } catch {
            // Project might have no tasks yet
          }

          // Attempt to load project dashboard if available
          try {
            const dash = await apiRequest<any>(`/projects/${pId}/dashboard`);
            if (dash) {
              totalTasks = dash.totalTasks ?? projectTasks.length;
              completionPercentage = dash.completionPercentage ?? 0;
              overdueTasks = dash.overdueTasks ?? 0;
              const doneFromStatus = dash.tasksByStatus?.DONE ?? 0;
              completedTasks = doneFromStatus;
              pendingTasks = Math.max(0, totalTasks - completedTasks);
            }
          } catch {
            // Calculate directly from task list
            totalTasks = projectTasks.length;
            completedTasks = projectTasks.filter((t) => t.status === "DONE").length;
            pendingTasks = totalTasks - completedTasks;
            overdueTasks = projectTasks.filter((t) => isOverdue(t.deadline, t.status)).length;
            completionPercentage =
              totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0;
          }

          // Record members & collaborators
          if (Array.isArray(rawProj.members)) {
            rawProj.members.forEach((m: any) => {
              const uName = m.username || m.email || "Member";
              if (uName.toLowerCase() !== currentUsername) {
                const existing = collaboratorMap.get(uName) || {
                  userId: Number(m.memberId || m.userId || Math.random()),
                  username: uName,
                  email: m.email,
                  role: m.role || "MEMBER",
                  projectCount: 0,
                };
                existing.projectCount += 1;
                collaboratorMap.set(uName, existing);
              }
            });
          }

          projectSummaries.push({
            id: pId,
            name: rawProj.name ?? "Untitled Project",
            description: rawProj.description,
            role: rawProj.ownerUsername
              ? (rawProj.ownerUsername.toLowerCase() === currentUsername ? "Owner" : `Owner: ${rawProj.ownerUsername}`)
              : (rawProj.role ?? "Member"),
            ownerId: rawProj.ownerId,
            ownerUsername: rawProj.ownerUsername,
            memberCount: Array.isArray(rawProj.members) ? rawProj.members.length : (rawProj.memberCount ?? 1),
            totalTasks,
            completedTasks,
            pendingTasks,
            completionPercentage,
            overdueTasks,
            updatedAt: rawProj.updatedAt,
          });
        })
      );

      setProjects(projectSummaries);
      setAllTasks(loadedTasks);
      setCollaborators(Array.from(collaboratorMap.values()));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to load workspace dashboard.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadWorkspaceData(true);
  }, []);

  // Quick task status change from user dashboard
  const handleQuickStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    const previousTasks = [...allTasks];
    setAllTasks((current) =>
      current.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await apiRequest<any>(`/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      const col = STATUS_CONFIG[newStatus];
      toast.success(`Task moved to ${col.label}`);
      // Refresh background stats without full page spinner
      void loadWorkspaceData(false);
    } catch (err) {
      setAllTasks(previousTasks);
      toast.error(err instanceof Error ? err.message : "Failed to update task status");
    }
  };

  const handleProjectCreated = (newProj: Project) => {
    toast.success("Project created!");
    void loadWorkspaceData(false);
  };

  // User's assigned tasks
  const myAssignedTasks = useMemo(() => {
    const currentUserId = user?.id ? Number(user.id) : null;
    const currentUsername = user?.username?.toLowerCase() || "";
    const currentName = user?.name?.toLowerCase() || "";

    return allTasks.filter((t) => {
      if (currentUserId && t.assigneeId === currentUserId) return true;
      if (t.assigneeName) {
        const aName = t.assigneeName.toLowerCase();
        if (currentUsername && aName.includes(currentUsername)) return true;
        if (currentName && aName.includes(currentName)) return true;
      }
      return false;
    });
  }, [allTasks, user]);

  // Tasks due today & this week
  const todayDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const next7Days = useMemo(() => {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() + 7);
    return d;
  }, [todayDate]);

  const tasksDueThisWeek = useMemo(() => {
    return allTasks.filter((t) => {
      if (!t.deadline || t.status === "DONE") return false;
      const d = new Date(t.deadline);
      return d >= todayDate && d <= next7Days;
    });
  }, [allTasks, todayDate, next7Days]);

  const allOverdueTasks = useMemo(() => {
    return allTasks.filter((t) => isOverdue(t.deadline, t.status));
  }, [allTasks]);

  // Aggregated KPIs
  const totalWorkspaceTasks = allTasks.length;
  const totalCompletedTasks = allTasks.filter((t) => t.status === "DONE").length;
  const totalInProgressTasks = allTasks.filter((t) => t.status === "IN_PROGRESS").length;
  const totalReviewTasks = allTasks.filter((t) => t.status === "REVIEW").length;
  const totalTodoTasks = allTasks.filter((t) => t.status === "TODO").length;

  const workspaceCompletionRate =
    totalWorkspaceTasks > 0
      ? Math.round((totalCompletedTasks / totalWorkspaceTasks) * 1000) / 10
      : 0;

  const myCompletedCount = myAssignedTasks.filter((t) => t.status === "DONE").length;
  const myPendingCount = myAssignedTasks.length - myCompletedCount;

  // Filtered My Tasks view
  const filteredMyTasks = useMemo(() => {
    switch (myTasksTab) {
      case "in_progress":
        return myAssignedTasks.filter((t) => t.status === "IN_PROGRESS");
      case "due_soon":
        return myAssignedTasks.filter((t) => {
          if (!t.deadline || t.status === "DONE") return false;
          const d = new Date(t.deadline);
          return d >= todayDate && d <= next7Days;
        });
      case "overdue":
        return myAssignedTasks.filter((t) => isOverdue(t.deadline, t.status));
      case "done":
        return myAssignedTasks.filter((t) => t.status === "DONE");
      case "all":
      default:
        return myAssignedTasks;
    }
  }, [myAssignedTasks, myTasksTab, todayDate, next7Days]);

  const displayName = user?.name || user?.username || "Teammate";

  return (
    <AppShell>
      {/* HEADER & WELCOME BANNER */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50/80 px-3 py-1 text-xs font-semibold text-brand-700">
            <Sparkles className="size-3.5" />
            <span>Personal Workspace Dashboard</span>
          </div>
          <h1 className="mt-2.5 text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">
            Welcome back, {displayName} 👋
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Here is what’s happening across your projects, active deliverables, and team workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => void loadWorkspaceData(false)}
            disabled={isRefreshing}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-brand-600" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          <Link
            to="/projects"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
          >
            <FolderKanban className="size-3.5" />
            <span>All Projects</span>
          </Link>

          <button
            onClick={() => setIsCreateProjectOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-xs font-semibold text-white shadow-brand transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Plus className="size-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-16 flex min-h-[360px] flex-col items-center justify-center">
          <LoaderCircle className="size-8 animate-spin text-brand-600" />
          <p className="mt-4 text-sm font-medium text-slate-500">Loading your workspace info...</p>
        </div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50/50 p-6 text-center">
          <AlertTriangle className="mx-auto size-8 text-rose-500" />
          <h3 className="mt-2 text-base font-bold text-slate-900">Workspace data unavailable</h3>
          <p className="mt-1 text-sm text-slate-600">{error}</p>
          <button
            onClick={() => void loadWorkspaceData(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
          >
            <RefreshCw className="size-3.5" /> Try again
          </button>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {/* WORKSPACE KPI CARDS */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Active Projects */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-brand-200 hover:shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Workspaces
                </span>
                <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <FolderKanban className="size-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-slate-950">
                  {projects.length}
                </span>
                <span className="text-xs text-slate-500 font-medium">active {projects.length === 1 ? "project" : "projects"}</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  {projects.filter((p) => p.role?.includes("Owner")).length}
                </span>{" "}
                owned by you
              </div>
            </div>

            {/* Card 2: Workspace Deliverables */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-brand-200 hover:shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Deliverables
                </span>
                <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-700">
                  <ListTodo className="size-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-slate-950">
                  {totalWorkspaceTasks}
                </span>
                <span className="text-xs text-slate-500 font-medium">total tasks</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <CheckCircle2 className="size-3" />
                  {totalCompletedTasks} done
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-medium">{totalInProgressTasks} in progress</span>
              </div>
            </div>

            {/* Card 3: Tasks Assigned To Me */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-brand-200 hover:shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Assigned To Me
                </span>
                <span className="grid size-9 place-items-center rounded-xl bg-purple-50 text-purple-700">
                  <UserCheck className="size-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-slate-950">
                  {myAssignedTasks.length}
                </span>
                <span className="text-xs text-slate-500 font-medium">my tasks</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="font-semibold text-emerald-700">{myCompletedCount} completed</span>
                <span className="text-slate-300">•</span>
                <span className="font-semibold text-amber-700">{myPendingCount} pending</span>
              </div>
            </div>

            {/* Card 4: Overall Completion Rate */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-brand-200 hover:shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Completion Rate
                </span>
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <TrendingUp className="size-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-slate-950">
                  {workspaceCompletionRate}%
                </span>
                <span className="text-xs text-slate-500 font-medium">workspace progress</span>
              </div>
              <div className="mt-3">
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, workspaceCompletionRate)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* URGENT ALERTS / ATTENTION BANNER (If tasks overdue or due this week) */}
          {(allOverdueTasks.length > 0 || tasksDueThisWeek.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allOverdueTasks.length > 0 && (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/60 p-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-rose-100 text-rose-700">
                    <AlertTriangle className="size-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                      {allOverdueTasks.length} Overdue {allOverdueTasks.length === 1 ? "Deliverable" : "Deliverables"}
                    </h4>
                    <p className="mt-0.5 text-xs text-rose-700/90">
                      Deliverables that have passed their deadline across projects and need immediate follow-up.
                    </p>
                  </div>
                </div>
              )}

              {tasksDueThisWeek.length > 0 && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
                    <Calendar className="size-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                      {tasksDueThisWeek.length} {tasksDueThisWeek.length === 1 ? "Task" : "Tasks"} Due This Week
                    </h4>
                    <p className="mt-0.5 text-xs text-amber-700/90">
                      Deliverables scheduled for completion within the next 7 days.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DELIVERABLES STATUS DISTRIBUTION BREAKDOWN */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="size-4 text-brand-600" />
                  Workspace Deliverables Health &amp; Distribution
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aggregate workload status across all active projects in your organization.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-600">
                {totalCompletedTasks} of {totalWorkspaceTasks} completed
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="mt-5">
              <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 shadow-inner">
                {totalWorkspaceTasks > 0 ? (
                  <>
                    <div
                      title={`Completed: ${totalCompletedTasks}`}
                      style={{ width: `${(totalCompletedTasks / totalWorkspaceTasks) * 100}%` }}
                      className="h-full bg-emerald-500 rounded-l-full transition-all duration-300"
                    />
                    <div
                      title={`In Review: ${totalReviewTasks}`}
                      style={{ width: `${(totalReviewTasks / totalWorkspaceTasks) * 100}%` }}
                      className="h-full bg-indigo-500 transition-all duration-300"
                    />
                    <div
                      title={`In Progress: ${totalInProgressTasks}`}
                      style={{ width: `${(totalInProgressTasks / totalWorkspaceTasks) * 100}%` }}
                      className="h-full bg-amber-500 transition-all duration-300"
                    />
                    <div
                      title={`To Do: ${totalTodoTasks}`}
                      style={{ width: `${(totalTodoTasks / totalWorkspaceTasks) * 100}%` }}
                      className="h-full bg-slate-300 rounded-r-full transition-all duration-300"
                    />
                  </>
                ) : (
                  <div className="h-full w-full bg-slate-200 rounded-full" />
                )}
              </div>

              {/* Status Legend Pills */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <span className="size-3 rounded-full bg-slate-400" />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      To Do
                    </span>
                    <p className="text-base font-bold text-slate-900">{totalTodoTasks}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                  <span className="size-3 rounded-full bg-amber-500" />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                      In Progress
                    </span>
                    <p className="text-base font-bold text-slate-900">{totalInProgressTasks}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                  <span className="size-3 rounded-full bg-indigo-500" />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                      In Review
                    </span>
                    <p className="text-base font-bold text-slate-900">{totalReviewTasks}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                  <span className="size-3 rounded-full bg-emerald-500" />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                      Completed
                    </span>
                    <p className="text-base font-bold text-slate-900">{totalCompletedTasks}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TWO COLUMN SECTION: "MY ASSIGNED DELIVERABLES" & "PROJECTS DIRECTORY" */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT: MY ASSIGNED TASKS FEED (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <UserCheck className="size-4 text-brand-600" />
                    My Assigned Tasks
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tasks assigned directly to you across all projects.
                  </p>
                </div>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                  {myAssignedTasks.length} {myAssignedTasks.length === 1 ? "Task" : "Tasks"}
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="mt-4 flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
                {[
                  { id: "all", label: "All", count: myAssignedTasks.length },
                  { id: "in_progress", label: "In Progress", count: myAssignedTasks.filter((t) => t.status === "IN_PROGRESS").length },
                  { id: "due_soon", label: "Due Soon", count: myAssignedTasks.filter((t) => {
                    if (!t.deadline || t.status === "DONE") return false;
                    const d = new Date(t.deadline);
                    return d >= todayDate && d <= next7Days;
                  }).length },
                  { id: "overdue", label: "Overdue", count: myAssignedTasks.filter((t) => isOverdue(t.deadline, t.status)).length },
                  { id: "done", label: "Completed", count: myAssignedTasks.filter((t) => t.status === "DONE").length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setMyTasksTab(tab.id as any)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      myTasksTab === tab.id
                        ? "bg-brand-600 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Tasks List */}
              <div className="mt-4 space-y-3">
                {filteredMyTasks.length === 0 ? (
                  <div className="py-12 text-center">
                    <CheckCircle2 className="mx-auto size-8 text-emerald-400" />
                    <p className="mt-3 text-sm font-semibold text-slate-800">You're all caught up!</p>
                    <p className="mt-1 text-xs text-slate-500">
                      No tasks found in this category.
                    </p>
                  </div>
                ) : (
                  filteredMyTasks.map((task) => {
                    const statusConf = STATUS_CONFIG[task.status] || STATUS_CONFIG.TODO;
                    const taskOverdue = isOverdue(task.deadline, task.status);

                    return (
                      <div
                        key={task.id}
                        className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-brand-200 hover:bg-white hover:shadow-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/projects/${task.projectId}`}
                              className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700 hover:bg-brand-100"
                            >
                              <FolderKanban className="size-3" />
                              <span className="truncate max-w-[140px]">{task.projectName}</span>
                            </Link>

                            {task.deadline && (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                  taskOverdue ? "text-rose-600" : "text-slate-500"
                                }`}
                              >
                                <Calendar className="size-3" />
                                <span>{formatDeadline(task.deadline)}</span>
                                {taskOverdue && <span className="font-bold">(Overdue)</span>}
                              </span>
                            )}
                          </div>

                          <h4 className="mt-1.5 text-sm font-bold text-slate-900 group-hover:text-brand-700 transition">
                            {task.title}
                          </h4>

                          {task.description && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Interactive Status Selector */}
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={task.status}
                            onChange={(e) =>
                              void handleQuickStatusChange(task.id, e.target.value as TaskStatus)
                            }
                            className={`h-8 rounded-lg border px-2.5 text-xs font-semibold outline-none cursor-pointer ${statusConf.badgeClass}`}
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="REVIEW">In Review</option>
                            <option value="DONE">Completed</option>
                          </select>

                          <Link
                            to={`/projects/${task.projectId}`}
                            className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                            title="Open in project board"
                          >
                            <ExternalLink className="size-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT: PROJECTS SUMMARY & TEAMMATES (5 cols) */}
            <div className="lg:col-span-5 space-y-8">
              {/* Workspace Projects Directory Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <FolderKanban className="size-4 text-brand-600" />
                      Workspace Projects
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Progress and deliverables overview.
                    </p>
                  </div>
                  <Link
                    to="/projects"
                    className="text-xs font-bold text-brand-600 hover:text-brand-800 transition"
                  >
                    View all →
                  </Link>
                </div>

                <div className="mt-4 space-y-3.5">
                  {projects.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No projects created yet.
                    </div>
                  ) : (
                    projects.map((proj) => (
                      <div
                        key={proj.id}
                        className="group rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-brand-200 hover:bg-white hover:shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">
                              {getInitials(proj.name)}
                            </span>
                            <div>
                              <Link
                                to={`/projects/${proj.id}`}
                                className="text-sm font-bold text-slate-900 group-hover:text-brand-700 transition flex items-center gap-1.5"
                              >
                                <span>{proj.name}</span>
                                <ArrowRight className="size-3 text-slate-400 group-hover:translate-x-0.5 transition" />
                              </Link>
                              <span className="text-[11px] text-slate-400">
                                {proj.memberCount} {proj.memberCount === 1 ? "member" : "members"}
                              </span>
                            </div>
                          </div>

                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                            {proj.role || "Member"}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                            <span>
                              {proj.completedTasks}/{proj.totalTasks} Done
                            </span>
                            <span>{proj.completionPercentage}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand-600 transition-all duration-300"
                              style={{ width: `${proj.completionPercentage}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                          <Link
                            to={`/projects/${proj.id}`}
                            className="font-semibold text-brand-600 hover:underline flex items-center gap-1"
                          >
                            <Kanban className="size-3" />
                            <span>Kanban Board</span>
                          </Link>

                          <Link
                            to={`/projects/${proj.id}/dashboard`}
                            className="font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                          >
                            <BarChart3 className="size-3" />
                            <span>Analytics</span>
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Workspace Collaborators Card */}
              {collaborators.length > 0 && (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <UsersRound className="size-4 text-brand-600" />
                        Workspace Collaborators
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Teammates active across your shared projects.
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      {collaborators.length}
                    </span>
                  </div>

                  <div className="mt-4 divide-y divide-slate-100">
                    {collaborators.map((c) => (
                      <div key={c.username} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-8 place-items-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">
                            {getInitials(c.username)}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{c.username}</p>
                            <p className="text-[11px] text-slate-400">
                              {c.projectCount} shared {c.projectCount === 1 ? "project" : "projects"}
                            </p>
                          </div>
                        </div>

                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                          {c.role || "Member"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE PROJECT DIALOG */}
      <CreateProjectDialog
        open={isCreateProjectOpen}
        onOpenChange={setIsCreateProjectOpen}
        onCreated={handleProjectCreated}
      />
    </AppShell>
  );
}
