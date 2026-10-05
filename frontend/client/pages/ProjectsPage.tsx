import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, FolderKanban, LoaderCircle, Plus, RefreshCw, Search, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { CreateProjectDialog, Project } from "@/components/CreateProjectDialog";
import { apiRequest, ApiError } from "@/lib/api";

function formatUpdatedAt(value?: string) {
  if (!value) return "Recently updated";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Recently updated";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function projectInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function normalizeProject(p: any): Project {
  return {
    id: String(p.projectId ?? p.id ?? ""),
    name: p.name ?? "Untitled Project",
    description: p.description,
    role: p.ownerUsername ? `Owner: ${p.ownerUsername}` : (p.role ?? "Member"),
    memberCount: Array.isArray(p.members) ? p.members.length : (p.memberCount ?? 1),
    updatedAt: p.updatedAt,
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadProjects = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await apiRequest<any>("/projects");
      const list = Array.isArray(response)
        ? response
        : (response?.projects ?? response?.content ?? []);
      setProjects(list.map(normalizeProject));
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        return;
      }
      setError(requestError instanceof Error ? requestError.message : "Unable to load your projects.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return projects;
    return projects.filter((project) => `${project.name} ${project.description ?? ""}`.toLowerCase().includes(normalizedQuery));
  }, [projects, query]);

  const handleCreated = (project: any) => {
    setProjects((current) => [normalizeProject(project), ...current]);
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">YOUR WORKSPACES</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-[2rem]">Projects</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Select a project to see its tasks, people, and progress.</p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
          <Plus className="size-4" />
          New project
        </button>
      </div>

      <div className="mt-8 flex flex-col gap-4 border-y border-slate-200 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-600">{isLoading ? "Loading projects…" : `${projects.length} ${projects.length === 1 ? "project" : "projects"}`}</p>
        <div className="relative w-full sm:w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter projects" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
        </div>
      </div>

      {isLoading ? (
        <div className="grid min-h-[300px] place-items-center"><LoaderCircle className="size-6 animate-spin text-brand-600" /></div>
      ) : error ? (
        <div className="mt-8 flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
          <p className="text-base font-semibold text-slate-900">We couldn’t load your projects</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{error}</p>
          <button onClick={() => void loadProjects()} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><RefreshCw className="size-4" />Try again</button>
        </div>
      ) : filteredProjects.length ? (
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="group relative flex min-h-[212px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700">{projectInitials(project.name)}</span>
                {project.role && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{project.role}</span>}
              </div>
              <div className="mt-5">
                <h2 className="pr-6 text-base font-bold tracking-[-0.02em] text-slate-900 transition group-hover:text-brand-700">{project.name}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{project.description || "No project description yet."}</p>
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
                <span className="inline-flex items-center gap-1.5"><UsersRound className="size-3.5" />{project.memberCount ?? 1} {(project.memberCount ?? 1) === 1 ? "member" : "members"}</span>
                <span className="inline-flex items-center gap-1.5">{formatUpdatedAt(project.updatedAt)}<ArrowUpRight className="size-3.5 text-slate-400 transition group-hover:text-brand-600" /></span>
              </div>
            </Link>
          ))}
        </div>
      ) : query ? (
        <div className="mt-8 flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
          <Search className="size-6 text-slate-400" />
          <p className="mt-4 text-base font-semibold text-slate-900">No matching projects</p>
          <p className="mt-2 text-sm text-slate-500">Try a different search term.</p>
        </div>
      ) : (
        <div className="mt-8 flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700"><FolderKanban className="size-6" /></span>
          <p className="mt-5 text-lg font-bold tracking-[-0.025em] text-slate-900">Create your first project</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Bring tasks, teammates, updates, and shared files into one focused workspace.</p>
          <button onClick={() => setIsCreateOpen(true)} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-700"><Plus className="size-4" />New project</button>
        </div>
      )}

      <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreated={handleCreated} />
    </AppShell>
  );
}
