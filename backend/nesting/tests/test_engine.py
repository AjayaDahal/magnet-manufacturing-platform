"""Tests for the nesting engine — verifies zero overlap and correctness."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from shapely.geometry import box as shapely_box

from models import Shape, ShapeType, SheetConfig, Placement
from engine import nest, calculate_waste, verify_no_overlap


def _no_overlap(placements: list[Placement], tolerance: float = 0.01) -> bool:
    """Independent overlap check using shapely polygon intersection."""
    polys = [shapely_box(p.x, p.y, p.x + p.width, p.y + p.height) for p in placements]
    for i in range(len(polys)):
        for j in range(i + 1, len(polys)):
            inter = polys[i].intersection(polys[j])
            if inter.area > tolerance:
                return False
    return True


class TestRectanglePacking:
    def test_single_rect(self):
        shapes = [Shape(id="a", type=ShapeType.RECTANGLE, width=100, height=50)]
        result = nest(shapes, SheetConfig())
        assert result.total_sheets == 1
        assert len(result.sheets[0].placements) == 1

    def test_multiple_rects_no_overlap(self):
        shapes = [
            Shape(id="a", type=ShapeType.RECTANGLE, width=100, height=50, quantity=5),
            Shape(id="b", type=ShapeType.RECTANGLE, width=80, height=80, quantity=3),
        ]
        result = nest(shapes, SheetConfig(width=610, height=914), spacing=2.0)
        all_placements = []
        for s in result.sheets:
            all_placements.extend(s.placements)
        assert len(all_placements) == 8
        assert _no_overlap(all_placements)

    def test_fill_sheet_no_overlap(self):
        """Pack many small items — must not overlap."""
        shapes = [Shape(id="sm", type=ShapeType.RECTANGLE, width=50, height=30, quantity=20)]
        result = nest(shapes, SheetConfig(width=300, height=300), spacing=1.0)
        for s in result.sheets:
            assert _no_overlap(s.placements)

    def test_items_within_sheet_bounds(self):
        sheet = SheetConfig(width=200, height=200)
        shapes = [Shape(id="r", type=ShapeType.RECTANGLE, width=60, height=40, quantity=4)]
        result = nest(shapes, sheet, spacing=2.0)
        for s in result.sheets:
            for p in s.placements:
                assert p.x >= 0
                assert p.y >= 0
                assert p.x + p.width <= sheet.width + 0.1
                assert p.y + p.height <= sheet.height + 0.1


class TestCirclePacking:
    def test_circles_no_overlap(self):
        shapes = [Shape(id="c", type=ShapeType.CIRCLE, radius=25, quantity=6)]
        result = nest(shapes, SheetConfig(width=300, height=300), spacing=2.0)
        for s in result.sheets:
            assert _no_overlap(s.placements)


class TestPolygonPacking:
    def test_custom_polygon(self):
        # Triangle
        shapes = [Shape(id="tri", type=ShapeType.POLYGON,
                        vertices=[[0, 0], [60, 0], [30, 50]], quantity=3)]
        result = nest(shapes, SheetConfig(width=300, height=300), spacing=2.0)
        for s in result.sheets:
            assert _no_overlap(s.placements)
            assert len(s.placements) == 3


class TestWasteCalculation:
    def test_waste(self):
        placements = [
            Placement(shape_id="a", instance=0, x=0, y=0, rotation=0, width=100, height=100),
        ]
        sheet = SheetConfig(width=200, height=200)
        waste, yld, used, total = calculate_waste(placements, sheet)
        assert total == 40000.0
        assert used == 10000.0
        assert waste == 75.0
        assert yld == 25.0


class TestVerifyNoOverlap:
    def test_no_overlap_true(self):
        placements = [
            Placement(shape_id="a", instance=0, x=0, y=0, rotation=0, width=50, height=50),
            Placement(shape_id="b", instance=0, x=60, y=0, rotation=0, width=50, height=50),
        ]
        assert verify_no_overlap(placements)

    def test_overlap_detected(self):
        placements = [
            Placement(shape_id="a", instance=0, x=0, y=0, rotation=0, width=50, height=50),
            Placement(shape_id="b", instance=0, x=25, y=25, rotation=0, width=50, height=50),
        ]
        assert not verify_no_overlap(placements)


class TestEngineVerifyIntegration:
    def test_engine_output_passes_verify(self):
        """The engine's output must always pass the independent overlap check."""
        shapes = [
            Shape(id="x", type=ShapeType.RECTANGLE, width=120, height=60, quantity=4),
            Shape(id="y", type=ShapeType.CIRCLE, radius=30, quantity=3),
            Shape(id="z", type=ShapeType.POLYGON,
                  vertices=[[0, 0], [80, 0], [80, 40], [0, 40]], quantity=2),
        ]
        result = nest(shapes, SheetConfig(width=610, height=914), spacing=3.0)
        for s in result.sheets:
            assert verify_no_overlap(s.placements, spacing=0.0)
            assert _no_overlap(s.placements)
