import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Job, Quote, Machine, MaterialUsage, JobStatus, MachineStatus
from models.schemas import (
    QuoteRequest, MarginRequest, RouteJobRequest,
    EmailQuoteRequest, AnalyticsResponse, JobStatusUpdate,
)
from services.margin import calculate_margin
from services.quoting import generate_quote, generate_quote_email
from services.routing import find_best_machine, route_job_to_machine, advance_job_status

router = APIRouter(prefix="/api/mis")


@router.post("/quote")
async def create_quote(req: QuoteRequest, db: AsyncSession = Depends(get_db)):
    quote_data = await generate_quote(req.inquiry_text, req.items)
    quote = Quote(
        customer_email=req.customer_email,
        customer_name=req.customer_name,
        items=quote_data.get("items", []),
        total_price=quote_data.get("total_price", 0),
        margin_pct=35.0,
        notes=quote_data.get("notes", ""),
    )
    db.add(quote)
    await db.commit()
    await db.refresh(quote)
    return {"quote_id": quote.id, **quote_data}


@router.post("/calculate-margin")
async def calc_margin(req: MarginRequest):
    result = calculate_margin(
        sheet_count=req.sheet_count,
        waste_pct=req.waste_pct,
        material_cost_per_sheet=req.material_cost_per_sheet,
        print_time_hours=req.print_time_hours,
        labor_hours=req.labor_hours,
        margin_target=req.margin_target,
    )
    return result


@router.post("/route-job")
async def route_job(req: RouteJobRequest, db: AsyncSession = Depends(get_db)):
    if req.job_id:
        job = await db.get(Job, req.job_id)
        if not job:
            raise HTTPException(404, "Job not found")
    else:
        job = Job(
            customer=req.customer,
            order_ref=req.order_ref or str(uuid.uuid4())[:8],
            pdf_path=req.pdf_path,
            priority=req.priority,
            specs={"width_mm": req.width_mm, "height_mm": req.height_mm, "material": req.material},
        )
        db.add(job)
        await db.flush()

    from models import MachineType
    machine = await find_best_machine(db, req.width_mm, req.height_mm, req.material, MachineType.printer)
    if not machine:
        job.status = JobStatus.queued
        await db.commit()
        return {"job_id": job.id, "status": "queued", "machine": None, "message": "No available machine, job queued"}

    await route_job_to_machine(db, job, machine)
    return {"job_id": job.id, "status": job.status.value, "machine": machine.name}


@router.get("/jobs")
async def list_jobs(status: str | None = None, limit: int = 50, db: AsyncSession = Depends(get_db)):
    stmt = select(Job).order_by(Job.priority.desc(), Job.created_at)
    if status:
        stmt = stmt.where(Job.status == status)
    stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    jobs = result.scalars().all()
    return [
        {
            "id": j.id, "customer": j.customer, "order_ref": j.order_ref,
            "status": j.status.value, "priority": j.priority,
            "machine_id": j.machine_id,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "completed_at": j.completed_at.isoformat() if j.completed_at else None,
        }
        for j in jobs
    ]


@router.post("/jobs/{job_id}/advance")
async def advance_job(job_id: str, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    new_status = await advance_job_status(db, job)
    return {"job_id": job_id, "status": new_status}


@router.get("/analytics")
async def analytics(db: AsyncSession = Depends(get_db)):
    # Jobs by status
    stmt = select(Job.status, func.count()).group_by(Job.status)
    result = await db.execute(stmt)
    status_counts = {row[0].value: row[1] for row in result.all()}

    total_jobs = sum(status_counts.values())
    queue_depth = status_counts.get("queued", 0)

    # Avg margin from quotes
    avg_margin = await db.scalar(select(func.avg(Quote.margin_pct))) or 0.0
    total_revenue = await db.scalar(select(func.sum(Quote.total_price))) or 0.0

    # Machines
    machines_result = await db.execute(select(Machine))
    machines = [
        {"id": m.id, "name": m.name, "type": m.type.value, "status": m.status.value, "current_job": m.current_job}
        for m in machines_result.scalars().all()
    ]

    return AnalyticsResponse(
        total_jobs=total_jobs,
        jobs_by_status=status_counts,
        avg_margin_pct=round(avg_margin, 2),
        total_revenue=round(total_revenue, 2),
        queue_depth=queue_depth,
        machines=machines,
    )


@router.post("/email-quote")
async def email_quote(req: EmailQuoteRequest, db: AsyncSession = Depends(get_db)):
    quote = await db.get(Quote, req.quote_id)
    if not quote:
        raise HTTPException(404, "Quote not found")

    email_body = await generate_quote_email(
        {"items": quote.items, "total_price": quote.total_price, "notes": quote.notes},
        quote.customer_name,
    )
    # In production, send via SMTP. For now, mark as sent and return the email body.
    quote.sent_at = datetime.utcnow()
    await db.commit()

    return {"quote_id": quote.id, "email_to": quote.customer_email, "subject": req.subject, "body": email_body, "sent_at": quote.sent_at.isoformat()}
