import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGetNeighborhoodsQuery,
  useRunGreenTapePipelineMutation,
  useCreateProposalMutation,
} from "../store/api/apiSlice";
import type {
  GreenTapeIteration,
  GreenTapeIterationCritic,
  GreenTapeRunResult,
  GreenTapeRunContext,
  NeighborhoodSummary,
} from "../types/models";
import LoadingSpinner from "../components/LoadingSpinner";

export default function SelfImprovementLoopPage() {
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("authToken");

  const [selectedNeighborhood, setSelectedNeighborhood] = useState<number | "">("");
  const [lotSizeSqft, setLotSizeSqft] = useState<string>("20000");
  const [userGoal, setUserGoal] = useState<string>(
    "Design a deeply affordable, CLT-based project that keeps long-term residents in place."
  );
  const [notes, setNotes] = useState<string>(
    "Center existing tenants and small businesses. Avoid luxury programming."
  );
  const [maxIterations, setMaxIterations] = useState<number>(1);

  const { data: neighborhoodsPage, isLoading: neighborhoodsLoading } =
    useGetNeighborhoodsQuery({ page: 1 });
  const neighborhoods: NeighborhoodSummary[] = neighborhoodsPage?.results ?? [];

  const [runPipeline, { data: result, isLoading: pipelineLoading, error }] =
    useRunGreenTapePipelineMutation();

  if (!hasToken) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          Sign in to run the Green-Tape self-improvement loop.
        </p>
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
      max_iterations: maxIterations,
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-6 p-6 lg:flex-row">
      {/* ── Left panel: form ── */}
      <section className="flex w-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:w-[26rem] lg:shrink-0">
        <header>
          <h2 className="text-lg font-semibold text-slate-900">
            Green-Tape Self-Improvement Loop
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Two agents collaborate: the Draft Agent writes a proposal; the Community
            Board Agent reviews it against Everyday Peace indicators and real borough
            history; the loop repeats until the score converges.
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
                setSelectedNeighborhood(e.target.value ? Number(e.target.value) : "")
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
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Iterations segmented control */}
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Improvement rounds
            </label>
            <div className="flex overflow-hidden rounded-lg border border-slate-300">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMaxIterations(n)}
                  className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
                    maxIterations === n
                      ? "bg-cyan-500 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {n} {n === 1 ? "round" : "rounds"}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Each round = 2 LLM calls (optimizer + community board re-review).
            </p>
          </div>

          <button
            type="submit"
            disabled={!selectedNeighborhood || pipelineLoading}
            className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-cyan-400 hover:to-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pipelineLoading ? "Running self-improvement loop…" : "Run Green-Tape Loop"}
          </button>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <p className="font-semibold">Pipeline error</p>
              <p className="mt-1 font-mono break-all">
                {"status" in error
                  ? `HTTP ${error.status}: ${JSON.stringify(error.data)}`
                  : "message" in error
                  ? error.message
                  : JSON.stringify(error)}
              </p>
            </div>
          )}
        </form>
      </section>

      {/* ── Right panel: results ── */}
      <section className="flex min-h-[20rem] flex-1 flex-col gap-4 overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {pipelineLoading && (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <LoadingSpinner />
              <p className="text-sm text-slate-500">
                Agents are collaborating… this may take 30–60 seconds.
              </p>
            </div>
          </div>
        )}

        {!pipelineLoading && !result && (
          <div className="flex flex-1 items-center justify-center">
            <p className="max-w-md text-center text-sm text-slate-500">
              Configure a site and run the Green-Tape loop to see the draft, community
              board simulation, and score progression across rounds.
            </p>
          </div>
        )}

        {!pipelineLoading && result && <LoopResults result={result} />}

      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Results
// ─────────────────────────────────────────────────────────────

function scoreColorClass(score: number): string {
  if (score >= 70) return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  if (score >= 50) return "bg-amber-100 text-amber-700 ring-amber-200";
  return "bg-red-100 text-red-600 ring-red-200";
}

