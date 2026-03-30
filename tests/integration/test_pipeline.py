"""Integration tests: full pipeline from upload → prepress → nesting → route."""

import sys
from pathlib import Path

# Add backend paths
BACKEND = Path(__file__).resolve().parent.parent.parent / "backend"
for sub in ["prepress", "nesting", "mis"]:
    sys.path.insert(0, str(BACKEND / sub))

import io
import pytest
import numpy as np
from PIL import Image
from unittest.mock import AsyncMock, patch, MagicMock


def _create_test_image(w=200, h=150):
    """Create a simple test image with a rectangle object."""
    img = np.zeros((h + 40, w + 40, 4), dtype=np.uint8)
    img[20:20+h, 20:20+w] = [255, 0, 0, 255]  # red rectangle
    pil = Image.fromarray(img, "RGBA")
    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    return buf.getvalue()


class TestFullPipeline:
    """Integration test: image → prepress → nesting."""

    def test_image_to_contour_to_nesting(self):
        """Upload image → detect contour → get dimensions → nest."""
        from pipeline import detect_contour, _px_to_mm
        from engine import nest
        from models import Shape, ShapeType, SheetConfig

        image_data = _create_test_image(200, 150)

        # Step 1: Pre-press — detect contour and get dimensions
        contour = detect_contour(image_data)
        assert contour.area > 0

        x, y, w, h = contour.bbox
        dpi = 300
        width_mm = _px_to_mm(w, dpi)
        height_mm = _px_to_mm(h, dpi)
        assert width_mm > 0
        assert height_mm > 0

        # Step 2: Create nesting shape from pre-press output
        shapes = [
            Shape(
                id="magnet-001",
                type=ShapeType.RECTANGLE,
                width=width_mm,
                height=height_mm,
                quantity=10,
            )
        ]

        # Step 3: Nest
        sheet = SheetConfig(width=610, height=914)
        result = nest(shapes, sheet, spacing=2.0)
        assert result.total_sheets >= 1
        total_placed = sum(len(s.placements) for s in result.sheets)
        assert total_placed == 10

    def test_prepress_bleed_then_nest(self):
        """Full flow: remove bg → contour → bleed → cutline SVG → nest."""
        from pipeline import detect_contour, generate_bleed, generate_cutline_svg, _px_to_mm
        from engine import nest, verify_no_overlap
        from models import Shape, ShapeType, SheetConfig

        image_data = _create_test_image(180, 120)

        # Pre-press
        contour = detect_contour(image_data)
        bleed_img = generate_bleed(image_data, contour, bleed_mm=2.0, dpi=300)
        svg = generate_cutline_svg(contour, dpi=300, bleed_mm=2.0)

        assert len(bleed_img) > 0
        assert "<svg" in svg

        # Convert to nesting input
        x, y, w, h = contour.bbox
        width_mm = _px_to_mm(w, 300)
        height_mm = _px_to_mm(h, 300)

        shapes = [
            Shape(id="custom-magnet", type=ShapeType.RECTANGLE,
                  width=width_mm, height=height_mm, quantity=20)
        ]
        result = nest(shapes, SheetConfig(), spacing=2.0)
        assert result.total_sheets >= 1

        # Verify no overlaps
        for sheet in result.sheets:
            assert verify_no_overlap(sheet.placements, spacing=2.0)

    def test_nesting_to_margin_calculation(self):
        """Nest shapes → calculate margin from result."""
        from engine import nest
        from models import Shape, ShapeType, SheetConfig
        from services.margin import calculate_margin

        shapes = [
            Shape(id="prod1", type=ShapeType.RECTANGLE, width=50, height=30, quantity=50),
        ]
        result = nest(shapes, SheetConfig(), spacing=2.0)

        # Use nesting output for margin calc
        margin = calculate_margin(
            sheet_count=result.total_sheets,
            waste_pct=result.total_waste_pct,
            material_cost_per_sheet=12.0,
            print_time_hours=result.total_sheets * 0.5,
        )

        assert margin["total_cost"] > 0
        assert margin["recommended_price"] > margin["total_cost"]
        assert margin["margin_pct"] > 0


class TestPipelineEdgeCases:
    def test_single_large_magnet(self):
        """Single large magnet through pipeline."""
        from pipeline import detect_contour, _px_to_mm
        from engine import nest
        from models import Shape, ShapeType, SheetConfig

        image_data = _create_test_image(400, 300)
        contour = detect_contour(image_data)
        x, y, w, h = contour.bbox

        shapes = [
            Shape(id="jumbo", type=ShapeType.RECTANGLE,
                  width=_px_to_mm(w, 300), height=_px_to_mm(h, 300), quantity=1)
        ]
        result = nest(shapes, SheetConfig(), spacing=2.0)
        assert result.total_sheets == 1

    def test_many_small_magnets(self):
        """Many small magnets — high volume test."""
        from engine import nest
        from models import Shape, ShapeType, SheetConfig

        shapes = [
            Shape(id="mini", type=ShapeType.RECTANGLE, width=25, height=15, quantity=200),
        ]
        result = nest(shapes, SheetConfig(), spacing=2.0)
        total_placed = sum(len(s.placements) for s in result.sheets)
        assert total_placed == 200
