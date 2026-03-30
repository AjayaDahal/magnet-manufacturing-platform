"""FastAPI pre-press microservice for magnet manufacturing."""

from __future__ import annotations

import base64
import io
import uuid
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from .pipeline import (
    MagnetShape,
    remove_background,
    detect_contour,
    generate_bleed,
    generate_cutline_svg,
    full_pipeline,
)

app = FastAPI(
    title="Magnet Pre-Press Service",
    description="Image processing pipeline for magnet manufacturing: background removal, contour detection, bleed generation, and CNC-compatible cutline SVG output.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class ContourResponse(BaseModel):
    bbox: list[int]
    area: float
    shape: str
    point_count: int


class PipelineResponse(BaseModel):
    id: str
    nobg_image_b64: str
    contour: ContourResponse
    bleed_image_b64: str
    cutline_svg: str
    width_px: int
    height_px: int
    dpi: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode()


async def _read_upload(file: UploadFile) -> bytes:
    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty file")
    return data


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "service": "prepress"}


@app.post("/api/prepress/remove-background")
async def ep_remove_background(file: UploadFile = File(...)):
    """Remove image background. Returns PNG with transparency."""
    data = await _read_upload(file)
    result = remove_background(data)
    return Response(content=result, media_type="image/png")


@app.post("/api/prepress/detect-contour")
async def ep_detect_contour(
    file: UploadFile = File(...),
    shape: MagnetShape = Form(MagnetShape.CUSTOM),
):
    """Detect primary contour of a transparent PNG."""
    data = await _read_upload(file)
    cr = detect_contour(data, shape)
    return ContourResponse(
        bbox=list(cr.bbox),
        area=cr.area,
        shape=cr.shape.value,
        point_count=len(cr.contour),
    )


@app.post("/api/prepress/generate-bleed")
async def ep_generate_bleed(
    file: UploadFile = File(...),
    shape: MagnetShape = Form(MagnetShape.CUSTOM),
    bleed_mm: float = Form(2.0),
    dpi: int = Form(300),
):
    """Add bleed area around detected contour. Returns PNG."""
    data = await _read_upload(file)
    cr = detect_contour(data, shape)
    result = generate_bleed(data, cr, bleed_mm=bleed_mm, dpi=dpi)
    return Response(content=result, media_type="image/png")


@app.post("/api/prepress/generate-cutline")
async def ep_generate_cutline(
    file: UploadFile = File(...),
    shape: MagnetShape = Form(MagnetShape.CUSTOM),
    bleed_mm: float = Form(0.0),
    dpi: int = Form(300),
):
    """Generate SVG cutline/dieline from contour. Returns SVG."""
    data = await _read_upload(file)
    cr = detect_contour(data, shape)
    from .pipeline import _load_image_rgba
    rgba = _load_image_rgba(data)
    h, w = rgba.shape[:2]
    svg = generate_cutline_svg(cr, dpi=dpi, bleed_mm=bleed_mm, canvas_width_px=w, canvas_height_px=h)
    return Response(content=svg, media_type="image/svg+xml")


@app.post("/api/prepress/full-pipeline", response_model=PipelineResponse)
async def ep_full_pipeline(
    file: UploadFile = File(...),
    shape: MagnetShape = Form(MagnetShape.CUSTOM),
    bleed_mm: float = Form(2.0),
    dpi: int = Form(300),
):
    """Run full pre-press pipeline on a single image."""
    data = await _read_upload(file)
    result = full_pipeline(data, shape_hint=shape, bleed_mm=bleed_mm, dpi=dpi)
    return PipelineResponse(
        id=str(uuid.uuid4()),
        nobg_image_b64=_b64(result.nobg_image),
        contour=ContourResponse(
            bbox=list(result.contour.bbox),
            area=result.contour.area,
            shape=result.contour.shape.value,
            point_count=len(result.contour.contour),
        ),
        bleed_image_b64=_b64(result.bleed_image),
        cutline_svg=result.cutline_svg,
        width_px=result.width_px,
        height_px=result.height_px,
        dpi=result.dpi,
    )


@app.post("/api/prepress/batch-pipeline")
async def ep_batch_pipeline(
    files: list[UploadFile] = File(...),
    shape: MagnetShape = Form(MagnetShape.CUSTOM),
    bleed_mm: float = Form(2.0),
    dpi: int = Form(300),
):
    """Run full pipeline on multiple images."""
    results = []
    for f in files:
        data = await _read_upload(f)
        r = full_pipeline(data, shape_hint=shape, bleed_mm=bleed_mm, dpi=dpi)
        results.append(
            PipelineResponse(
                id=str(uuid.uuid4()),
                nobg_image_b64=_b64(r.nobg_image),
                contour=ContourResponse(
                    bbox=list(r.contour.bbox),
                    area=r.contour.area,
                    shape=r.contour.shape.value,
                    point_count=len(r.contour.contour),
                ),
                bleed_image_b64=_b64(r.bleed_image),
                cutline_svg=r.cutline_svg,
                width_px=r.width_px,
                height_px=r.height_px,
                dpi=r.dpi,
            )
        )
    return {"results": [r.model_dump() for r in results]}
