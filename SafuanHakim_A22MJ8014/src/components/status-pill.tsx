import { clsx } from "clsx";
import type { IncidentPriority, IncidentStatus } from "@/lib/types";

const statusStyles: Record<IncidentStatus, string> = {
  new: "bg-white text-ink ring-stone-300",
  triaged: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  assigned: "bg-amber-50 text-amber-800 ring-amber-200",
  in_progress: "bg-blue-50 text-blue-800 ring-blue-200",
  waiting_customer: "bg-violet-50 text-violet-800 ring-violet-200",
  resolved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  closed: "bg-stone-100 text-stone-700 ring-stone-300"
};

const priorityStyles: Record<IncidentPriority, string> = {
  low: "bg-stone-100 text-stone-700",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800"
};

export function StatusPill({ status }: { status: IncidentStatus }) {
  return (
    <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold ring-1", statusStyles[status])}>
      {status.replace("_", " ")}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: IncidentPriority }) {
  return <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", priorityStyles[priority])}>{priority}</span>;
}
