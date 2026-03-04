"""
Green-Tape multi-step agent pipeline.

This module encapsulates the Darwin-Gödel-inspired self-improvement loop:

1. Draft Generation (Primary agent)
2. Simulation/Evaluation via a "Community Board Simulator" critic
3. Self-Correction / Optimization of the draft

The prompts and calling patterns are tuned for OpenAI-style chat models but
kept provider-neutral enough to work with any OpenAI-compatible endpoint.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from config.llm import LLMConfigurationError, call_llm, call_llm_json
from .models import Neighborhood
from .nyc_data import get_neighborhood_site_context


DEEP_AFFORDABILITY_GUIDING_PRINCIPLES = """
- Prioritize deeply affordable housing (30-60% AMI) over luxury development.
- Prefer community land trusts (CLTs), limited-equity cooperatives, and other
  decommodified ownership structures where feasible.
- Maximize permanent affordability and anti-displacement protections.
""".strip()


ANTI_GENTRIFICATION_POLICY_GUARDRAILS = """
- Include residency requirements such as: priority leasing to verified New York
  City residents with 5+ years of residency in the borough or surrounding
  municipal areas.
- Avoid design or program elements that directly or indirectly accelerate
  displacement of existing working-class communities or small local businesses.
- Incorporate right-to-return, anti-harassment, and tenant organizing support
  where relevant.
""".strip()


EVERYDAY_PEACE_INDICATORS = """
Evaluate the proposal using Everyday Peace-style indicators, including:
- Displacement risk for existing residents.
- Depth and durability of affordability.
- Impact on local small businesses and street life.
- Perceived safety and community cohesion (e.g., well-used public space,
  ground-floor activity, lighting, eyes-on-the-street).
- Accessibility to transit, schools, and critical services.
""".strip()


@dataclass
class GreenTapeContext:
    neighborhood: Neighborhood
    lot_size_sqft: float
    user_goal: str
    additional_notes: str = ""
    site_context: Optional[Dict[str, Any]] = None


@dataclass
class DraftResult:
    draft_text: str
    prompt_used: str


@dataclass
class CriticFeedback:
    summary: str
    displacement_risk: str
    affordability_assessment: str
    local_business_impact: str
    overall_score: float
    recommendations: List[str]


@dataclass
class OptimizationResult:
    improved_draft_text: str
    rationale: str


def build_generation_prompt(context: GreenTapeContext) -> str:
    """
    Construct the base prompt that strongly encodes Green-Tape's priorities.
    """

    n = context.neighborhood
    header = (
        "You are Green-Tape, an urban informatics housing agent for New York City.\n"
        "You propose developments that are ambitious but plausible within NYC "
        "zoning, building, and financing realities.\n"
    )
    location = (
        f"Site context:\n"
        f"- Neighborhood: {n.name}, {n.borough.code}\n"
        f"- Borough: {n.borough.name}\n"
        f"- Approximate lot size: {context.lot_size_sqft:,.0f} sqft\n"
    )
    # Enrich with cached NYC-style data if available
    site = context.site_context or {}
    zoning = site.get("zoning") or {}
    market = site.get("market") or {}
    demo = site.get("demographics") or {}

    urban_informatics_lines = [
        "Urban informatics snapshot (from zoning, PLUTO-style, and DOB-style data):",
        f"- Zoning codes: {', '.join(zoning.get('codes', [])) or 'N/A'}",
        f"- Zoning mix: "
        f"{'residential ' if zoning.get('has_residential') else ''}"
        f"{'commercial ' if zoning.get('has_commercial') else ''}"
        f"{'mixed ' if zoning.get('has_mixed') else ''}".strip() or "N/A",
        f"- Max FAR (approx): {zoning.get('max_far') or 'N/A'}",
        f"- Max height (ft, approx): {zoning.get('max_height_ft') or 'N/A'}",
        f"- Latest median rent: {market.get('median_rent') or 'N/A'}",
        f"- Latest vacancy rate (%): {market.get('vacancy_rate_pct') or 'N/A'}",
        f"- Population (latest): {demo.get('population') or 'N/A'}",
        f"- Median income (latest): {demo.get('median_income') or 'N/A'}",
        f"- Population growth (%): {demo.get('population_growth_pct') or 'N/A'}",
        f"- Transit accessibility score (0–100): {demo.get('transit_score') or 'N/A'}",
    ]
    urban_informatics = "\n".join(urban_informatics_lines)
    goals = f"User goal: {context.user_goal}\n"
    notes = f"Additional notes: {context.additional_notes or 'N/A'}\n"

    constraints = (
        "Core design constraints and policy priorities:\n"
        f"{DEEP_AFFORDABILITY_GUIDING_PRINCIPLES}\n\n"
        f"{ANTI_GENTRIFICATION_POLICY_GUARDRAILS}\n"
    )

    instructions = """
