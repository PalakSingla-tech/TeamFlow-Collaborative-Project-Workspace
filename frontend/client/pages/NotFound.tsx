import { Link } from "react-router-dom";
import { TeamFlowBrand } from "@/components/TeamFlowBrand";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-5">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card sm:p-10">
        <TeamFlowBrand className="justify-center" />
        <p className="mt-10 text-sm font-bold tracking-[0.14em] text-brand-700">404</p>
        <h1 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-slate-950">This page is out of scope</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">The page you’re looking for doesn’t exist in this TeamFlow workspace.</p>
        <Link to="/projects" className="mt-7 inline-flex h-10 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-700">Go to projects</Link>
      </div>
    </div>
  );
}
