"""Magnet Manufacturing Platform — 2D Nesting / Bin-Packing Service."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import Response

from models import (
    NestingRequest, NestingResponse,
    WasteRequest, WasteResponse,
    BatchRequest, BatchResponse, BatchResult,
)
from engine import nest, calculate_waste, verify_no_overlap
from output import generate_svg, generate_pdf

app = FastAPI(title="Nesting Service", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/nesting/optimize", response_model=NestingResponse)
def optimize(req: NestingRequest):
    result = nest(req.shapes, req.sheet, req.spacing, req.allow_rotation)
    # Attach SVG previews
    for s in result.sheets:
        s.svg = generate_svg(req.sheet, s.placements)
    return result


@app.post("/api/nesting/calculate-waste", response_model=WasteResponse)
def calc_waste(req: WasteRequest):
    waste_pct, yield_pct, used, total = calculate_waste(req.placements, req.sheet)
    return WasteResponse(waste_pct=waste_pct, yield_pct=yield_pct,
                         used_area=used, total_area=total)


@app.post("/api/nesting/batch", response_model=BatchResponse)
def batch(req: BatchRequest):
    results: list[BatchResult] = []
    all_shapes = []
    for order in req.orders:
        r = nest(order.shapes, req.sheet, req.spacing, req.allow_rotation)
        results.append(BatchResult(order_id=order.order_id, result=r))
        all_shapes.extend(order.shapes)

    # Combined nesting for all orders together
    combined = nest(all_shapes, req.sheet, req.spacing, req.allow_rotation)
    return BatchResponse(results=results, combined=combined)


@app.post("/api/nesting/optimize/pdf")
def optimize_pdf(req: NestingRequest):
    result = nest(req.shapes, req.sheet, req.spacing, req.allow_rotation)
    if not result.sheets:
        return Response(content=b"", media_type="application/pdf")
    pdf_bytes = generate_pdf(req.sheet, result.sheets[0].placements)
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": "attachment; filename=nested_layout.pdf"})
