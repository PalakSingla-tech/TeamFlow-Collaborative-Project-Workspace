import { Layers3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TeamFlowBrand({
  compact = false,
  inverted = false,
  className,
}: {
  compact?: boolean;
  inverted?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white shadow-brand">
        <Layers3 className="size-[18px]" strokeWidth={2.5} />
      </span>
      {!compact && <span className={cn("text-lg font-bold tracking-[-0.04em]", inverted ? "text-white" : "text-slate-950")}>TeamFlow</span>}
    </div>
  );
}
