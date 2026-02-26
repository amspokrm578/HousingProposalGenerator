import {
  useGetDashboardSummaryQuery,
  useGetProposalsQuery,
} from "../store/api/apiSlice";
import { useMarketAnalysis } from "../hooks/useMarketAnalysis";
import LoadingSpinner from "../components/LoadingSpinner";
import ScoreGauge from "../components/ScoreGauge";
import StatusBadge from "../components/StatusBadge";

export default function DashboardPage() {
  const { data: summaries, isLoading: summLoading } = useGetDashboardSummaryQuery();
  const { data: proposalPage, isLoading: propLoading } = useGetProposalsQuery({
    ordering: "-updated_at",
    page: 1,
  });
  const { topQuartile, avgScoreByBorough, isLoading: rankLoading } = useMarketAnalysis();

  if (summLoading || propLoading || rankLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      {/* Borough summary cards */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-slate-700">Borough Overview</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {summaries?.map((s) => (
            <div
              key={s.borough_name}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h4 className="text-sm font-semibold text-indigo-600">{s.borough_name}</h4>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Proposals</dt>
                  <dd className="font-medium">{s.total_proposals}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Total Units</dt>
                  <dd className="font-medium">{s.total_units.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Avg Score</dt>
                  <dd>
                    <ScoreGauge
                      score={s.avg_feasibility_score ? parseFloat(s.avg_feasibility_score) : null}
                      size="sm"
                    />
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Dev Score</dt>
                  <dd className="font-medium">
                    {avgScoreByBorough[s.borough_name]?.toFixed(1) ?? "N/A"}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      {/* Top neighborhoods */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-slate-700">
          Top-Ranked Neighborhoods for Development
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Rank</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Neighborhood</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Borough</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Dev Score</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Transit</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Vacancy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topQuartile.slice(0, 10).map((r) => (
                <tr key={r.neighborhood_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{r.overall_rank}</td>
                  <td className="px-4 py-3">{r.neighborhood_name}</td>
                  <td className="px-4 py-3 text-slate-500">{r.borough_name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-indigo-600">
                    {parseFloat(r.development_score).toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right">{parseFloat(r.transit_score).toFixed(0)}</td>
                  <td className="px-4 py-3 text-right">{r.vacancy_rate_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent proposals */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-slate-700">Recent Proposals</h3>
        <div className="space-y-3">
          {proposalPage?.results.slice(0, 5).map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
            >
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-sm text-slate-500">
                  {p.neighborhood_name}, {p.borough_name} &middot;{" "}
                  {p.total_units} units
                </p>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status={p.status} />
                <ScoreGauge
                  score={p.feasibility_score ? parseFloat(p.feasibility_score) : null}
                  size="sm"
                />
              </div>
            </div>
          ))}
          {(!proposalPage || proposalPage.results.length === 0) && (
            <p className="py-8 text-center text-slate-400">
              No proposals yet. Create your first one!
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
