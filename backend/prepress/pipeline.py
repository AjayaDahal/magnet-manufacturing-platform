"""Core image processing pipeline for pre-press operations."""

from __future__ import annotations

import io
import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

import cv2
import numpy as np
import svgwrite
from PIL import Image
try:
    from rembg import remove as rembg_remove
except (ImportError, SystemExit):
    rembg_remove = None  # rembg optional — requires onnxruntime


class MagnetShape(str, Enum):
    RECTANGLE = "rectangle"
    CIRCLE = "circle"
    CUSTOM = "custom"


@dataclass
class ContourResult:
    contour: np.ndarray  # Nx1x2 OpenCV contour
    bbox: tuple[int, int, int, int]  # x, y, w, h
    area: float
    shape: MagnetShape


@dataclass
class PipelineResult:
    nobg_image: bytes  # PNG with background removed
    contour: ContourResult
    bleed_image: bytes  # PNG with bleed area
    cutline_svg: str  # SVG string
    width_px: int
    height_px: int
    dpi: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

MM_PER_INCH = 25.4


def _px_to_mm(px: int, dpi: int) -> float:
    return px * MM_PER_INCH / dpi


def _mm_to_px(mm: float, dpi: int) -> int:
    return int(round(mm * dpi / MM_PER_INCH))


def _load_image_rgba(data: bytes) -> np.ndarray:
    """Load image bytes into an RGBA numpy array."""
    img = Image.open(io.BytesIO(data)).convert("RGBA")
    return np.array(img)


def _to_png_bytes(img_array: np.ndarray) -> bytes:
    """Convert RGBA numpy array to PNG bytes."""
    img = Image.fromarray(img_array, "RGBA")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Pipeline stages
# ---------------------------------------------------------------------------


def remove_background(image_data: bytes) -> bytes:
    """Remove background using rembg. Returns PNG bytes with transparency."""
    if rembg_remove is None:
        raise RuntimeError("rembg is not available — install with: pip install rembg[gpu] or rembg[cpu]")
    return rembg_remove(image_data)


def detect_contour(
    image_data: bytes, shape_hint: MagnetShape = MagnetShape.CUSTOM
) -> ContourResult:
    """Detect the primary contour of a transparent PNG.

    Uses the alpha channel to find the largest non-transparent region.
    """
    rgba = _load_image_rgba(image_data)
    alpha = rgba[:, :, 3]

    # Threshold and find contours
    _, thresh = cv2.threshold(alpha, 10, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        raise ValueError("No contours detected in image")

    # Largest contour by area
    main = max(contours, key=cv2.contourArea)
    bbox = cv2.boundingRect(main)
    area = cv2.contourArea(main)

    # Shape classification
    if shape_hint != MagnetShape.CUSTOM:
        detected_shape = shape_hint
    else:
        peri = cv2.arcLength(main, True)
        approx = cv2.approxPolyDP(main, 0.04 * peri, True)
        if len(approx) == 4:
            detected_shape = MagnetShape.RECTANGLE
        elif len(approx) > 8:
            circularity = 4 * math.pi * area / (peri * peri) if peri else 0
            detected_shape = MagnetShape.CIRCLE if circularity > 0.8 else MagnetShape.CUSTOM
        else:
            detected_shape = MagnetShape.CUSTOM

    return ContourResult(contour=main, bbox=bbox, area=area, shape=detected_shape)


def generate_bleed(
    image_data: bytes,
    contour_result: ContourResult,
    bleed_mm: float = 2.0,
    dpi: int = 300,
) -> bytes:
    """Add bleed area around detected contour by dilating the mask."""
    rgba = _load_image_rgba(image_data)
    h, w = rgba.shape[:2]
    bleed_px = _mm_to_px(bleed_mm, dpi)

    # Create mask from contour
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.drawContours(mask, [contour_result.contour], -1, 255, cv2.FILLED)

    # Dilate mask for bleed
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (bleed_px * 2 + 1, bleed_px * 2 + 1))
    bleed_mask = cv2.dilate(mask, kernel, iterations=1)

    # Expand canvas if needed
    pad = bleed_px
    padded = np.zeros((h + pad * 2, w + pad * 2, 4), dtype=np.uint8)
    padded[pad : pad + h, pad : pad + w] = rgba

    # Apply bleed mask (extend edge pixels into bleed area)
    bleed_mask_padded = np.zeros((h + pad * 2, w + pad * 2), dtype=np.uint8)
    bleed_mask_padded[pad : pad + h, pad : pad + w] = bleed_mask
    # Where bleed_mask is set but original alpha is 0, fill with nearest color
    orig_alpha = padded[:, :, 3]
    need_fill = (bleed_mask_padded > 0) & (orig_alpha == 0)
    if np.any(need_fill):
        # Simple: use edge color by dilating the image itself
        for c in range(3):
            channel = padded[:, :, c]
            dilated_ch = cv2.dilate(channel, kernel, iterations=1)
            channel[need_fill] = dilated_ch[need_fill]
            padded[:, :, c] = channel
        padded[:, :, 3][need_fill] = 255

    return _to_png_bytes(padded)


