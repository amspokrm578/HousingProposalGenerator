import { useState } from "react";
import {
  useGetBoroughsQuery,
  useGetNeighborhoodQuery,
  useGetNeighborhoodsQuery,
} from "../store/api/apiSlice";
import { useDebounce } from "../hooks/useDebounce";
import LoadingSpinner from "../components/LoadingSpinner";

export default function NeighborhoodsPage() {
  const [search, setSearch] = useState("");
  const [borough, setBorough] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const { data: boroughs } = useGetBoroughsQuery();
  const { data: neighborhoods, isLoading } = useGetNeighborhoodsQuery({
    search: debouncedSearch,
    borough,
    page,
  });
  const { data: detail } = useGetNeighborhoodQuery(selectedId!, {
    skip: selectedId === null,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Neighborhood Explorer</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search neighborhoods..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <select
          value={borough}
          onChange={(e) => {
            setBorough(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Boroughs</option>
          {boroughs?.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* List */}
        <div>
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <div className="space-y-2">
                {neighborhoods?.results.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setSelectedId(n.id)}
                    className={`w-full rounded-xl border px-5 py-4 text-left shadow-sm transition-colors ${
                      selectedId === n.id
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 bg-white hover:border-indigo-300"
                    }`}
                  >
                    <p className="font-medium">{n.name}</p>
                    <p className="text-sm text-slate-500">
                      {n.borough_name} &middot; {n.area_sq_miles} sq mi &middot;{" "}
                      {n.proposal_count} proposals
                    </p>
                  </button>
                ))}
              </div>
              {/* Pagination */}
              {neighborhoods && (
                <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                  <span>
                    Page {page} of{" "}
                    {Math.ceil(neighborhoods.count / 20)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={!neighborhoods.previous}
                      onClick={() => setPage((p) => p - 1)}
                      className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      disabled={!neighborhoods.next}
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

        {/* Detail panel */}
        <div>
          {detail ? (
            <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h3 className="text-xl font-bold">{detail.name}</h3>
                <p className="text-sm text-slate-500">
                  {detail.borough.name} &middot; {detail.area_sq_miles} sq mi
                </p>
              </div>

              {/* Zoning */}
              <div>
                <h4 className="mb-2 font-semibold text-slate-700">Zoning Districts</h4>
                <div className="flex flex-wrap gap-2">
                  {detail.zoning_districts.map((z) => (
                    <div
                      key={z.id}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <span className="font-semibold text-indigo-600">{z.code}</span>
                      <span className="ml-2 text-slate-500">
                        FAR {z.max_far} &middot; {z.max_height_ft}ft
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Market data */}
              {detail.latest_market_data.length > 0 && (
                <div>
                  <h4 className="mb-2 font-semibold text-slate-700">Recent Market Data</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="pb-2">Period</th>
                        <th className="pb-2 text-right">Sale Price</th>
                        <th className="pb-2 text-right">Rent</th>
                        <th className="pb-2 text-right">Vacancy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.latest_market_data.map((m) => (
                        <tr key={m.id}>
                          <td className="py-2">{m.period}</td>
                          <td className="py-2 text-right">
                            ${parseFloat(m.median_sale_price).toLocaleString()}
                          </td>
                          <td className="py-2 text-right">
                            ${parseFloat(m.median_rent).toLocaleString()}
                          </td>
                          <td className="py-2 text-right">{m.vacancy_rate_pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Demographics */}
              {detail.latest_demographics.length > 0 && (
                <div>
                  <h4 className="mb-2 font-semibold text-slate-700">Demographics</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="pb-2">Year</th>
                        <th className="pb-2 text-right">Population</th>
                        <th className="pb-2 text-right">Income</th>
                        <th className="pb-2 text-right">Transit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.latest_demographics.map((d) => (
                        <tr key={d.id}>
                          <td className="py-2">{d.year}</td>
                          <td className="py-2 text-right">{d.population.toLocaleString()}</td>
                          <td className="py-2 text-right">
                            ${parseFloat(d.median_income).toLocaleString()}
                          </td>
                          <td className="py-2 text-right">{d.transit_score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400">
              Select a neighborhood to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
