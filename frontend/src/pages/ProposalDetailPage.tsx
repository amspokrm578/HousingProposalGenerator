import { useParams } from "react-router-dom";
import {
  useGetProposalQuery,
  useCalculateScoreMutation,
  useGenerateProjectionsMutation,
} from "../store/api/apiSlice";
import LoadingSpinner from "../components/LoadingSpinner";
import StatusBadge from "../components/StatusBadge";
import ScoreGauge from "../components/ScoreGauge";

const UNIT_TYPE_LABELS: Record<string, string> = {
  studio: "Studio",
  "1br": "1 Bedroom",
  "2br": "2 Bedroom",
  "3br": "3 Bedroom",
  "4br": "4+ Bedroom",
};

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: proposal, isLoading } = useGetProposalQuery(Number(id), {
    skip: !id,
  });
  const [calcScore, { isLoading: calcLoading }] = useCalculateScoreMutation();
  const [genProjections, { isLoading: projLoading }] =
    useGenerateProjectionsMutation();

  if (isLoading || !proposal) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{proposal.title}</h2>
          <p className="text-slate-500">
            {proposal.neighborhood.name},{" "}
            {proposal.neighborhood.borough_name} &middot; by{" "}
            {proposal.owner_username}
          </p>
          {proposal.description && (
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              {proposal.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={proposal.status} />
          <ScoreGauge
            score={
              proposal.feasibility_score
                ? parseFloat(proposal.feasibility_score)
                : null
            }
          />
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Lot Size", value: `${parseFloat(proposal.lot_size_sqft).toLocaleString()} sqft` },
          { label: "Total Units", value: proposal.total_units.toLocaleString() },
          {
            label: "Estimated Cost",
            value: proposal.estimated_cost
              ? `$${parseFloat(proposal.estimated_cost).toLocaleString()}`
              : "Not calculated",
          },
          {
            label: "Projected Revenue",
            value: proposal.projected_revenue
              ? `$${parseFloat(proposal.projected_revenue).toLocaleString()}`
              : "Not calculated",
          },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <dt className="text-xs font-medium text-slate-500">{m.label}</dt>
            <dd className="mt-1 text-lg font-semibold">{m.value}</dd>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => calcScore(proposal.id)}
          disabled={calcLoading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {calcLoading ? "Calculating..." : "Recalculate Score"}
        </button>
        <button
          onClick={() => genProjections({ id: proposal.id, years: 10 })}
          disabled={projLoading}
          className="rounded-lg border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 disabled:opacity-50 transition-colors"
        >
          {projLoading ? "Generating..." : "Generate 10-Year Projections"}
        </button>
      </div>

      {/* Unit mix */}
      {proposal.unit_mix.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-semibold text-slate-700">Unit Mix</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {proposal.unit_mix.map((u) => (
              <div
                key={u.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="font-semibold text-indigo-600">
                  {UNIT_TYPE_LABELS[u.unit_type] ?? u.unit_type}
                </p>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Count</dt>
                    <dd>{u.count}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Avg Size</dt>
                    <dd>{parseFloat(u.avg_sqft).toLocaleString()} sqft</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Projected Rent</dt>
                    <dd>${parseFloat(u.projected_rent).toLocaleString()}/mo</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Financial projections */}
      {proposal.financial_projections.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-semibold text-slate-700">
            Financial Projections
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Year</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Revenue</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Expenses</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Net Income</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Cum. ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {proposal.financial_projections.map((fp) => (
                  <tr key={fp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">Year {fp.year}</td>
                    <td className="px-4 py-3 text-right">
                      ${parseFloat(fp.revenue).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      ${parseFloat(fp.expenses).toLocaleString()}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        parseFloat(fp.net_income) >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      ${parseFloat(fp.net_income).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">{fp.cumulative_roi}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Status history */}
      {proposal.status_history.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-semibold text-slate-700">
            Status History
          </h3>
          <div className="space-y-2">
            {proposal.status_history.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <span className="text-slate-400">
                  {new Date(h.changed_at).toLocaleString()}
                </span>
                <span>
                  <span className="text-slate-500">{h.old_status || "—"}</span>
                  <span className="mx-2 text-slate-300">&rarr;</span>
                  <span className="font-medium">{h.new_status}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
