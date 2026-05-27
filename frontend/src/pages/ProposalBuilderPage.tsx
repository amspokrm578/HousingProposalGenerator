import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ProposalWizardProvider,
  useWizard,
} from "../context/ProposalWizardContext";
import {
  useGetBoroughsQuery,
  useGetNeighborhoodsQuery,
  useGetNeighborhoodMapDataQuery,
} from "../store/api/apiSlice";
import { useDebounce } from "../hooks/useDebounce";
import type { UnitMix } from "../types/models";

const STEPS = [
  "Select Neighborhood",
  "Project Details",
  "Unit Mix",
  "Review & Submit",
];

function StepIndicator({ current }: { current: number }) {
  return (
    <nav className="mb-8 flex items-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              i <= current
                ? "bg-indigo-600 text-white"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {i + 1}
          </div>
          <span
            className={`hidden text-sm sm:inline ${
              i === current ? "font-semibold text-slate-900" : "text-slate-400"
            }`}
          >
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <div className="mx-1 h-px w-8 bg-slate-300" />
          )}
        </div>
      ))}
    </nav>
  );
}

function Step0Neighborhood() {
  const { state, dispatch } = useWizard();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [borough, setBorough] = useState(searchParams.get("borough") ?? "");
  const debouncedSearch = useDebounce(search, 300);
  const { data: boroughs } = useGetBoroughsQuery();
  const { data: neighborhoods } = useGetNeighborhoodsQuery({
    search: debouncedSearch,
    borough,
  });
  const { data: allNeighborhoods = [] } = useGetNeighborhoodMapDataQuery();

  const parcelLat = parseFloat(searchParams.get("lat") ?? "");
  const parcelLng = parseFloat(searchParams.get("lng") ?? "");

  useEffect(() => {
    if (!parcelLat || !parcelLng || !allNeighborhoods.length || state.neighborhoodId) return;
    let bestId = allNeighborhoods[0].id;
    let bestDist = Infinity;
    for (const n of allNeighborhoods) {
      const d = (parcelLat - parseFloat(n.latitude)) ** 2 + (parcelLng - parseFloat(n.longitude)) ** 2;
      if (d < bestDist) { bestDist = d; bestId = n.id; }
    }
    dispatch({ type: "SET_NEIGHBORHOOD", id: bestId });
  }, [allNeighborhoods, parcelLat, parcelLng, state.neighborhoodId, dispatch]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Choose a Target Neighborhood</h3>
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
        />
        <select
          value={borough}
          onChange={(e) => setBorough(e.target.value)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm shadow-sm"
        >
          <option value="">All Boroughs</option>
          {boroughs?.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {neighborhoods?.results.map((n) => (
          <button
            key={n.id}
            onClick={() => dispatch({ type: "SET_NEIGHBORHOOD", id: n.id })}
            className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
              state.neighborhoodId === n.id
                ? "border-indigo-500 bg-indigo-50 font-semibold"
                : "border-slate-200 bg-white hover:border-indigo-300"
            }`}
          >
            {n.name}, {n.borough_name}
          </button>
        ))}
      </div>
      {state.errors.neighborhoodId && (
        <p className="text-sm text-red-500">{state.errors.neighborhoodId}</p>
      )}
    </div>
  );
}

function Step1Details() {
  const { state, dispatch } = useWizard();

  return (
    <div className="max-w-lg space-y-4">
      <h3 className="text-lg font-semibold">Project Details</h3>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Project Title
        </label>
        <input
          type="text"
          value={state.title}
          onChange={(e) =>
            dispatch({ type: "SET_FIELD", field: "title", value: e.target.value })
          }
          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
        />
        {state.errors.title && (
          <p className="mt-1 text-sm text-red-500">{state.errors.title}</p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          value={state.description}
          onChange={(e) =>
            dispatch({
              type: "SET_FIELD",
              field: "description",
              value: e.target.value,
            })
          }
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Lot Size (sqft)
          </label>
          <input
            type="number"
            value={state.lotSizeSqft}
            onChange={(e) =>
              dispatch({
                type: "SET_FIELD",
                field: "lotSizeSqft",
                value: e.target.value,
              })
            }
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
          />
          {state.errors.lotSizeSqft && (
            <p className="mt-1 text-sm text-red-500">{state.errors.lotSizeSqft}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Total Units
          </label>
          <input
            type="number"
            value={state.totalUnits || ""}
            onChange={(e) =>
              dispatch({
                type: "SET_FIELD",
                field: "totalUnits",
                value: parseInt(e.target.value) || 0,
              })
            }
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
          />
          {state.errors.totalUnits && (
            <p className="mt-1 text-sm text-red-500">{state.errors.totalUnits}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface UnitSpec {
  unit_type: UnitMix["unit_type"];
  pct: number;
  avg_sqft: string;
  projected_rent: string;
}

interface MixPreset {
  id: string;
  name: string;
  description: string;
  color: string;
  units: UnitSpec[];
}

const MIX_PRESETS: MixPreset[] = [
  {
    id: "deeply-affordable",
    name: "Deeply Affordable",
    description: "40–60% AMI. CLT-ready, anti-displacement focus.",
    color: "#22d3ee",
    units: [
      { unit_type: "studio", pct: 40, avg_sqft: "400", projected_rent: "900" },
      { unit_type: "1br",    pct: 45, avg_sqft: "580", projected_rent: "1100" },
      { unit_type: "2br",    pct: 15, avg_sqft: "820", projected_rent: "1400" },
    ],
  },
  {
    id: "family-centered",
    name: "Family-Centered",
    description: "Larger units for households with children.",
    color: "#34d399",
    units: [
      { unit_type: "1br", pct: 20, avg_sqft: "620",  projected_rent: "1400" },
      { unit_type: "2br", pct: 40, avg_sqft: "900",  projected_rent: "1800" },
      { unit_type: "3br", pct: 30, avg_sqft: "1100", projected_rent: "2200" },
      { unit_type: "4br", pct: 10, avg_sqft: "1300", projected_rent: "2600" },
    ],
  },
  {
    id: "mixed-income",
    name: "Mixed Income",
    description: "Blend of affordable and market-rate tiers.",
    color: "#fbbf24",
    units: [
      { unit_type: "studio", pct: 20, avg_sqft: "450",  projected_rent: "1600" },
      { unit_type: "1br",    pct: 30, avg_sqft: "650",  projected_rent: "2100" },
      { unit_type: "2br",    pct: 30, avg_sqft: "900",  projected_rent: "2900" },
      { unit_type: "3br",    pct: 20, avg_sqft: "1100", projected_rent: "3600" },
    ],
  },
  {
    id: "market-rate",
    name: "Market Rate",
    description: "Standard NYC market distribution.",
    color: "#a78bfa",
    units: [
      { unit_type: "studio", pct: 35, avg_sqft: "450",  projected_rent: "2300" },
      { unit_type: "1br",    pct: 35, avg_sqft: "650",  projected_rent: "3000" },
      { unit_type: "2br",    pct: 20, avg_sqft: "900",  projected_rent: "3900" },
      { unit_type: "3br",    pct: 10, avg_sqft: "1100", projected_rent: "4900" },
    ],
  },
];

function buildPresetMix(
  preset: MixPreset,
  totalUnits: number
): Omit<UnitMix, "id">[] {
  const counts = preset.units.map((s) =>
    Math.round((s.pct / 100) * totalUnits)
  );
  const diff = totalUnits - counts.reduce((a, b) => a + b, 0);
  if (diff !== 0) counts[0] = Math.max(1, counts[0] + diff);
  return preset.units
    .map((s, i) => ({
      unit_type: s.unit_type,
      count: counts[i],
      avg_sqft: s.avg_sqft,
      projected_rent: s.projected_rent,
    }))
    .filter((u) => u.count > 0);
}

const UNIT_TYPES: { value: UnitMix["unit_type"]; label: string }[] = [
  { value: "studio", label: "Studio" },
  { value: "1br", label: "1 Bedroom" },
  { value: "2br", label: "2 Bedroom" },
  { value: "3br", label: "3 Bedroom" },
  { value: "4br", label: "4+ Bedroom" },
];

function Step2UnitMix() {
  const { state, dispatch } = useWizard();
  const [unitType, setUnitType] = useState<UnitMix["unit_type"]>("studio");
  const [count, setCount] = useState("");
  const [avgSqft, setAvgSqft] = useState("");
  const [rent, setRent] = useState("");

  const addUnit = () => {
    if (!count || !avgSqft || !rent) return;
    dispatch({
      type: "ADD_UNIT",
      unit: {
        unit_type: unitType,
        count: parseInt(count),
        avg_sqft: avgSqft,
        projected_rent: rent,
      },
    });
    setCount("");
    setAvgSqft("");
    setRent("");
  };

  const applyPreset = (preset: MixPreset) => {
    if (state.totalUnits <= 0) return;
    dispatch({
      type: "SET_UNIT_MIX",
      unitMix: buildPresetMix(preset, state.totalUnits),
    });
  };

  const unitTotal = state.unitMix.reduce((s, u) => s + u.count, 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Define Unit Mix</h3>
      <p className="text-sm text-slate-500">
        Total units: {state.totalUnits} | Assigned: {unitTotal} | Remaining:{" "}
        {state.totalUnits - unitTotal}
      </p>

      {/* Preset suggestions */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Quick Presets
          {state.totalUnits <= 0 && (
            <span className="ml-2 font-normal normal-case text-slate-400">
              — set total units in Step 1 first
            </span>
          )}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MIX_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              disabled={state.totalUnits <= 0}
              className="group rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-indigo-300 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span
                className="mb-2 block h-1 w-8 rounded-full"
                style={{ backgroundColor: preset.color }}
              />
              <p className="text-xs font-semibold text-slate-800">{preset.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{preset.description}</p>
              <p className="mt-2 text-xs text-slate-400">
                {preset.units.map((u) => `${u.pct}% ${u.unit_type}`).join(" · ")}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Add unit form */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Type</label>
          <select
            value={unitType}
            onChange={(e) => setUnitType(e.target.value as UnitMix["unit_type"])}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {UNIT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Count</label>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Avg sqft</label>
          <input
            type="number"
            value={avgSqft}
            onChange={(e) => setAvgSqft(e.target.value)}
            className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Rent/mo</label>
          <input
            type="number"
            value={rent}
            onChange={(e) => setRent(e.target.value)}
            className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={addUnit}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Add
        </button>
      </div>

      {/* Current mix */}
      {state.unitMix.length > 0 && (
        <div className="space-y-2">
          {state.unitMix.map((u, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <span>
                <span className="font-medium">
                  {UNIT_TYPES.find((t) => t.value === u.unit_type)?.label}
                </span>
                {" — "}
                {u.count} units, {u.avg_sqft} sqft, ${u.projected_rent}/mo
              </span>
              <button
                onClick={() => dispatch({ type: "REMOVE_UNIT", index: i })}
                className="text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {state.errors.unitMix && (
        <p className="text-sm text-red-500">{state.errors.unitMix}</p>
      )}
    </div>
  );
}

function Step3Review() {
  const { state, isSubmitting, isSuccess, submitError } = useWizard();

  return (
    <div className="max-w-lg space-y-4">
      <h3 className="text-lg font-semibold">Review & Submit</h3>
      <dl className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {[
          ["Title", state.title],
          ["Neighborhood ID", state.neighborhoodId],
          ["Lot Size", `${parseFloat(state.lotSizeSqft || "0").toLocaleString()} sqft`],
          ["Total Units", state.totalUnits],
          ["Unit Types", state.unitMix.length],
        ].map(([label, value]) => (
          <div key={String(label)} className="flex justify-between px-5 py-3 text-sm">
            <dt className="text-slate-500">{String(label)}</dt>
            <dd className="font-medium">{String(value)}</dd>
          </div>
        ))}
      </dl>

      {isSubmitting && (
        <p className="text-sm text-indigo-600">Submitting proposal...</p>
      )}
      {isSuccess && (
        <p className="text-sm font-medium text-emerald-600">
          Proposal created successfully!
        </p>
      )}
      {submitError && (
        <p className="text-sm text-red-500">
          Error creating proposal. Please check your inputs.
        </p>
      )}
    </div>
  );
}

function WizardContent() {
  const { state, dispatch, nextStep, prevStep, submit, isSuccess } = useWizard();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const lotSize = searchParams.get("lot_size");
    const address = searchParams.get("address");
    if (lotSize) dispatch({ type: "SET_FIELD", field: "lotSizeSqft", value: lotSize });
    if (address) dispatch({ type: "SET_FIELD", field: "title", value: `New Proposal — ${address}` });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => navigate("/proposals"), 1500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate]);

  return (
    <div className="-ml-4 space-y-6 p-4 lg:p-6">
      <h2 className="text-2xl font-bold">New Proposal</h2>
      <StepIndicator current={state.step} />

      {state.step === 0 && <Step0Neighborhood />}
      {state.step === 1 && <Step1Details />}
      {state.step === 2 && <Step2UnitMix />}
      {state.step === 3 && <Step3Review />}

      <div className="flex gap-3 border-t border-slate-200 pt-4">
        {state.step > 0 && (
          <button
            onClick={prevStep}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back
          </button>
        )}
        {state.step < 3 ? (
          <button
            onClick={nextStep}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={submit}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Submit Proposal
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProposalBuilderPage() {
  return (
    <ProposalWizardProvider>
      <WizardContent />
    </ProposalWizardProvider>
  );
}
