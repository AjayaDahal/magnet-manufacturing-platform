"""SVG and PDF output generation for nested layouts."""

from __future__ import annotations
import io
import math

import svgwrite
from reportlab.lib.pagesizes import landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as pdf_canvas

from models import Placement, SheetConfig, SheetResult


def generate_svg(sheet: SheetConfig, placements: list[Placement], scale: float = 1.0) -> str:
    """Generate an SVG string showing the nested layout."""
    sw, sh = sheet.width * scale, sheet.height * scale
    dwg = svgwrite.Drawing(size=(f"{sw}px", f"{sh}px"), viewBox=f"0 0 {sheet.width} {sheet.height}")

    # Sheet outline
    dwg.add(dwg.rect(insert=(0, 0), size=(sheet.width, sheet.height),
                      fill="white", stroke="black", stroke_width=0.5))

    colors = ["#4CAF50", "#2196F3", "#FF9800", "#9C27B0", "#F44336",
              "#00BCD4", "#CDDC39", "#795548", "#607D8B", "#E91E63"]

    for i, p in enumerate(placements):
        color = colors[hash(p.shape_id) % len(colors)]
        g = dwg.g(opacity=0.7)
        g.add(dwg.rect(
            insert=(p.x, p.y), size=(p.width, p.height),
            fill=color, stroke="black", stroke_width=0.3,
        ))
        g.add(dwg.text(
            f"{p.shape_id}#{p.instance}",
            insert=(p.x + p.width / 2, p.y + p.height / 2),
            text_anchor="middle", dominant_baseline="central",
            font_size="3px", fill="white",
        ))
        dwg.add(g)

    return dwg.tostring()


def generate_pdf(sheet: SheetConfig, placements: list[Placement]) -> bytes:
    """Generate a print-ready PDF with nested layout at 300 DPI."""
    buf = io.BytesIO()
    page_w = sheet.width * mm
    page_h = sheet.height * mm
    c = pdf_canvas.Canvas(buf, pagesize=(page_w, page_h))

    # Registration marks (corners)
    mark_len = 5 * mm
    for cx, cy in [(0, 0), (page_w, 0), (0, page_h), (page_w, page_h)]:
        c.setStrokeColorRGB(0, 0, 0)
        c.setLineWidth(0.3)
        dx = mark_len if cx == 0 else -mark_len
        dy = mark_len if cy == 0 else -mark_len
        c.line(cx, cy, cx + dx, cy)
        c.line(cx, cy, cx, cy + dy)

    # Sheet border
    c.setStrokeColorRGB(0.5, 0.5, 0.5)
    c.setLineWidth(0.5)
    c.rect(0, 0, page_w, page_h)

    # Shapes
    colors = [(0.3, 0.69, 0.31), (0.13, 0.59, 0.95), (1.0, 0.6, 0.0),
              (0.61, 0.15, 0.69), (0.96, 0.26, 0.21)]
    for i, p in enumerate(placements):
        r, g, b = colors[hash(p.shape_id) % len(colors)]
        c.setFillColorRGB(r, g, b, 0.5)
        c.setStrokeColorRGB(0, 0, 0)
        c.setLineWidth(0.3)
        c.rect(p.x * mm, p.y * mm, p.width * mm, p.height * mm, fill=1, stroke=1)

        # Cut marks (small crosshairs at corners)
        c.setStrokeColorRGB(0, 0, 0)
        c.setLineWidth(0.15)
        cm = 1.5 * mm
        for corner_x, corner_y in [
            (p.x * mm, p.y * mm),
            ((p.x + p.width) * mm, p.y * mm),
            (p.x * mm, (p.y + p.height) * mm),
            ((p.x + p.width) * mm, (p.y + p.height) * mm),
        ]:
            c.line(corner_x - cm, corner_y, corner_x + cm, corner_y)
            c.line(corner_x, corner_y - cm, corner_x, corner_y + cm)

    c.save()
    return buf.getvalue()
