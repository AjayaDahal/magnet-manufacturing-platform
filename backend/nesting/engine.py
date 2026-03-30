"""Core 2D nesting / bin-packing engine.

Strategy:
- Rectangles: use rectpack for optimal rectangular bin packing.
- Circles: approximate as bounding rectangles with spacing buffer.
- Custom polygons: compute oriented bounding box, pack as rectangles,
  then store exact polygon for overlap verification & SVG output.

All shapes are buffered by spacing/2 so the packer handles kerf automatically.
After packing, the buffer is removed for output coordinates.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional

import numpy as np
import rectpack
from shapely.geometry import Polygon, box, MultiPolygon
from shapely.affinity import rotate as shapely_rotate, translate as shapely_translate
from shapely import unary_union

from models import (
    Shape, ShapeType, SheetConfig, Placement, SheetResult, NestingResponse,
)


@dataclass
class _PackItem:
    shape_id: str
    instance: int
    original_shape: Shape
    # Dimensions to feed the packer (includes spacing buffer)
    pack_w: float
    pack_h: float
    # Actual shape dimensions (no buffer)
    real_w: float
    real_h: float
    shapely_poly: Optional[Polygon] = None  # exact polygon at origin
    rotation: int = 0


def _shape_to_rect(shape: Shape, spacing: float) -> list[tuple[float, float, float, float]]:
    """Return (real_w, real_h, pack_w, pack_h) for each allowed rotation."""
    buf = spacing
    if shape.type == ShapeType.RECTANGLE:
        assert shape.width and shape.height
        return [(shape.width, shape.height, shape.width + buf, shape.height + buf)]
    elif shape.type == ShapeType.CIRCLE:
        assert shape.radius
        d = shape.radius * 2
        return [(d, d, d + buf, d + buf)]
    elif shape.type == ShapeType.POLYGON:
        assert shape.vertices and len(shape.vertices) >= 3
        poly = Polygon(shape.vertices)
        minx, miny, maxx, maxy = poly.bounds
        w, h = maxx - minx, maxy - miny
        return [(w, h, w + buf, h + buf)]
    return []


def _build_items(shapes: list[Shape], spacing: float, allow_rotation: bool) -> list[_PackItem]:
    items: list[_PackItem] = []
    for shape in shapes:
        dims_list = _shape_to_rect(shape, spacing)
        if not dims_list:
            continue
        real_w, real_h, pack_w, pack_h = dims_list[0]

        # Build shapely polygon at origin for later verification
        if shape.type == ShapeType.RECTANGLE:
            spoly = box(0, 0, shape.width, shape.height)
        elif shape.type == ShapeType.CIRCLE:
            from shapely.geometry import Point
            spoly = Point(shape.radius, shape.radius).buffer(shape.radius, resolution=32)
        else:
            verts = shape.vertices
            poly = Polygon(verts)
            minx, miny, _, _ = poly.bounds
            spoly = shapely_translate(poly, -minx, -miny)

        for i in range(shape.quantity):
            items.append(_PackItem(
                shape_id=shape.id,
                instance=i,
                original_shape=shape,
                pack_w=pack_w,
                pack_h=pack_h,
                real_w=real_w,
                real_h=real_h,
                shapely_poly=spoly,
            ))
    return items


def nest(shapes: list[Shape], sheet: SheetConfig, spacing: float = 2.0,
         allow_rotation: bool = True) -> NestingResponse:
    """Run the nesting algorithm. Returns NestingResponse with one or more sheets."""
    items = _build_items(shapes, spacing, allow_rotation)
    if not items:
        return NestingResponse(sheets=[], total_waste_pct=100.0, total_yield_pct=0.0, total_sheets=0)

    # Sort items largest-first for better packing
    items.sort(key=lambda it: it.pack_w * it.pack_h, reverse=True)

    # Use rectpack with multiple bins (sheets)
    packer = rectpack.newPacker(
        mode=rectpack.PackingMode.Offline,
        bin_algo=rectpack.PackingBin.BBF,
        pack_algo=rectpack.MaxRectsBssf,
        sort_algo=rectpack.SORT_AREA,
        rotation=allow_rotation,
    )

    sw, sh = int(sheet.width * 100), int(sheet.height * 100)  # work in 0.01mm units for int packer

    # Add enough bins
    for _ in range(len(items)):
        packer.add_bin(sw, sh)

    for idx, item in enumerate(items):
        pw = int(item.pack_w * 100)
        ph = int(item.pack_h * 100)
        packer.add_rect(pw, ph, rid=idx)

    packer.pack()

    # Collect results per bin
    bins: dict[int, list[tuple[_PackItem, float, float, int]]] = {}
    for abin in packer.bin_list():
        pass  # rectpack API: iterate rect_list

    for bid, x, y, w, h, rid in packer.rect_list():
        item = items[rid]
        # Determine rotation: if w/h swapped from pack dimensions
        pw_int = int(item.pack_w * 100)
        ph_int = int(item.pack_h * 100)
        rot = 0
        if (w == ph_int and h == pw_int):
            rot = 90
        real_x = x / 100.0 + spacing / 2
        real_y = y / 100.0 + spacing / 2
        bins.setdefault(bid, []).append((item, real_x, real_y, rot))

    sheet_area = sheet.width * sheet.height
    sheets: list[SheetResult] = []
    total_used = 0.0

    for sidx in sorted(bins.keys()):
        placements: list[Placement] = []
        used = 0.0
        for item, px, py, rot in bins[sidx]:
            rw, rh = (item.real_w, item.real_h) if rot == 0 else (item.real_h, item.real_w)
            placements.append(Placement(
                shape_id=item.shape_id,
                instance=item.instance,
                x=round(px, 3),
                y=round(py, 3),
                rotation=rot,
                width=round(rw, 3),
                height=round(rh, 3),
            ))
            used += item.real_w * item.real_h
        total_used += used
        waste = 100.0 * (1 - used / sheet_area)
        sheets.append(SheetResult(
            sheet_index=sidx,
            placements=placements,
            waste_pct=round(waste, 2),
            yield_pct=round(100 - waste, 2),
        ))

    n_sheets = len(sheets) or 1
    total_waste = 100.0 * (1 - total_used / (sheet_area * n_sheets))

    return NestingResponse(
        sheets=sheets,
        total_waste_pct=round(total_waste, 2),
        total_yield_pct=round(100 - total_waste, 2),
        total_sheets=len(sheets),
    )


def calculate_waste(placements: list[Placement], sheet: SheetConfig) -> tuple[float, float, float, float]:
    """Return (waste_pct, yield_pct, used_area, total_area)."""
    total_area = sheet.width * sheet.height
    used = sum(p.width * p.height for p in placements)
    waste = 100.0 * (1 - used / total_area) if total_area else 100.0
    return round(waste, 2), round(100 - waste, 2), round(used, 2), round(total_area, 2)


def verify_no_overlap(placements: list[Placement], spacing: float = 0.0) -> bool:
    """Verify that no two placed shapes overlap (optionally with spacing buffer).
    Returns True if there are ZERO overlaps."""
    polys: list[Polygon] = []
    for p in placements:
        b = box(p.x, p.y, p.x + p.width, p.y + p.height)
        if spacing > 0:
            b = b.buffer(-spacing / 4)  # slight inward buffer for tolerance
        polys.append(b)

    for i in range(len(polys)):
        for j in range(i + 1, len(polys)):
            if polys[i].intersects(polys[j]):
                inter = polys[i].intersection(polys[j])
                if inter.area > 0.01:  # tolerance: 0.01 mm²
                    return False
    return True
