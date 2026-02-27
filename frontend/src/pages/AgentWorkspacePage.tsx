import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const PROPOSAL_DRAFT = `NEW YORK CITY DEPARTMENT OF BUILDINGS
HOUSING DEVELOPMENT PROPOSAL — DRAFT

Project Title: Williamsburg Mixed-Use Development
Location: 123 Bedford Ave, Brooklyn, NY 11211
Block: 2345 | Lot: 12
Zoning District: R7A / C2-4

---

I. EXECUTIVE SUMMARY

This proposal outlines a mixed-use residential and commercial development designed to address the acute housing shortage in Community Board 1 (Brooklyn) while supporting local retail and community services. The project aligns with the City's Housing New York 2.0 goals and incorporates affordable housing tier 2 requirements as cited in CB1 meeting notes from October 2025, which identified severe low-income housing shortages in the North Brooklyn corridor.

II. PROJECT SCOPE

• Total Units: 84 (60% market-rate, 40% affordable)
• Commercial: 12,000 sq ft ground-floor retail
• Lot Size: 25,000 sq ft
• Proposed FAR: 5.2 (within R7A maximum)
• Height: 78 ft (as-of-right)

III. AFFORDABLE HOUSING COMPLIANCE

Per MIH Option A, 34 units will be designated affordable:
- 17 units at 80% AMI
- 17 units at 120% AMI

[Suggested based on CB12 Community Board meeting notes from October 2025 citing severe low-income housing shortages in the district.]

IV. ENVIRONMENTAL CONSIDERATIONS

The project will pursue Passive House certification where feasible and incorporate green roof infrastructure to qualify for eco-friendly zoning incentives under the NYC Climate Mobilization Act.

V. COMMUNITY BENEFITS

• New public plaza (2,500 sq ft)
• Childcare facility (3,000 sq ft)
• Transit improvements: bus shelter upgrade, bike share station`;

const AGENT_INSIGHTS = [
  {
    id: 1,
    highlight: "affordable housing tier 2",
    reason:
      "Suggested based on CB12 Community Board meeting notes from October 2025 citing severe low-income housing shortages.",
    badge: "Community Data",
  },
  {
    id: 2,
    highlight: "R7A / C2-4",
    reason:
      "Zoning allows mixed-use with commercial ground floor. Max FAR 4.0 residential + 1.0 commercial = 5.0 total.",
    badge: "DOB Zoning",
  },
  {
    id: 3,
    highlight: "Passive House certification",
    reason:
      "Aligns with NYC Climate Mobilization Act. May qualify for 5–10% density bonus in certain districts.",
    badge: "Eco Grants",
  },
  {
    id: 4,
    highlight: "MIH Option A",
    reason:
      "Mandatory Inclusionary Housing selected based on neighborhood AMI and comparable developments.",
    badge: "Policy",
  },
];

const ACTION_PROMPTS = [
  "Make the tone more formal",
  "Optimize for eco-friendly zoning grants",
  "Adjust budget constraints",
  "Add more community benefit language",
  "Emphasize transit accessibility",
];

export default function AgentWorkspacePage() {
  const [typedText, setTypedText] = useState("");
  const [fullText] = useState(PROPOSAL_DRAFT);
  const [selectedInsight, setSelectedInsight] = useState<number | null>(null);

  useEffect(() => {
    if (typedText.length >= fullText.length) return;
    const timer = setTimeout(() => {
      setTypedText(fullText.slice(0, typedText.length + 2));
    }, 20);
    return () => clearTimeout(timer);
  }, [typedText, fullText]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* Left Panel - Document */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-1 flex-col overflow-hidden border-r border-slate-700/50 bg-slate-900/50"
      >
        <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">
            AI-Generated Proposal Draft
          </h2>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-400">Agent typing...</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-200">
            {typedText}
            <span className="animate-pulse">|</span>
          </pre>
        </div>
      </motion.div>

      {/* Right Panel - Agent's Brain */}
      <motion.aside
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex w-full flex-col border-t border-slate-700/50 lg:w-96 lg:border-t-0"
      >
        <div className="border-b border-slate-700/50 px-6 py-4">
          <h3 className="text-sm font-semibold text-white">
            Agent&apos;s Reasoning
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Why the AI made certain decisions in the draft
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {AGENT_INSIGHTS.map((insight) => (
            <motion.div
              key={insight.id}
              whileHover={{ scale: 1.01 }}
              onClick={() =>
                setSelectedInsight(selectedInsight === insight.id ? null : insight.id)
              }
              className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                selectedInsight === insight.id
                  ? "border-cyan-500/50 bg-cyan-500/10"
                  : "border-slate-700/50 bg-slate-800/50 hover:border-slate-600"
              }`}
            >
              <span className="inline-block rounded-md bg-cyan-500/20 px-2 py-0.5 text-xs font-medium text-cyan-300">
                {insight.badge}
              </span>
              <p className="mt-2 text-sm font-medium text-slate-200">
                &ldquo;{insight.highlight}&rdquo;
              </p>
              <p className="mt-1 text-xs text-slate-400">{insight.reason}</p>
            </motion.div>
          ))}
        </div>

        {/* Actionable Prompts */}
        <div className="border-t border-slate-700/50 p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Guide the Agent
          </h4>
          <div className="flex flex-wrap gap-2">
            {ACTION_PROMPTS.map((prompt) => (
              <motion.button
                key={prompt}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-300"
              >
                {prompt}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.aside>
    </div>
  );
}
