import { useState } from "react";
import { Link } from "react-router-dom";
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
import LoadingSpinner from "../components/LoadingSpinner";
import StatusBadge from "../components/StatusBadge";
import ScoreGauge from "../components/ScoreGauge";
import type { ProposalStatus } from "../types/models";

export default function ProposalsPage() {
  const dispatch = useAppDispatch();
  const { filterBorough, filterStatus, searchQuery } = useAppSelector(selectUi);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Proposals</h2>
        <Link
          to="/proposals/new"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          + New Proposal
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
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <select
          value={filterBorough}
          onChange={(e) => {
            dispatch(setFilterBorough(e.target.value));
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm shadow-sm"
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
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm shadow-sm"
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
        <LoadingSpinner />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Title</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Location</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Units</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Est. Cost</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Score</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {proposals?.results.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/proposals/${p.id}`}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
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
