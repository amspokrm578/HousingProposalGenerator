import os
import unittest
from unittest.mock import patch

from django.test import TestCase

from config.llm import LLMConfigurationError, call_llm, call_llm_json

HAVE_API_KEY = bool(os.environ.get("OPENAI_API_KEY") or os.environ.get("LLM_API_KEY"))


class LLMConfigurationErrorTest(TestCase):
    """No API key required — always runs."""

    def test_raises_when_no_key(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "", "LLM_API_KEY": ""}, clear=False):
            with self.assertRaises(LLMConfigurationError):
                call_llm("test")


@unittest.skipUnless(HAVE_API_KEY, "Set OPENAI_API_KEY to run live LLM tests")
class CallLLMLiveTest(TestCase):
    """Live tests — hit the real OpenAI API."""

    def test_returns_non_empty_text(self):
        response = call_llm("Say only the word hello.", max_tokens=10)
        self.assertIsInstance(response.text, str)
        self.assertGreater(len(response.text.strip()), 0)

    def test_system_prompt_honoured(self):
        response = call_llm(
            "What is 2 + 2?",
            system_prompt="Respond with only the numeric answer, nothing else.",
            max_tokens=10,
        )
        self.assertIn("4", response.text)

    def test_json_call_returns_dict(self):
        result = call_llm_json(
            'Return a JSON object with a single key "status" whose value is "ok".',
            system_prompt="You must respond with only valid JSON. No markdown, no backticks.",
            max_tokens=50,
        )
        self.assertIsInstance(result, dict)
        self.assertEqual(result.get("status"), "ok")

    def test_json_extraction_strips_markdown(self):
        """call_llm_json should find the JSON object even if the model wraps it in markdown."""
        result = call_llm_json(
            'Return exactly this JSON: {"answer": 42}',
            max_tokens=50,
        )
        self.assertIn("answer", result)
        self.assertEqual(int(result["answer"]), 42)


@unittest.skipUnless(
    HAVE_API_KEY and os.environ.get("GREEN_TAPE_LIVE_TEST"),
    "Set OPENAI_API_KEY and GREEN_TAPE_LIVE_TEST=1 to run the full pipeline test (3 LLM calls)",
)
class GreenTapePipelineLiveTest(TestCase):
    """
    Runs the full 3-step draft → critic → optimizer pipeline.
    Gated behind GREEN_TAPE_LIVE_TEST=1 because it makes 3 API calls.
    """

    def test_pipeline_returns_expected_shape(self):
        from proposals.models import Borough, Neighborhood
        from proposals.agents import run_green_tape_pipeline

        borough, _ = Borough.objects.get_or_create(name="Brooklyn", defaults={"code": "BK"})
        neighborhood, _ = Neighborhood.objects.get_or_create(
            borough=borough,
            name="Williamsburg",
            defaults={"latitude": "40.708", "longitude": "-73.957", "area_sq_miles": "1.26"},
        )

        result = run_green_tape_pipeline(
            neighborhood=neighborhood,
            lot_size_sqft=10000,
            user_goal="Maximize deeply affordable units for existing residents.",
            max_iterations=1,
        )

        self.assertIn("draft", result)
        self.assertIsInstance(result["draft"]["text"], str)
        self.assertGreater(len(result["draft"]["text"]), 100)

        self.assertIn("critic", result)
        parsed = result["critic"]["parsed"]
        self.assertIn("summary", parsed)
        self.assertIsInstance(parsed["overall_score"], float)
        self.assertIsInstance(parsed["recommendations"], list)

        self.assertIn("optimizer", result)
        self.assertIsInstance(result["optimizer"]["final_draft"], str)
        self.assertGreater(len(result["optimizer"]["final_draft"]), 100)
