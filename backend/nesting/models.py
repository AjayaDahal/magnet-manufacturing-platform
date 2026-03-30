"""Pydantic models for the nesting service."""

from __future__ import annotations
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ShapeType(str, Enum):
    RECTANGLE = "rectangle"
    CIRCLE = "circle"
    POLYGON = "polygon"


class Shape(BaseModel):
    id: str
    type: ShapeType
    # Rectangle
    width: Optional[float] = None
    height: Optional[float] = None
    # Circle
    radius: Optional[float] = None
    # Custom polygon — list of [x, y] vertices
    vertices: Optional[list[list[float]]] = None
    quantity: int = 1


class SheetConfig(BaseModel):
    width: float = 610.0  # mm – standard 24" magnet sheet
    height: float = 914.0  # mm – standard 36" magnet sheet


class NestingRequest(BaseModel):
    shapes: list[Shape]
    sheet: SheetConfig = SheetConfig()
    spacing: float = Field(default=2.0, description="Kerf / spacing in mm")
    allow_rotation: bool = True


class Placement(BaseModel):
    shape_id: str
    instance: int
    x: float
    y: float
    rotation: int  # degrees
    # Bounding info for convenience
    width: float
    height: float


class SheetResult(BaseModel):
    sheet_index: int
    placements: list[Placement]
    waste_pct: float
    yield_pct: float
    svg: Optional[str] = None


class NestingResponse(BaseModel):
    sheets: list[SheetResult]
    total_waste_pct: float
    total_yield_pct: float
    total_sheets: int


class WasteRequest(BaseModel):
    placements: list[Placement]
    sheet: SheetConfig = SheetConfig()


class WasteResponse(BaseModel):
    waste_pct: float
    yield_pct: float
    used_area: float
    total_area: float


class BatchOrder(BaseModel):
    order_id: str
    shapes: list[Shape]


class BatchRequest(BaseModel):
    orders: list[BatchOrder]
    sheet: SheetConfig = SheetConfig()
    spacing: float = 2.0
    allow_rotation: bool = True


class BatchResult(BaseModel):
    order_id: str
    result: NestingResponse


class BatchResponse(BaseModel):
    results: list[BatchResult]
    combined: Optional[NestingResponse] = None
