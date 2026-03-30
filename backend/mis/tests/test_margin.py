"""Unit tests for margin calculations."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.margin import calculate_margin


def test_basic_margin():
    result = calculate_margin(
        sheet_count=10,
        waste_pct=15.0,
        material_cost_per_sheet=5.0,
        print_time_hours=2.0,
        margin_target=0.35,
    )
    assert result["material_cost"] == 50.0
    assert result["waste_cost"] == 7.5  # 50 * 0.15
    assert result["labor_cost"] == 45.0  # 2h * 0.5 * 45/hr
    assert result["total_cost"] == 102.5
    assert result["recommended_price"] > result["total_cost"]
    assert abs(result["margin_pct"] - 35.0) < 0.1


def test_zero_waste():
    result = calculate_margin(
        sheet_count=5,
        waste_pct=0.0,
        material_cost_per_sheet=10.0,
        print_time_hours=1.0,
    )
    assert result["waste_cost"] == 0.0
    assert result["material_cost"] == 50.0


def test_explicit_labor():
    result = calculate_margin(
        sheet_count=1,
        waste_pct=10.0,
        material_cost_per_sheet=20.0,
        print_time_hours=1.0,
        labor_hours=3.0,
        margin_target=0.5,
    )
    assert result["labor_cost"] == 135.0  # 3h * 45
    assert abs(result["margin_pct"] - 50.0) < 0.1


def test_high_margin_target():
    result = calculate_margin(
        sheet_count=2,
        waste_pct=5.0,
        material_cost_per_sheet=8.0,
        print_time_hours=0.5,
        margin_target=0.80,
    )
    assert result["margin_pct"] > 79.0
    assert result["recommended_price"] > result["total_cost"] * 4


def test_percentage_margin_target():
    """Margin target > 1 should be treated as percentage."""
    r1 = calculate_margin(10, 10, 5.0, 2.0, margin_target=0.35)
    r2 = calculate_margin(10, 10, 5.0, 2.0, margin_target=35)
    assert abs(r1["recommended_price"] - r2["recommended_price"]) < 0.01
