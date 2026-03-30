from pydantic import BaseModel, EmailStr
from typing import Optional


class QuoteRequest(BaseModel):
    customer_email: str
    customer_name: str = ""
    inquiry_text: str = ""
    items: list[dict] = []
    # Each item: {name, quantity, width_mm, height_mm, material, complexity: low|medium|high}


class MarginRequest(BaseModel):
    sheet_count: int
    waste_pct: float
    material_cost_per_sheet: float
    print_time_hours: float
    labor_hours: float = 0.0
    margin_target: float = 0.35


class MarginResult(BaseModel):
    material_cost: float
    waste_cost: float
    labor_cost: float
    total_cost: float
    recommended_price: float
    margin_pct: float


class RouteJobRequest(BaseModel):
    job_id: str = ""
    customer: str = ""
    order_ref: str = ""
    pdf_path: str = ""
    width_mm: float = 0.0
    height_mm: float = 0.0
    material: str = "vinyl"
    priority: int = 0


class EmailQuoteRequest(BaseModel):
    quote_id: str
    subject: str = "Your Quote from Magnet Manufacturing"
    custom_message: str = ""


class JobStatusUpdate(BaseModel):
    job_id: str
    status: str


class AnalyticsResponse(BaseModel):
    total_jobs: int
    jobs_by_status: dict[str, int]
    avg_margin_pct: float
    total_revenue: float
    queue_depth: int
    machines: list[dict]
