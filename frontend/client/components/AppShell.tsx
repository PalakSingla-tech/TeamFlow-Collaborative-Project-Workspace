import { useEffect } from "react";
import { FolderKanban, LayoutDashboard, LogOut, Plus, Search } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { TeamFlowBrand } from "@/components/TeamFlowBrand";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, updateUser, logout } = useAuth();

  // Automatically resolve the user's real database email if not yet cached in the session
  useEffect(() => {
    if (!user) return;
    if (user.email && user.email.includes("@")) return;

    const uName = user.username?.toLowerCase() || "";
    // Check localStorage cache first
    const cached = window.localStorage.getItem(`tf_user_email_${uName}`);
    if (cached && cached.includes("@")) {
      updateUser({ email: cached });
      return;
    }

    // Query projects to fetch user's real email from ProjectMemberDTO
    let active = true;
    void (async () => {
      try {
        const projs = await apiRequest<any[]>("/projects");
        if (!active || !Array.isArray(projs)) return;
        for (const p of projs) {
          if (Array.isArray(p.members)) {
            const match = p.members.find(
              (m: any) =>
                (m.username && m.username.toLowerCase() === uName) ||
                (m.userId && String(m.userId) === String(user.id))
            );
            if (match?.email && match.email.includes("@")) {
              updateUser({ email: match.email });
              window.localStorage.setItem(`tf_user_email_${uName}`, match.email);
              break;
            }
          }
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      active = false;
    };
  }, [user, updateUser]);

  const displayName = user?.name || user?.username || "Teammate";
  const initials = displayName
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "TF";

  return (
    <div className="min-h-screen bg-canvas text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col border-r border-slate-200/80 bg-white px-4 py-5 lg:flex">
        <TeamFlowBrand className="px-2" />
        <Link
          to="/projects"
          className="mt-8 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <Plus className="size-4" />
          New project
        </Link>
        <nav className="mt-7 space-y-1" aria-label="Main navigation">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
              )
            }
          >
            <LayoutDashboard className="size-[18px]" />
            Workspace
          </NavLink>
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
              )
            }
          >
            <FolderKanban className="size-[18px]" />
            Projects
          </NavLink>
        </nav>
        <div className="mt-auto rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/70 via-white to-indigo-50/40 p-4 text-slate-800 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700">TeamFlow Cloud</p>
          <p className="mt-1 text-sm font-bold text-slate-900">Always in sync</p>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">Project tasks and team activities update live across all devices.</p>
        </div>
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur lg:px-9">
          <div className="flex items-center gap-3">
            <TeamFlowBrand compact className="lg:hidden" />
            <div className="relative hidden w-[280px] sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Search projects"
                placeholder="Search projects"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">{displayName}</p>
              <p className="text-xs text-slate-500">{user?.email || (user?.username ? `@${user.username}` : "")}</p>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{initials}</span>
            <button
              onClick={logout}
              className="grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="size-[18px]" />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">{children}</main>
      </div>
    </div>
  );
}
