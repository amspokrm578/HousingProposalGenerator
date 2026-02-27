import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  useGetBoroughsQuery,
  useGetProposalsQuery,
} from "../store/api/apiSlice";
import { useAppDispatch, useAppSelector } from "../store/store";
import {
  selectUi,
  setFilterBorough,
  setFilterStatus,
  setSearchQuery,
} from "../store/slices/uiSlice";
import { useDebounce } from "../hooks/useDebounce";
import StatusBadge from "../components/StatusBadge";
import ScoreGauge from "../components/ScoreGauge";

export default function ProposalsPage() {
  const dispatch = useAppDispatch();
  const { filterBorough, filterStatus, searchQuery, theme } = useAppSelector(selectUi);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const { data: boroughs } = useGetBoroughsQuery();
  const { data: proposals, isLoading } = useGetProposalsQuery({
    borough: filterBorough,
    status: filterStatus,
    search: debouncedSearch,
    ordering: "-updated_at",
    page,
  });

  const isDark = theme === "dark";
  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
          Proposals
        </h2>
        <Link to="/proposals/new">
          <motion.span
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="inline-block rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-shadow hover:shadow-cyan-500/40"
          >
            + New Proposal
          </motion.span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search proposals..."
          value={searchQuery}
          onChange={(e) => {
            dispatch(setSearchQuery(e.target.value));
            setPage(1);
          }}
          className={`rounded-xl border px-4 py-2 text-sm shadow-sm backdrop-blur-sm ${
            isDark
              ? "border-slate-600 bg-slate-800/50 text-white placeholder-slate-400 focus:border-cyan-500"
              : "border-slate-300 bg-white focus:border-indigo-500"
          }`}
        />
        <select
          value={filterBorough}
          onChange={(e) => {
            dispatch(setFilterBorough(e.target.value));
            setPage(1);
          }}
          className={`rounded-xl border px-4 py-2 text-sm ${
            isDark ? "border-slate-600 bg-slate-800/50 text-white" : "border-slate-300 bg-white"
          }`}
        >
          <option value="">All Boroughs</option>
          {boroughs?.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => {
            dispatch(setFilterStatus(e.target.value));
            setPage(1);
          }}
          className={`rounded-xl border px-4 py-2 text-sm ${
            isDark ? "border-slate-600 bg-slate-800/50 text-white" : "border-slate-300 bg-white"
          }`}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="h-12 w-12 animate-pulse rounded-xl bg-cyan-500/30" />
          <p className="text-sm text-slate-400">Loading proposals...</p>
        </div>
      ) : (
        <>
          <div
            className={`overflow-x-auto rounded-2xl border shadow-xl backdrop-blur-sm ${
              isDark ? "border-slate-700/50 bg-slate-900/50" : "border-slate-200 bg-white"
            }`}
          >
            <table className="min-w-full text-sm">
              <thead className={`border-b ${isDark ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"}`}>
                <tr>
                  <th className={`px-4 py-3 text-left font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Title</th>
                  <th className={`px-4 py-3 text-left font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Location</th>
                  <th className={`px-4 py-3 text-left font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Status</th>
                  <th className={`px-4 py-3 text-right font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Units</th>
                  <th className={`px-4 py-3 text-right font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Est. Cost</th>
                  <th className={`px-4 py-3 text-center font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Score</th>
                  <th className={`px-4 py-3 text-right font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>Updated</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? "divide-slate-700" : "divide-slate-100"}`}>
                {proposals?.results.map((p) => (
                  <tr key={p.id} className={isDark ? "hover:bg-slate-800/50" : "hover:bg-slate-50"}>
                    <td className="px-4 py-3">
                      <Link
                        to={`/proposals/${p.id}`}
                        className={`font-medium hover:underline ${isDark ? "text-cyan-400" : "text-indigo-600"}`}
                      >
                        {p.title}
                      </Link>
                    </td>
                    <td className={`px-4 py-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {p.neighborhood_name}, {p.borough_name}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-right">{p.total_units}</td>
                    <td className="px-4 py-3 text-right">
                      {p.estimated_cost
                        ? `$${parseFloat(p.estimated_cost).toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <ScoreGauge
                          score={
                            p.feasibility_score
                              ? parseFloat(p.feasibility_score)
                              : null
                          }
                          size="sm"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {new Date(p.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {proposals && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{proposals.count} proposals total</span>
              <div className="flex gap-2">
                <button
                  disabled={!proposals.previous}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  disabled={!proposals.next}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