def generate_cutline_svg(
    contour_result: ContourResult,
    dpi: int = 300,
    bleed_mm: float = 0.0,
    canvas_width_px: int | None = None,
    canvas_height_px: int | None = None,
) -> str:
    """Generate an SVG cutline/dieline from the contour.

    The SVG uses millimetre units for CNC compatibility.
    """
    contour = contour_result.contour.squeeze()  # Nx2
    if contour.ndim == 1:
        contour = contour.reshape(1, 2)

    bleed_px = _mm_to_px(bleed_mm, dpi)

    # Convert points to mm
    points_mm = [(_px_to_mm(int(pt[0]) + bleed_px, dpi), _px_to_mm(int(pt[1]) + bleed_px, dpi)) for pt in contour]

    # Canvas size
    if canvas_width_px and canvas_height_px:
        w_mm = _px_to_mm(canvas_width_px + bleed_px * 2, dpi)
        h_mm = _px_to_mm(canvas_height_px + bleed_px * 2, dpi)
    else:
        w_mm = max(p[0] for p in points_mm) + 5
        h_mm = max(p[1] for p in points_mm) + 5

    dwg = svgwrite.Drawing(size=(f"{w_mm}mm", f"{h_mm}mm"), viewBox=f"0 0 {w_mm} {h_mm}")
    dwg.attribs["xmlns"] = "http://www.w3.org/2000/svg"

    # Simplify contour for cleaner SVG
    epsilon = _px_to_mm(2, dpi)  # ~0.17mm tolerance
    simplified = cv2.approxPolyDP(contour_result.contour, epsilon * dpi / MM_PER_INCH, True).squeeze()
    if simplified.ndim == 1:
        simplified = simplified.reshape(1, 2)
    simp_mm = [(_px_to_mm(int(pt[0]) + bleed_px, dpi), _px_to_mm(int(pt[1]) + bleed_px, dpi)) for pt in simplified]

    # Build SVG path
    if contour_result.shape == MagnetShape.CIRCLE:
        x, y, bw, bh = contour_result.bbox
        cx = _px_to_mm(x + bw // 2 + bleed_px, dpi)
        cy = _px_to_mm(y + bh // 2 + bleed_px, dpi)
        r = _px_to_mm(max(bw, bh) // 2, dpi)
        dwg.add(dwg.circle(center=(cx, cy), r=r, fill="none", stroke="red", stroke_width=0.1))
    elif contour_result.shape == MagnetShape.RECTANGLE:
        x, y, bw, bh = contour_result.bbox
        rx = _px_to_mm(x + bleed_px, dpi)
        ry = _px_to_mm(y + bleed_px, dpi)
        rw = _px_to_mm(bw, dpi)
        rh = _px_to_mm(bh, dpi)
        dwg.add(dwg.rect(insert=(rx, ry), size=(rw, rh), fill="none", stroke="red", stroke_width=0.1))
    else:
        # Custom path
        d_parts = [f"M {simp_mm[0][0]:.3f},{simp_mm[0][1]:.3f}"]
        for pt in simp_mm[1:]:
            d_parts.append(f"L {pt[0]:.3f},{pt[1]:.3f}")
        d_parts.append("Z")
        dwg.add(dwg.path(d=" ".join(d_parts), fill="none", stroke="red", stroke_width=0.1))

    return dwg.tostring()


def full_pipeline(
    image_data: bytes,
    shape_hint: MagnetShape = MagnetShape.CUSTOM,
    bleed_mm: float = 2.0,
    dpi: int = 300,
) -> PipelineResult:
    """Run the complete pre-press pipeline on a single image."""
    # 1. Remove background
    nobg = remove_background(image_data)

    # 2. Detect contour
    contour = detect_contour(nobg, shape_hint)

    # 3. Get image dimensions
    rgba = _load_image_rgba(nobg)
    h, w = rgba.shape[:2]

    # 4. Generate bleed
    bleed_img = generate_bleed(nobg, contour, bleed_mm=bleed_mm, dpi=dpi)

    # 5. Generate cutline SVG
    svg = generate_cutline_svg(contour, dpi=dpi, bleed_mm=bleed_mm, canvas_width_px=w, canvas_height_px=h)

    return PipelineResult(
        nobg_image=nobg,
        contour=contour,
        bleed_image=bleed_img,
        cutline_svg=svg,
        width_px=w,
        height_px=h,
        dpi=dpi,
    )
