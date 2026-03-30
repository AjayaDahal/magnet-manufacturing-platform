"""Pre-press image processing pipeline for magnet manufacturing."""

from .pipeline import (
    remove_background,
    detect_contour,
    generate_bleed,
    generate_cutline_svg,
    full_pipeline,
)

__all__ = [
    "remove_background",
    "detect_contour",
    "generate_bleed",
    "generate_cutline_svg",
    "full_pipeline",
]
