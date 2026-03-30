"""Tests for the FastAPI endpoints."""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.fixture
def transport():
    return ASGITransport(app=app)


@pytest.mark.asyncio
async def test_health(transport):
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/health")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_optimize(transport):
    payload = {
        "shapes": [
            {"id": "mag1", "type": "rectangle", "width": 100, "height": 50, "quantity": 3}
        ],
        "sheet": {"width": 400, "height": 400},
        "spacing": 2.0,
    }
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post("/api/nesting/optimize", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["total_sheets"] >= 1
    assert "svg" in data["sheets"][0]


@pytest.mark.asyncio
async def test_calculate_waste(transport):
    payload = {
        "placements": [
            {"shape_id": "a", "instance": 0, "x": 0, "y": 0, "rotation": 0,
             "width": 100, "height": 100}
        ],
        "sheet": {"width": 200, "height": 200},
    }
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post("/api/nesting/calculate-waste", json=payload)
    assert r.status_code == 200
    assert r.json()["waste_pct"] == 75.0


@pytest.mark.asyncio
async def test_batch(transport):
    payload = {
        "orders": [
            {"order_id": "o1", "shapes": [
                {"id": "s1", "type": "rectangle", "width": 50, "height": 50, "quantity": 2}
            ]},
            {"order_id": "o2", "shapes": [
                {"id": "s2", "type": "circle", "radius": 20, "quantity": 1}
            ]},
        ],
        "sheet": {"width": 300, "height": 300},
    }
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post("/api/nesting/batch", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert len(data["results"]) == 2
    assert data["combined"] is not None


@pytest.mark.asyncio
async def test_pdf_endpoint(transport):
    payload = {
        "shapes": [
            {"id": "mag1", "type": "rectangle", "width": 100, "height": 50, "quantity": 2}
        ],
        "sheet": {"width": 400, "height": 400},
    }
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post("/api/nesting/optimize/pdf", json=payload)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert len(r.content) > 100
