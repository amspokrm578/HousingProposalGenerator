from unittest.mock import MagicMock, patch

from django.test import TestCase

from proposals.tasks import calculate_feasibility_score, generate_financial_projections


class CalculateFeasibilityScoreTest(TestCase):
    @patch("proposals.tasks.connection")
    def test_calls_stored_procedure(self, mock_conn):
        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = (85.50,)
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

        result = calculate_feasibility_score(proposal_id=1)

        mock_cursor.execute.assert_called_once_with(
            "EXEC sp_CalculateFeasibilityScore @proposal_id = %s", [1]
        )
        self.assertEqual(result["proposal_id"], 1)
        self.assertEqual(result["feasibility_score"], "85.50")


class GenerateFinancialProjectionsTest(TestCase):
    @patch("proposals.tasks.connection")
    def test_calls_stored_procedure(self, mock_conn):
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

        result = generate_financial_projections(proposal_id=42, years=10)

        mock_cursor.execute.assert_called_once_with(
            "EXEC sp_GenerateFinancialProjections @proposal_id = %s, @projection_years = %s",
            [42, 10],
        )
        self.assertEqual(result["proposal_id"], 42)
        self.assertEqual(result["years"], 10)
