import enum
import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, Enum, ForeignKey, JSON, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class JobStatus(str, enum.Enum):
    queued = "queued"
    printing = "printing"
    cutting = "cutting"
    qc = "qc"
    shipped = "shipped"
    cancelled = "cancelled"


class MachineType(str, enum.Enum):
    printer = "printer"
    cutter = "cutter"


class MachineStatus(str, enum.Enum):
    idle = "idle"
    busy = "busy"
    maintenance = "maintenance"


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    customer: Mapped[str] = mapped_column(String(255))
    order_ref: Mapped[str] = mapped_column(String(100), unique=True)
    status: Mapped[JobStatus] = mapped_column(Enum(JobStatus), default=JobStatus.queued)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    pdf_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    machine_id: Mapped[str | None] = mapped_column(String, ForeignKey("machines.id"), nullable=True)
    specs: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    material_usage: Mapped[list["MaterialUsage"]] = relationship(back_populates="job")


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_email: Mapped[str] = mapped_column(String(255))
    customer_name: Mapped[str] = mapped_column(String(255), default="")
    items: Mapped[dict] = mapped_column(JSON)
    total_price: Mapped[float] = mapped_column(Float)
    margin_pct: Mapped[float] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Machine(Base):
    __tablename__ = "machines"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[MachineType] = mapped_column(Enum(MachineType))
    status: Mapped[MachineStatus] = mapped_column(Enum(MachineStatus), default=MachineStatus.idle)
    current_job: Mapped[str | None] = mapped_column(String, nullable=True)
    max_width_mm: Mapped[float] = mapped_column(Float, default=1500.0)
    max_height_mm: Mapped[float] = mapped_column(Float, default=3000.0)
    supported_materials: Mapped[list] = mapped_column(JSON, default=list)


class MaterialUsage(Base):
    __tablename__ = "material_usage"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id: Mapped[str] = mapped_column(String, ForeignKey("jobs.id"))
    sheet_count: Mapped[int] = mapped_column(Integer)
    waste_pct: Mapped[float] = mapped_column(Float)
    cost: Mapped[float] = mapped_column(Float)
    material_type: Mapped[str] = mapped_column(String(100), default="vinyl")

    job: Mapped["Job"] = relationship(back_populates="material_usage")