function LoopResults({ result }: { result: GreenTapeRunResult }) {
  const { iterations, final_draft, final_score, context } = result;
  const [activeTab, setActiveTab] = useState(0);
  const [showSave, setShowSave] = useState(false);
  const navigate = useNavigate();
  const [createProposal, { isLoading: saving }] = useCreateProposalMutation();

  const [saveTitle, setSaveTitle] = useState(
    () => `${context.neighborhood_name} — ${context.user_goal.slice(0, 50)}`
  );
  const [saveTotalUnits, setSaveTotalUnits] = useState("20");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const total = Math.max(1, parseInt(saveTotalUnits) || 20);
    // Build a proportional default unit mix: 30% studio, 50% 1BR, 20% 2BR
    const studio = Math.round(total * 0.3);
    const twoBr = Math.round(total * 0.2);
    const oneBr = total - studio - twoBr;
    const unitMix = [
      { unit_type: "studio" as const, count: studio, avg_sqft: "420", projected_rent: "1100" },
      { unit_type: "1br" as const, count: oneBr, avg_sqft: "620", projected_rent: "1400" },
      { unit_type: "2br" as const, count: twoBr, avg_sqft: "880", projected_rent: "1800" },
    ].filter((u) => u.count > 0);

    try {
      const proposal = await createProposal({
        title: saveTitle,
        description: final_draft,
        neighborhood: context.neighborhood_id,
        lot_size_sqft: String(context.lot_size_sqft),
        total_units: total,
        unit_mix: unitMix,
      }).unwrap();
      navigate(`/proposals/${proposal.id}`);
    } catch {
      // error handled below
    }
  }

  const tabLabel = (it: GreenTapeIteration) =>
    it.round === 0 ? "Initial Draft" : `Round ${it.round}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Score progression */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Score Progression
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {iterations.map((it, idx) => (
            <div key={it.round} className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab(idx)}
                className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 transition-all ${scoreColorClass(
                  it.critic.overall_score
                )} ${activeTab === idx ? "ring-2 scale-105" : "opacity-80 hover:opacity-100"}`}
              >
                {tabLabel(it)}: {it.critic.overall_score.toFixed(0)}
              </button>
              {idx < iterations.length - 1 && (
                <span className="text-slate-300">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tab strip */}
      <div>
        <div className="flex gap-1 border-b border-slate-200">
          {iterations.map((it, idx) => (
            <button
              key={it.round}
              onClick={() => setActiveTab(idx)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === idx
                  ? "border-b-2 border-cyan-500 text-cyan-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tabLabel(it)}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <IterationDraft iteration={iterations[activeTab]} />
          <CritiquePanel critic={iterations[activeTab].critic} />
        </div>
      </div>

      {/* Final optimized proposal */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-emerald-800">
            Final Optimized Proposal
          </h3>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${scoreColorClass(
                final_score
              )}`}
            >
              Score: {final_score.toFixed(0)} / 100
            </span>
            <button
              onClick={() => setShowSave((s) => !s)}
              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              {showSave ? "Cancel" : "Save as Proposal →"}
            </button>
          </div>
        </div>
        <div className="max-h-72 overflow-auto rounded-lg bg-white p-3">
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-800">
            {final_draft}
          </pre>
        </div>

        {showSave && (
          <form
            onSubmit={handleSave}
            className="mt-4 space-y-3 rounded-lg border border-emerald-300 bg-white p-4"
          >
            <p className="text-xs font-semibold text-emerald-800">
              Save as draft proposal
            </p>
            <p className="text-xs text-slate-500">
              The final optimized proposal text becomes the description. You can
              edit the unit mix after saving.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Title
              </label>
              <input
                type="text"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                maxLength={200}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Total units
              </label>
              <input
                type="number"
                min={1}
                value={saveTotalUnits}
                onChange={(e) => setSaveTotalUnits(e.target.value)}
                required
                className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="mt-1 text-xs text-slate-400">
                Default unit mix: 30% studio / 50% 1BR / 20% 2BR — edit after saving.
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save & Open Proposal"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function IterationDraft({ iteration }: { iteration: GreenTapeIteration }) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="mb-1 text-sm font-semibold text-slate-800">
        {iteration.round === 0
          ? "Initial Draft"
          : `Revised Draft (Round ${iteration.round})`}
      </h4>
      <p className="mb-3 text-xs text-slate-500">
        {iteration.round === 0
          ? "Draft Agent's first attempt based on zoning, market, and demographic context."
          : "Draft Agent's revision responding to community board feedback."}
      </p>
      <div className="flex-1 overflow-auto rounded-lg bg-white p-3">
        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-800">
          {iteration.draft}
        </pre>
      </div>
    </div>
  );
}

function CritiquePanel({ critic }: { critic: GreenTapeIterationCritic }) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="mb-1 text-sm font-semibold text-slate-800">
        Community Board Review
      </h4>
      <p className="mb-3 text-xs text-slate-500">
        Grounded in Everyday Peace indicators and real borough proposal history.
      </p>

      <div className="flex-1 space-y-3 overflow-auto text-xs">
        <div className="rounded-lg bg-white p-3">
          <p className="font-medium text-slate-700">Summary</p>
          <p className="mt-1 text-slate-600">{critic.summary}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MetricChip label="Displacement risk" value={critic.displacement_risk} />
          <MetricChip label="Affordability" value={critic.affordability_assessment} />
          <MetricChip label="Local business" value={critic.local_business_impact} />
          <MetricChip
            label="Overall score"
            value={`${critic.overall_score.toFixed(1)} / 100`}
            score={critic.overall_score}
          />
        </div>

        <div className="rounded-lg bg-white p-3">
          <p className="font-medium text-slate-700">Recommendations</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-600">
            {critic.recommendations.map((r, idx) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MetricChip({
  label,
  value,
  score,
}: {
  label: string;
  value: string;
  score?: number;
}) {
  const colorClass = score !== undefined ? scoreColorClass(score) : "bg-white ring-slate-100";
  return (
    <div className={`rounded-lg p-3 ring-1 ${colorClass}`}>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-semibold text-slate-800">{value}</p>
    </div>
  );
}
