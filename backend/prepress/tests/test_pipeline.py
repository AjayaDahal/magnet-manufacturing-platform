"""Unit tests for the pre-press pipeline and API endpoints."""

import io
import numpy as np
import pytest
from PIL import Image
from fastapi.testclient import TestClient


def _make_test_png(w: int = 200, h: int = 200, shape: str = "circle") -> bytes:
    """Create a test RGBA PNG with a known shape on transparent background."""
    img = np.zeros((h, w, 4), dtype=np.uint8)
    if shape == "circle":
        import cv2
        cv2.circle(img, (w // 2, h // 2), min(w, h) // 3, (255, 0, 0, 255), -1)
    elif shape == "rectangle":
        img[40:160, 40:160] = [0, 0, 255, 255]
    else:
        import cv2
        pts = np.array([[50, 150], [100, 30], [150, 150], [130, 100], [70, 100]], np.int32)
        cv2.fillPoly(img, [pts], (0, 255, 0, 255))
    buf = io.BytesIO()
    Image.fromarray(img, "RGBA").save(buf, "PNG")
    return buf.getvalue()


def _make_opaque_png(w: int = 200, h: int = 200) -> bytes:
    """Create a simple opaque test image (for bg removal input)."""
    img = np.zeros((h, w, 3), dtype=np.uint8)
    img[40:160, 40:160] = [255, 128, 0]
    img[:40, :, :] = [200, 200, 200]  # gray bg
    img[160:, :, :] = [200, 200, 200]
    img[:, :40, :] = [200, 200, 200]
    img[:, 160:, :] = [200, 200, 200]
    buf = io.BytesIO()
    Image.fromarray(img, "RGB").save(buf, "PNG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Pipeline unit tests
# ---------------------------------------------------------------------------

class TestPipeline:
    def test_detect_contour_circle(self):
        from backend.prepress.pipeline import detect_contour, MagnetShape
        data = _make_test_png(shape="circle")
        result = detect_contour(data)
        assert result.area > 0
        assert len(result.bbox) == 4

    def test_detect_contour_rectangle(self):
        from backend.prepress.pipeline import detect_contour, MagnetShape
        data = _make_test_png(shape="rectangle")
        result = detect_contour(data, MagnetShape.RECTANGLE)
        assert result.shape == MagnetShape.RECTANGLE

    def test_generate_bleed(self):
        from backend.prepress.pipeline import detect_contour, generate_bleed
        data = _make_test_png(shape="circle")
        cr = detect_contour(data)
        bleed = generate_bleed(data, cr, bleed_mm=2.0, dpi=300)
        assert len(bleed) > 0
        # Bleed image should be larger than original
        orig = Image.open(io.BytesIO(data))
        bleed_img = Image.open(io.BytesIO(bleed))
        assert bleed_img.width >= orig.width
        assert bleed_img.height >= orig.height

    def test_generate_cutline_svg(self):
        from backend.prepress.pipeline import detect_contour, generate_cutline_svg
        data = _make_test_png(shape="circle")
        cr = detect_contour(data)
        svg = generate_cutline_svg(cr, dpi=300, canvas_width_px=200, canvas_height_px=200)
        assert "<svg" in svg
        assert "red" in svg

    def test_generate_cutline_rectangle(self):
        from backend.prepress.pipeline import detect_contour, generate_cutline_svg, MagnetShape
        data = _make_test_png(shape="rectangle")
        cr = detect_contour(data, MagnetShape.RECTANGLE)
        svg = generate_cutline_svg(cr, dpi=300)
        assert "<rect" in svg

    def test_detect_empty_image_raises(self):
        from backend.prepress.pipeline import detect_contour
        # Fully transparent image
        img = np.zeros((100, 100, 4), dtype=np.uint8)
        buf = io.BytesIO()
        Image.fromarray(img, "RGBA").save(buf, "PNG")
        with pytest.raises(ValueError, match="No contours"):
            detect_contour(buf.getvalue())


# ---------------------------------------------------------------------------
# API endpoint tests
# ---------------------------------------------------------------------------

class TestAPI:
    @pytest.fixture
    def client(self):
        from backend.prepress.main import app
        return TestClient(app)

    def test_health(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_detect_contour_endpoint(self, client):
        data = _make_test_png(shape="circle")
        r = client.post(
            "/api/prepress/detect-contour",
            files={"file": ("test.png", data, "image/png")},
        )
        assert r.status_code == 200
        body = r.json()
        assert "bbox" in body
        assert body["area"] > 0

    def test_generate_bleed_endpoint(self, client):
        data = _make_test_png(shape="rectangle")
        r = client.post(
            "/api/prepress/generate-bleed",
            files={"file": ("test.png", data, "image/png")},
            data={"bleed_mm": "2.0", "dpi": "300", "shape": "custom"},
        )
        assert r.status_code == 200
        assert r.headers["content-type"] == "image/png"

    def test_generate_cutline_endpoint(self, client):
        data = _make_test_png(shape="circle")
        r = client.post(
            "/api/prepress/generate-cutline",
            files={"file": ("test.png", data, "image/png")},
        )
        assert r.status_code == 200
        assert "svg" in r.headers["content-type"]

    def test_full_pipeline_endpoint(self, client):
        data = _make_test_png(shape="circle")
        r = client.post(
            "/api/prepress/full-pipeline",
            files={"file": ("test.png", data, "image/png")},
            data={"shape": "custom", "bleed_mm": "2.0", "dpi": "300"},
        )
        assert r.status_code == 200
        body = r.json()
        assert "nobg_image_b64" in body
        assert "cutline_svg" in body
        assert body["dpi"] == 300

    def test_batch_pipeline_endpoint(self, client):
        data1 = _make_test_png(shape="circle")
        data2 = _make_test_png(shape="rectangle")
        r = client.post(
            "/api/prepress/batch-pipeline",
            files=[
                ("files", ("a.png", data1, "image/png")),
                ("files", ("b.png", data2, "image/png")),
            ],
            data={"shape": "custom", "bleed_mm": "2.0", "dpi": "300"},
        )
        assert r.status_code == 200
        assert len(r.json()["results"]) == 2

    def test_empty_file_returns_400(self, client):
        r = client.post(
            "/api/prepress/detect-contour",
            files={"file": ("empty.png", b"", "image/png")},
        )
        assert r.status_code == 400
