import { useState } from "react";
import {
  useGetNeighborhoodsQuery,
  useRunGreenTapePipelineMutation,
  useGetCurrentUserQuery,
} from "../store/api/apiSlice";
import type { GreenTapeRunResult, NeighborhoodSummary } from "../types/models";
import LoadingSpinner from "../components/LoadingSpinner";

export default function SelfImprovementLoopPage() {
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("authToken");
  const { data: currentUser } = useGetCurrentUserQuery(undefined, {
    skip: !hasToken,
  });
  const isPDO = currentUser?.is_pdo ?? false;

  const [selectedNeighborhood, setSelectedNeighborhood] = useState<number | "">("");
  const [lotSizeSqft, setLotSizeSqft] = useState<string>("20000");
  const [userGoal, setUserGoal] = useState<string>(
    "Design a deeply affordable, CLT-based project that keeps long-term residents in place."
  );
  const [notes, setNotes] = useState<string>(
    "Center existing tenants and small businesses. Avoid luxury programming."
  );

  const { data: neighborhoodsPage, isLoading: neighborhoodsLoading } =
    useGetNeighborhoodsQuery({ page: 1 });
  const neighborhoods: NeighborhoodSummary[] = neighborhoodsPage?.results ?? [];

  const [runPipeline, { data: result, isLoading: pipelineLoading, error }] =
    useRunGreenTapePipelineMutation();

  if (!hasToken) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-500">
          Sign in to run the Green-Tape self-improvement loop.
        </p>
      </div>
    );
  }

  if (!isPDO) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            PDO workspace only
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            The self-improvement loop is currently enabled for Public Development Outcome
            users. Contact your admin if you believe you should have access.
          </p>
        </div>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNeighborhood) return;
    await runPipeline({
      neighborhood_id: Number(selectedNeighborhood),
      lot_size_sqft: Number(lotSizeSqft) || 10000,
      user_goal: userGoal,
      additional_notes: notes,
      max_iterations: 1,
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-6 p-6 lg:flex-row">
      <section className="flex w-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:w-[26rem]">
        <header>
          <h2 className="text-lg font-semibold text-slate-900">
            Green-Tape Self-Improvement Loop
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Define a site and public-interest goal. Green-Tape will draft, simulate a
            community board review, and return an optimized proposal.
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Neighborhood
            </label>
            <select
              value={selectedNeighborhood}
              onChange={(e) =>
                setSelectedNeighborhood(
                  e.target.value ? Number(e.target.value) : ""
                )
              }
              disabled={neighborhoodsLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Select a neighborhood</option>
              {neighborhoods.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}, {n.borough_code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Lot size (sq ft)
            </label>
            <input
              type="number"
              min={1000}
              value={lotSizeSqft}
              onChange={(e) => setLotSizeSqft(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Public-interest goal
            </label>
            <textarea
              value={userGoal}
              onChange={(e) => setUserGoal(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Notes for the agent
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <button
            type="submit"
            disabled={!selectedNeighborhood || pipelineLoading}
            className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-cyan-400 hover:to-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pipelineLoading ? "Running self-improvement loop..." : "Run Green-Tape Loop"}
          </button>

          {error && (
            <p className="text-xs text-red-500">
              Unable to run the pipeline. Check your API key and authentication.
            </p>
          )}
        </form>

        {neighborhoodsLoading && (
          <div className="py-2 text-xs text-slate-400">
            Loading neighborhoods from NYC data…
          </div>
        )}
      </section>

      <section className="flex min-h-[20rem] flex-1 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {pipelineLoading && (
          <div className="flex flex-1 items-center justify-center">
            <LoadingSpinner />
          </div>
        )}

        {!pipelineLoading && !result && (
          <div className="flex flex-1 items-center justify-center">
            <p className="max-w-md text-center text-sm text-slate-500">
              Configure a site and run the Green-Tape loop to see the draft, community
              board simulation, and optimized proposal side by side.
            </p>
          </div>
        )}

        {!pipelineLoading && result && (
          <LoopResults result={result} />
        )}
      </section>
    </div>
  );
}

function LoopResults({ result }: { result: GreenTapeRunResult }) {
  const { draft, critic, optimizer } = result;
  const parsed = critic.parsed;

  return (
    <div className="grid flex-1 gap-4 lg:grid-cols-3">
      {/* Draft */}
      <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-800">
          Step 1 · Draft Proposal
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Initial Green-Tape draft based on zoning, market, and demographic context.
        </p>
        <div className="mt-3 flex-1 overflow-auto rounded-lg bg-white p-3 text-xs text-slate-800">
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
            {draft.text}
          </pre>
        </div>
      </div>

      {/* Critic */}
      <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-800">
          Step 2 · Community Board Simulator
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Everyday Peace-style review of displacement risk, affordability, and local
          business impact.
        </p>
        <div className="mt-3 flex-1 space-y-3 overflow-auto text-xs">
          <div className="rounded-lg bg-white p-3">
            <p className="font-medium text-slate-800">Summary</p>
            <p className="mt-1 text-slate-600">{parsed.summary}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <MetricChip label="Displacement risk" value={parsed.displacement_risk} />
            <MetricChip
              label="Affordability"
              value={parsed.affordability_assessment}
            />
            <MetricChip
              label="Local business impact"
              value={parsed.local_business_impact}
            />
            <MetricChip
              label="Overall score"
              value={`${parsed.overall_score.toFixed(1)}/100`}
            />
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="font-medium text-slate-800">Recommendations</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-600">
              {parsed.recommendations.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Optimized */}
      <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-800">
          Step 3 · Optimized Proposal
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Revised draft that responds to community concerns and strengthens public
          development outcomes.
        </p>
        <div className="mt-3 flex-1 overflow-auto rounded-lg bg-white p-3 text-xs text-slate-800">
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
            {optimizer.final_draft}
          </pre>
        </div>
      </div>
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-semibold text-slate-800">{value}</p>
    </div>
  );
}