Draft a concise but detailed housing proposal that clearly explains:
- Site program (unit mix, tenure, and affordability levels).
- Governance/ownership model (with emphasis on CLTs and permanent affordability).
- Community benefits (e.g., open space, community facilities, local retail).
- Anti-displacement commitments and enforcement mechanisms.
- How the proposal advances a “safe, just, and thriving” neighborhood.

Formatting and style requirements:
- Use clear markdown headings and sub-headings for each major section.
- Do not mention that you are an AI model.
- Do not talk about prompts, tokens, or system messages.
- Do not include any content outside the proposal itself (no preamble or
  explanation of your reasoning).
""".strip()

    return "\n\n".join(
        [header, location, urban_informatics, goals, notes, constraints, instructions]
    )


def build_critic_prompt(draft: str, context: GreenTapeContext) -> str:
    """
    Prompt for the Community Board Simulator critic.
    """

    n = context.neighborhood
    header = (
        "You are a simulated New York City community board and local advocacy "
        "coalition. Your job is to rigorously review a proposed housing "
        "project from the perspective of long-term residents and small "
        "businesses.\n"
    )
    indicators = f"Use the following Everyday Peace-style indicators:\n{EVERYDAY_PEACE_INDICATORS}\n"

    instructions = """
Carefully read the proposal and then provide:
1. A short narrative summary (3–5 sentences) of community benefits and concerns.
2. A rating (0–100) for:
   - Displacement risk (higher = more risk).
   - Affordability depth and durability (higher = better).
   - Local business and street-level impact (higher = better).
3. A single overall community-alignment score (0–100).
4. 3–7 concrete recommendations to improve the proposal while centering
   long-term residents and local small businesses.

Response contract (CRITICAL):
- Respond ONLY with a single valid JSON object.
- Do not include Markdown, backticks, or any text before or after the JSON.
- Use this exact key set:
  - summary (string)
  - displacement_risk (string)
  - affordability_assessment (string)
  - local_business_impact (string)
  - overall_score (number between 0 and 100)
  - recommendations (array of short strings)
""".strip()

    proposal_section = f"--- PROPOSAL DRAFT START ---\n{draft}\n--- PROPOSAL DRAFT END ---"

    return "\n\n".join(
        [
            header,
            f"Neighborhood: {n.name}, {n.borough.code}",
            indicators,
            instructions,
            proposal_section,
        ]
    )


def build_optimizer_prompt(
    original_draft: str,
    feedback: CriticFeedback,
    context: GreenTapeContext,
) -> str:
    """
    Prompt that asks the primary agent to self-correct based on the critic.
    """

    header = (
        "You are Green-Tape revising your own proposal based on a rigorous "
        "community board review.\n"
    )

    fb_summary_lines = [
        "Community board feedback summary:",
        f"- Summary: {feedback.summary}",
        f"- Displacement risk: {feedback.displacement_risk}",
        f"- Affordability assessment: {feedback.affordability_assessment}",
        f"- Local business impact: {feedback.local_business_impact}",
        f"- Overall score: {feedback.overall_score}",
        f"- Recommendations: {', '.join(feedback.recommendations)}",
    ]
    fb_block = "\n".join(fb_summary_lines)

    instructions = """
Revise the proposal to directly respond to the community's concerns while
maintaining feasibility and zoning realism. Specifically:
- Reduce displacement risk and strengthen right-to-remain/return.
- Deepen affordability and prioritize CLT or similar structures.
- Enhance benefits for local small businesses and public space.

Formatting and style requirements:
- Preserve a clear, sectioned markdown structure.
- Make concrete, specific changes that address the feedback.
- Do not mention the existence of a critic or simulator.
- Return only the improved proposal text (structured markdown), not any
  explanation, analysis, or commentary.
