from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from models import Job, Machine, MachineStatus, MachineType, JobStatus
import logging

logger = logging.getLogger(__name__)


async def find_best_machine(
    db: AsyncSession, width_mm: float, height_mm: float, material: str, machine_type: MachineType = MachineType.printer
) -> Machine | None:
    """Find the best available machine for the job based on size, material, and availability."""
    stmt = (
        select(Machine)
        .where(
            Machine.type == machine_type,
            Machine.status == MachineStatus.idle,
            Machine.max_width_mm >= width_mm,
            Machine.max_height_mm >= height_mm,
        )
        .order_by(Machine.max_width_mm)  # prefer smallest capable machine
    )
    result = await db.execute(stmt)
    machines = result.scalars().all()

    for m in machines:
        if not m.supported_materials or material in m.supported_materials:
            return m
    return machines[0] if machines else None


async def route_job_to_machine(db: AsyncSession, job: Job, machine: Machine) -> None:
    job.machine_id = machine.id
    job.status = JobStatus.queued
    machine.status = MachineStatus.busy
    machine.current_job = job.id
    await db.commit()


async def advance_job_status(db: AsyncSession, job: Job) -> str:
    transitions = {
        JobStatus.queued: JobStatus.printing,
        JobStatus.printing: JobStatus.cutting,
        JobStatus.cutting: JobStatus.qc,
        JobStatus.qc: JobStatus.shipped,
    }
    next_status = transitions.get(job.status)
    if next_status:
        old = job.status
        job.status = next_status
        if next_status == JobStatus.shipped:
            from datetime import datetime
            job.completed_at = datetime.utcnow()
            # Free up machine
            if job.machine_id:
                machine = await db.get(Machine, job.machine_id)
                if machine:
                    machine.status = MachineStatus.idle
                    machine.current_job = None
        await db.commit()
        logger.info(f"Job {job.id} transitioned {old} -> {next_status}")
        return next_status.value
    return job.status.value
