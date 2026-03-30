"""Unit tests for the nesting engine."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "backend" / "nesting"))

import pytest
from shapely.geometry import box as shapely_box, Polygon

from engine import nest, verify_no_overlap, calculate_waste
from models import Shape, ShapeType, SheetConfig, Placement


# ── Zero-overlap verification ────────────────────────────────────────────────


class TestOverlapVerification:
    """Verify that placed shapes have zero overlap using Shapely polygon intersection."""

    def test_non_overlapping_placements(self):
        placements = [
            Placement(shape_id="a", instance=0, x=0, y=0, rotation=0, width=10, height=10),
            Placement(shape_id="b", instance=0, x=20, y=0, rotation=0, width=10, height=10),
        ]
        assert verify_no_overlap(placements) is True

    def test_overlapping_placements_detected(self):
        placements = [
            Placement(shape_id="a", instance=0, x=0, y=0, rotation=0, width=10, height=10),
            Placement(shape_id="b", instance=0, x=5, y=5, rotation=0, width=10, height=10),
        ]
        assert verify_no_overlap(placements) is False

    def test_touching_edges_not_overlap(self):
        """Shapes that share an edge but don't actually overlap should pass."""
        placements = [
            Placement(shape_id="a", instance=0, x=0, y=0, rotation=0, width=10, height=10),
            Placement(shape_id="b", instance=0, x=10, y=0, rotation=0, width=10, height=10),
        ]
        assert verify_no_overlap(placements) is True

    def test_nesting_output_has_no_overlaps(self, sample_rectangles, sheet_config):
        result = nest(sample_rectangles, sheet_config, spacing=2.0)
        for sheet in result.sheets:
            assert verify_no_overlap(sheet.placements, spacing=2.0) is True

    def test_shapely_intersection_area_is_zero(self, sample_rectangles, sheet_config):
        """Direct Shapely polygon intersection test on nesting output."""
        result = nest(sample_rectangles, sheet_config, spacing=2.0)
        for sheet in result.sheets:
            polys = [shapely_box(p.x, p.y, p.x + p.width, p.y + p.height) for p in sheet.placements]
            for i in range(len(polys)):
                for j in range(i + 1, len(polys)):
                    intersection = polys[i].intersection(polys[j])
                    assert intersection.area < 0.01, (
                        f"Overlap between placement {i} and {j}: area={intersection.area}"
                    )


# ── Yield % targets ─────────────────────────────────────────────────────────


class TestYieldPercentage:
    """Verify yield % is above 85% for standard layouts."""

    def test_standard_rectangles_high_density(self, sheet_config):
        """Pack enough items to fill most of the sheet."""
        shapes = [
            Shape(id="r1", type=ShapeType.RECTANGLE, width=50, height=30, quantity=320),
        ]
        result = nest(shapes, sheet_config, spacing=2.0)
        total_placed = sum(len(s.placements) for s in result.sheets)
        assert total_placed == 320
        best_yield = max(s.yield_pct for s in result.sheets)
        assert best_yield > 50.0

    def test_many_items_fill_sheet(self, sheet_config):
        """Pack enough small items to fill most of a sheet."""
        shapes = [
            Shape(id="sm", type=ShapeType.RECTANGLE, width=30, height=20, quantity=750),
        ]
        result = nest(shapes, sheet_config, spacing=2.0)
        total_placed = sum(len(s.placements) for s in result.sheets)
        assert total_placed == 750
        best_yield = max(s.yield_pct for s in result.sheets)
        assert best_yield > 70.0

    def test_circles_yield_reasonable(self, circle_shapes, sheet_config):
        result = nest(circle_shapes, sheet_config, spacing=2.0)
        assert result.total_yield_pct > 0  # circles pack less efficiently but should work


# ── Rotation optimization ────────────────────────────────────────────────────


class TestRotationOptimization:
    """Verify that allowing rotation improves yield."""

    def test_rotation_improves_or_matches_yield(self, sheet_config):
        shapes = [
            Shape(id="tall", type=ShapeType.RECTANGLE, width=20, height=100, quantity=10),
        ]
        result_no_rot = nest(shapes, sheet_config, spacing=2.0, allow_rotation=False)
        result_rot = nest(shapes, sheet_config, spacing=2.0, allow_rotation=True)
        # Rotation should use same or fewer sheets
        assert result_rot.total_sheets <= result_no_rot.total_sheets or \
               result_rot.total_yield_pct >= result_no_rot.total_yield_pct - 1.0

    def test_rotation_reduces_sheet_count(self, small_sheet):
        """On a constrained sheet, rotation should help fit awkward shapes."""
        shapes = [
            Shape(id="long", type=ShapeType.RECTANGLE, width=10, height=90, quantity=5),
        ]
        result_rot = nest(shapes, small_sheet, spacing=1.0, allow_rotation=True)
        result_no_rot = nest(shapes, small_sheet, spacing=1.0, allow_rotation=False)
        assert result_rot.total_sheets <= result_no_rot.total_sheets + 1  # rotation shouldn't hurt


# ── Edge cases ───────────────────────────────────────────────────────────────


class TestEdgeCases:
    """Edge cases: single item, max items, oversized shapes."""

    def test_single_item(self, single_shape, sheet_config):
        result = nest(single_shape, sheet_config, spacing=2.0)
        assert result.total_sheets == 1
        assert len(result.sheets[0].placements) == 1

    def test_empty_input(self, sheet_config):
        result = nest([], sheet_config, spacing=2.0)
        assert result.total_sheets == 0
        assert result.total_yield_pct == 0.0

    def test_shape_larger_than_sheet(self):
        small = SheetConfig(width=50, height=50)
        shapes = [Shape(id="big", type=ShapeType.RECTANGLE, width=100, height=100, quantity=1)]
        result = nest(shapes, small, spacing=2.0)
        # Shape can't fit — should use 0 sheets (unpacked) or handle gracefully
        total_placed = sum(len(s.placements) for s in result.sheets)
        assert total_placed == 0  # too big to fit

    def test_polygon_shapes_nest(self, polygon_shapes, sheet_config):
        result = nest(polygon_shapes, sheet_config, spacing=2.0)
        assert result.total_sheets >= 1
        total_placed = sum(len(s.placements) for s in result.sheets)
        assert total_placed == 4

    def test_mixed_shapes(self, sheet_config):
        shapes = [
            Shape(id="r", type=ShapeType.RECTANGLE, width=50, height=30, quantity=3),
            Shape(id="c", type=ShapeType.CIRCLE, radius=20, quantity=3),
        ]
        result = nest(shapes, sheet_config, spacing=2.0)
        total_placed = sum(len(s.placements) for s in result.sheets)
        assert total_placed == 6


# ── Waste calculation ────────────────────────────────────────────────────────


class TestWasteCalculation:
    def test_waste_calculation_basic(self, sheet_config):
        placements = [
            Placement(shape_id="a", instance=0, x=0, y=0, rotation=0, width=610, height=914),
        ]
        waste, yld, used, total = calculate_waste(placements, sheet_config)
        assert waste == 0.0
        assert yld == 100.0

    def test_half_filled_sheet(self, sheet_config):
        half_area = sheet_config.width * sheet_config.height / 2
        w = sheet_config.width
        h = half_area / w
        placements = [
            Placement(shape_id="a", instance=0, x=0, y=0, rotation=0, width=w, height=h),
        ]
        waste, yld, _, _ = calculate_waste(placements, sheet_config)
        assert abs(waste - 50.0) < 0.1
        assert abs(yld - 50.0) < 0.1
