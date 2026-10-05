import { Cable, LayoutDashboard, ListTodo, UsersRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";

export default function ProjectPlaceholder() {
  const { projectId } = useParams();

  return (
    <AppShell>
      <Link to="/projects" className="text-sm font-semibold text-brand-700 transition hover:text-brand-800">← Back to projects</Link>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700"><LayoutDashboard className="size-6" /></span>
        <p className="mt-6 text-sm font-semibold text-brand-700">PROJECT WORKSPACE</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] text-slate-950">Workspace setup is next</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">The selected project ({projectId}) is ready for its task board, dashboard, members, comments, attachments, and real-time activity.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[{ icon: ListTodo, label: "Tasks", text: "Plan and manage work" }, { icon: UsersRound, label: "Members", text: "Manage project access" }, { icon: Cable, label: "Live updates", text: "Keep everyone in sync" }].map(({ icon: Icon, label, text }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><Icon className="size-5 text-brand-600" /><p className="mt-5 text-sm font-bold text-slate-900">{label}</p><p className="mt-1 text-xs text-slate-500">{text}</p></div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