""".strip()

    proposal_section = f"--- ORIGINAL PROPOSAL START ---\n{original_draft}\n--- ORIGINAL PROPOSAL END ---"

    return "\n\n".join([header, fb_block, instructions, proposal_section])


def parse_critic_output(payload: Dict[str, Any]) -> CriticFeedback:
    """
    Parse the critic's JSON response into a strongly-typed object.
    """

    return CriticFeedback(
        summary=str(payload.get("summary", "")),
        displacement_risk=str(payload.get("displacement_risk", "")),
        affordability_assessment=str(payload.get("affordability_assessment", "")),
        local_business_impact=str(payload.get("local_business_impact", "")),
        overall_score=float(payload.get("overall_score", 0.0)),
        recommendations=list(payload.get("recommendations", [])),
    )


def run_green_tape_pipeline(
    *,
    neighborhood: Neighborhood,
    lot_size_sqft: float,
    user_goal: str,
    additional_notes: str = "",
    max_iterations: int = 1,
) -> Dict[str, Any]:
    """
    High-level orchestration of the Green-Tape self-improvement loop.

    Returns a dictionary that is easy to serialize back to the frontend.
    """

    context = GreenTapeContext(
        neighborhood=neighborhood,
        lot_size_sqft=lot_size_sqft,
        user_goal=user_goal,
        additional_notes=additional_notes,
        site_context=get_neighborhood_site_context(neighborhood),
    )

    # Step 1: Draft generation
    gen_prompt = build_generation_prompt(context)
    try:
        draft_resp = call_llm(
            gen_prompt,
            system_prompt=(
                "You are Green-Tape, an expert New York City public-interest "
                "housing strategist. You always prioritize deeply affordable "
                "housing, community land trusts, and anti-displacement "
                "protections over luxury development. You write in clear, "
                "professional, grant-ready language."
            ),
            temperature=0.25,
            max_tokens=2000,
        )
        draft_text = draft_resp.text
    except LLMConfigurationError:
        # Helpful fallback for local dev when no key is configured.
        draft_text = (
            "[Green-Tape draft placeholder]\n\n"
            "LLM is not configured (no OPENAI_API_KEY / LLM_API_KEY). "
            "Configure an API key to enable real draft generation.\n\n"
            f"PROMPT SNIPPET:\n{gen_prompt[:800]}"
        )
    draft_result = DraftResult(draft_text=draft_text, prompt_used=gen_prompt)

    # Step 2: Critic evaluation
    critic_prompt = build_critic_prompt(draft_result.draft_text, context)
    try:
        critic_json = call_llm_json(
            critic_prompt,
            system_prompt=(
                "You simulate a New York City community board and advocacy "
                "coalition. You are strict about displacement, affordability, "
                "and local business impact. Always respond with a single valid "
                "JSON object that matches the requested schema."
            ),
            temperature=0.1,
            max_tokens=1200,
        )
        critic_feedback = parse_critic_output(critic_json)
        critic_raw = critic_json
    except (LLMConfigurationError, Exception) as exc:
        # Fall back to a neutral critic if the LLM is not available or JSON parsing fails.
        critic_feedback = CriticFeedback(
            summary="Fallback critic: unable to reach LLM or parse JSON.",
            displacement_risk="unknown",
            affordability_assessment="unknown",
            local_business_impact="unknown",
            overall_score=50.0,
            recommendations=[
                "Increase share of deeply affordable units.",
                "Center long-term residents with right-to-return policies.",
                "Reserve ground-floor space for local small businesses and community uses.",
            ],
        )
        critic_raw = {"error": str(exc)}

    # Step 3: Self-correction / optimization
    optimized_draft_text = draft_result.draft_text
    optimization_steps: List[Dict[str, Any]] = []

    for iteration in range(max_iterations):
        opt_prompt = build_optimizer_prompt(
            original_draft=optimized_draft_text,
            feedback=critic_feedback,
            context=context,
        )
        try:
            opt_resp = call_llm(
                opt_prompt,
                system_prompt=(
                    "You are Green-Tape revising your own New York City housing "
                    "proposal. You must strictly follow the critic feedback and "
                    "prioritize deeply affordable units, community land trusts, "
                    "and anti-displacement measures. Return only the improved "
                    "proposal text in markdown, with no extra commentary."
                ),
                temperature=0.25,
                max_tokens=2000,
            )
            improved_text = opt_resp.text
        except LLMConfigurationError:
            improved_text = (
                "[Green-Tape optimizer placeholder]\n\n"
                "LLM is not configured; returning previous draft unchanged.\n\n"
                f"PROMPT SNIPPET:\n{opt_prompt[:800]}"
            )
        optimization_steps.append(
            {
                "iteration": iteration + 1,
                "optimizer_prompt": opt_prompt,
                "improved_draft": improved_text,
            }
        )
        optimized_draft_text = improved_text

    return {
        "context": {
            "neighborhood_id": neighborhood.id,
            "neighborhood_name": neighborhood.name,
            "borough_code": neighborhood.borough.code,
            "borough_name": neighborhood.borough.name,
            "lot_size_sqft": lot_size_sqft,
            "user_goal": user_goal,
            "additional_notes": additional_notes,
        },
        "draft": {
            "text": draft_result.draft_text,
            "prompt": draft_result.prompt_used,
        },
        "critic": {
            "raw_text": critic_raw,
            "parsed": {
                "summary": critic_feedback.summary,
                "displacement_risk": critic_feedback.displacement_risk,
                "affordability_assessment": critic_feedback.affordability_assessment,
                "local_business_impact": critic_feedback.local_business_impact,
                "overall_score": critic_feedback.overall_score,
                "recommendations": critic_feedback.recommendations,
            },
        },
        "optimizer": {
            "final_draft": optimized_draft_text,
            "steps": optimization_steps,
        },
    }

