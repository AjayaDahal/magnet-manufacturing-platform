# Magnet Manufacturing Platform

Custom photo magnet e-commerce platform with consumer storefront and B2B bulk ordering.

## Architecture

- **commerce/** — Express + TypeORM REST API (PostgreSQL)
- **frontend/** — Next.js 14 + Tailwind CSS storefront & B2B portal

## Quick Start

### With Docker Compose
```bash
docker compose up --build
```
- Frontend: http://localhost:3000
- API: http://localhost:9000

### Manual Setup

1. **Database** — PostgreSQL on port 5433:
```bash
docker run -d --name magnet-pg -p 5433:5432 \
  -e POSTGRES_DB=magnet_platform \
  -e POSTGRES_USER=magnet \
  -e POSTGRES_PASSWORD=magnet_dev \
  postgres:16-alpine
```

2. **Commerce API**:
```bash
cd commerce && npm install
npm run migrate
npm run seed    # Load sample products
npm run dev     # Runs on :9000
```

3. **Frontend**:
```bash
cd frontend && npm install
npm run dev     # Runs on :3000
```

## Features

### Consumer Storefront
- Browse magnet products by shape, material, finish
- Photo upload with live magnet preview
- Size/finish selector with real-time pricing
- Volume pricing tiers (up to 50% off at 1000+ units)
- Cart and checkout flow

### B2B Portal
- Email-based login
- CSV bulk upload (columns: name, photo_url, quantity, size)
- Server-side validation with error reporting
- Estimated total with tiered pricing
- Order tracking and invoice history

### Multi-Tenant
- Tenant management API (slug, branding, settings)
- Products scoped to tenants
- Tenant-specific storefronts

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/products | List products |
| GET | /api/products/:id | Get product detail |
| POST | /api/products | Create product |
| GET | /api/products/:id/price | Calculate tiered price |
| POST | /api/cart | Create cart |
| GET | /api/cart/:id | Get cart |
| POST | /api/cart/:id/items | Add to cart |
| POST | /api/checkout | Place order |
| GET | /api/checkout/orders | List orders |
| POST | /api/bulk-orders/upload | Upload CSV bulk order |
| GET | /api/bulk-orders/:id | Get bulk order status |
| POST | /api/bulk-orders/:id/confirm | Confirm bulk order |
| POST | /api/uploads/photo | Upload photo |
| GET/POST | /api/tenants | Manage tenants |

## Product Model

- **Shapes**: Rectangle, Circle, Square, Oval, Heart, Custom
- **Materials**: Flexible, Rigid, Vinyl, Photo Paper, UV Coated
- **Sizes**: 2×3", 3×4", 4×6", 5×7", 8×10"
- **Finishes**: Matte, Glossy, Satin, Soft Touch
- **Pricing Tiers**: 1-9, 10-49, 50-99, 100-499, 500-999, 1000+
