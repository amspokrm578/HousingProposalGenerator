import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  useGetDashboardSummaryQuery,
  useGetNeighborhoodRankingsQuery,
} from "../store/api/apiSlice";

const CHART_COLORS = ["#22d3ee", "#34d399", "#a78bfa", "#f472b6", "#fbbf24"];

const DEMAND_VS_LAND_DATA = [
  { name: "Manhattan", unusedAcres: 12, demandScore: 95 },
  { name: "Brooklyn", unusedAcres: 45, demandScore: 88 },
  { name: "Queens", unusedAcres: 78, demandScore: 72 },
  { name: "Bronx", unusedAcres: 62, demandScore: 68 },
  { name: "Staten Island", unusedAcres: 95, demandScore: 55 },
];

const APPROVAL_PROBABILITY = [
  { borough: "Manhattan", value: 84, fill: "#22d3ee" },
  { borough: "Brooklyn", value: 78, fill: "#34d399" },
  { borough: "Queens", value: 71, fill: "#a78bfa" },
  { borough: "Bronx", value: 65, fill: "#f472b6" },
  { borough: "Staten Island", value: 58, fill: "#fbbf24" },
];

function ApprovalGauge({ value, label }: { value: number; label: string }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-700"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
      <span className="mt-2 text-2xl font-bold text-white">{value}%</span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

const bentoItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

export default function AnalyticsDashboardPage() {
  const { data: dashboardData } = useGetDashboardSummaryQuery();
  const { data: rankings } = useGetNeighborhoodRankingsQuery();

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
        <p className="mt-1 text-slate-400">
          Macro-level data: unused land vs. housing demand, approval probabilities
        </p>
      </motion.div>

      {/* Bento Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Unused Land vs Demand Chart */}
        <motion.div
          {...bentoItem}
          className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm sm:col-span-2 lg:col-span-3"
        >
          <h3 className="mb-4 text-sm font-semibold text-slate-300">
            Unused Land vs. Housing Demand by Borough
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DEMAND_VS_LAND_DATA}>
                <defs>
                  <linearGradient
                    id="demandGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                  }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Area
                  type="monotone"
                  dataKey="demandScore"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  fill="url(#demandGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Approval Probability Gauges */}
        <motion.div
          {...bentoItem}
          className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm"
        >
          <h3 className="mb-4 text-sm font-semibold text-slate-300">
            DOB Approval Probability
          </h3>
          <p className="mb-4 text-xs text-slate-400">
            Based on historical approval data
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-2">
            {APPROVAL_PROBABILITY.slice(0, 4).map((item) => (
              <ApprovalGauge
                key={item.borough}
                value={item.value}
                label={item.borough}
              />
            ))}
          </div>
        </motion.div>

        {/* Borough Summary - from API */}
        <motion.div
          {...bentoItem}
          className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm"
        >
          <h3 className="mb-4 text-sm font-semibold text-slate-300">
            Proposals by Borough
          </h3>
          <div className="space-y-3">
            {dashboardData?.map((d) => (
              <div
                key={d.borough_name}
                className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-2"
              >
                <span className="text-sm text-slate-200">{d.borough_name}</span>
                <span className="font-semibold text-cyan-400">
                  {d.total_proposals} proposals
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Neighborhoods */}
        <motion.div
          {...bentoItem}
          className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm sm:col-span-2"
        >
          <h3 className="mb-4 text-sm font-semibold text-slate-300">
            Top-Ranked Neighborhoods
          </h3>
          <div className="space-y-2">
            {rankings?.slice(0, 10).map((r) => (
              <div
                key={r.neighborhood_id}
                className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-2"
              >
                <span className="text-sm text-slate-200">
                  #{r.overall_rank} {r.neighborhood_name}
                </span>
                <span className="text-sm font-medium text-emerald-400">
                  {parseFloat(r.development_score).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pie Chart */}
        <motion.div
          {...bentoItem}
          className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm"
        >
          <h3 className="mb-4 text-sm font-semibold text-slate-300">
            Unit Distribution
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={APPROVAL_PROBABILITY}
                  dataKey="value"
                  nameKey="borough"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  label={false}
                >
                  {APPROVAL_PROBABILITY.map((item, idx) => (
                    <Cell key={item.borough} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
