import { useState } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/api";

export type Project = {
  id: string;
  name: string;
  description?: string;
  role?: string;
  memberCount?: number;
  updatedAt?: string;
};

type CreateProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (project: Project) => void;
};

export function CreateProjectDialog({ open, onOpenChange, onCreated }: CreateProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setError("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(nextOpen);
      if (!nextOpen) reset();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Project name is required.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const raw = await apiRequest<any>("/projects", {
        method: "POST",
        body: JSON.stringify({ name: trimmedName, description: description.trim() }),
      });
      const normProject: Project = {
        id: String(raw.projectId ?? raw.id ?? ""),
        name: raw.name ?? trimmedName,
        description: raw.description,
        role: "Owner",
        memberCount: Array.isArray(raw.members) ? raw.members.length : 1,
        updatedAt: raw.updatedAt || new Date().toISOString(),
      };
      onCreated(normProject);
      onOpenChange(false);
      reset();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create the project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[520px] rounded-2xl border-slate-200 bg-white p-0 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left">
          <DialogTitle className="text-xl font-bold tracking-[-0.03em] text-slate-950">Create a project</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-slate-500">Bring your team’s work into one shared space.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div>
            <label htmlFor="project-name" className="text-sm font-semibold text-slate-800">Project name</label>
            <input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Website refresh"
              autoFocus
              disabled={isSubmitting}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label htmlFor="project-description" className="text-sm font-semibold text-slate-800">Description <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this project about?"
              disabled={isSubmitting}
              rows={4}
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-50"
            />
          </div>
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => handleOpenChange(false)} disabled={isSubmitting} className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Create project
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
