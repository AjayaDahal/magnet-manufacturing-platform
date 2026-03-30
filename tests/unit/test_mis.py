"""Unit tests for the MIS margin and pricing service."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "backend" / "mis"))

import pytest
from unittest.mock import patch
from services.margin import calculate_margin


# ── Gross margin formula ─────────────────────────────────────────────────────


class TestGrossMarginFormula:
    """Verify: gross_margin = (revenue - COGS) / revenue."""

    def test_margin_formula_correct(self, margin_params):
        result = calculate_margin(**margin_params)
        price = result["recommended_price"]
        cost = result["total_cost"]
        expected_margin = (price - cost) / price * 100
        assert abs(result["margin_pct"] - expected_margin) < 0.1

    def test_margin_target_35_pct(self, margin_params):
        result = calculate_margin(**margin_params)
        assert abs(result["margin_pct"] - 35.0) < 0.5

    def test_margin_target_50_pct(self):
        result = calculate_margin(
            sheet_count=3,
            waste_pct=10.0,
            material_cost_per_sheet=10.0,
            print_time_hours=1.0,
            labor_hours=1.0,
            margin_target=0.50,
        )
        assert abs(result["margin_pct"] - 50.0) < 0.5

    def test_cost_components_sum(self, margin_params):
        result = calculate_margin(**margin_params)
        expected_total = result["material_cost"] + result["waste_cost"] + result["labor_cost"]
        assert abs(result["total_cost"] - expected_total) < 0.01

    def test_price_higher_than_cost(self, margin_params):
        result = calculate_margin(**margin_params)
        assert result["recommended_price"] > result["total_cost"]


# ── Price calculation with quantity tiers ────────────────────────────────────


class TestPriceTiers:
    """Test pricing scales with quantity."""

    def test_more_sheets_higher_cost(self):
        r1 = calculate_margin(sheet_count=1, waste_pct=10, material_cost_per_sheet=10,
                               print_time_hours=1)
        r5 = calculate_margin(sheet_count=5, waste_pct=10, material_cost_per_sheet=10,
                               print_time_hours=1)
        assert r5["total_cost"] > r1["total_cost"]
        assert r5["recommended_price"] > r1["recommended_price"]

    def test_higher_waste_higher_cost(self):
        r_low = calculate_margin(sheet_count=3, waste_pct=5, material_cost_per_sheet=10,
                                  print_time_hours=1)
        r_high = calculate_margin(sheet_count=3, waste_pct=40, material_cost_per_sheet=10,
                                   print_time_hours=1)
        assert r_high["total_cost"] > r_low["total_cost"]

    def test_material_cost_scales(self):
        r_cheap = calculate_margin(sheet_count=5, waste_pct=10, material_cost_per_sheet=5,
                                    print_time_hours=1)
        r_pricey = calculate_margin(sheet_count=5, waste_pct=10, material_cost_per_sheet=25,
                                     print_time_hours=1)
        assert r_pricey["material_cost"] == 5 * r_cheap["material_cost"]


# ── Edge cases ───────────────────────────────────────────────────────────────


class TestEdgeCases:
    """Edge cases: zero waste, 100% waste, etc."""

    def test_zero_waste(self):
        result = calculate_margin(
            sheet_count=1,
            waste_pct=0.0,
            material_cost_per_sheet=10.0,
            print_time_hours=1.0,
        )
        assert result["waste_cost"] == 0.0
        assert result["total_cost"] > 0  # still has material + labor

    def test_100_pct_waste(self):
        result = calculate_margin(
            sheet_count=1,
            waste_pct=100.0,
            material_cost_per_sheet=10.0,
            print_time_hours=1.0,
        )
        assert result["waste_cost"] == 10.0  # 100% of material cost
        assert result["total_cost"] > result["material_cost"]

    def test_zero_sheets(self):
        result = calculate_margin(
            sheet_count=0,
            waste_pct=10.0,
            material_cost_per_sheet=10.0,
            print_time_hours=1.0,
        )
        assert result["material_cost"] == 0.0

    def test_margin_target_as_percentage(self):
        """Margin target > 1.0 should be treated as percentage (e.g. 35 → 0.35)."""
        result = calculate_margin(
            sheet_count=3,
            waste_pct=10.0,
            material_cost_per_sheet=10.0,
            print_time_hours=1.0,
            margin_target=35,  # should be treated as 35%
        )
        assert abs(result["margin_pct"] - 35.0) < 0.5

    def test_all_results_non_negative(self, margin_params):
        result = calculate_margin(**margin_params)
        for key, value in result.items():
            assert value >= 0, f"{key} should be non-negative, got {value}"

    def test_labor_defaults_from_print_time(self):
        """When labor_hours=0, should default to print_time * 0.5."""
        result = calculate_margin(
            sheet_count=2,
            waste_pct=10.0,
            material_cost_per_sheet=10.0,
            print_time_hours=4.0,
            labor_hours=0.0,
        )
        # labor should be 4.0 * 0.5 * labor_rate
        assert result["labor_cost"] > 0
