"""Shared fixtures and factories for the magnet manufacturing test suite."""

import sys
import os
import pytest
from pathlib import Path

# Add backend paths so imports work
BACKEND_ROOT = Path(__file__).resolve().parent.parent / "backend"
for subdir in ["nesting", "prepress", "mis"]:
    p = str(BACKEND_ROOT / subdir)
    if p not in sys.path:
        sys.path.insert(0, p)


# ---------------------------------------------------------------------------
# Nesting fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def sheet_config():
    from models import SheetConfig
    return SheetConfig(width=610.0, height=914.0)


@pytest.fixture
def small_sheet():
    from models import SheetConfig
    return SheetConfig(width=100.0, height=100.0)


@pytest.fixture
def sample_rectangles():
    from models import Shape, ShapeType
    return [
        Shape(id="rect1", type=ShapeType.RECTANGLE, width=50, height=30, quantity=10),
        Shape(id="rect2", type=ShapeType.RECTANGLE, width=80, height=40, quantity=5),
    ]


@pytest.fixture
def single_shape():
    from models import Shape, ShapeType
    return [Shape(id="solo", type=ShapeType.RECTANGLE, width=100, height=50, quantity=1)]


@pytest.fixture
def circle_shapes():
    from models import Shape, ShapeType
    return [Shape(id="circ1", type=ShapeType.CIRCLE, radius=25, quantity=8)]


@pytest.fixture
def polygon_shapes():
    from models import Shape, ShapeType
    return [
        Shape(
            id="tri1",
            type=ShapeType.POLYGON,
            vertices=[[0, 0], [60, 0], [30, 50]],
            quantity=4,
        )
    ]


# ---------------------------------------------------------------------------
# Pre-press fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_rgba_image():
    """Create a simple 100x100 RGBA image with a white circle on transparent bg."""
    import numpy as np
    from PIL import Image
    import io

    img = np.zeros((100, 100, 4), dtype=np.uint8)
    # Draw a filled white circle
    for y in range(100):
        for x in range(100):
            if (x - 50) ** 2 + (y - 50) ** 2 <= 40 ** 2:
                img[y, x] = [255, 255, 255, 255]
    pil = Image.fromarray(img, "RGBA")
    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# MIS fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def margin_params():
    return {
        "sheet_count": 5,
        "waste_pct": 15.0,
        "material_cost_per_sheet": 12.0,
        "print_time_hours": 2.0,
        "labor_hours": 1.5,
        "margin_target": 0.35,
    }
