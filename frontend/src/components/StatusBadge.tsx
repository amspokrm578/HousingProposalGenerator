import type { ProposalStatus } from "../types/models";
import { PROPOSAL_STATUS_LABELS } from "../types/models";

const STATUS_COLORS: Record<ProposalStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export default function StatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status]}`}
    >
      {PROPOSAL_STATUS_LABELS[status]}
    </span>
  );
}
