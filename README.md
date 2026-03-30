# Magnet Manufacturing Platform

Custom photo magnet e-commerce platform with consumer storefront and B2B bulk ordering.

## Architecture

- **frontend/** — Next.js 14 + Tailwind CSS static site (GitHub Pages)
- **Firebase Realtime Database** — All data (products, carts, orders) stored in RTDB
- **commerce/** — Legacy Express + TypeORM API (kept for reference, not required)

The frontend talks **directly to Firebase RTDB** from the client — no backend server needed.

## Quick Start

### 1. Install & Run Frontend
```bash
cd frontend && npm install
npm run dev     # Runs on :3000
```

### 2. Seed Product Data (one-time)
```bash
cd frontend
NODE_PATH=./node_modules npx tsx ../scripts/seed-firebase.ts
```

### 3. Build for GitHub Pages
```bash
cd frontend && npm run build
# Static output in frontend/out/
```

## Firebase Setup

- **Project:** magnet-manufacturing
- **RTDB URL:** https://magnet-manufacturing-default-rtdb.firebaseio.com
- **Config:** `firebase-config.js` (repo root) and `frontend/src/lib/firebase.ts`

### RTDB Structure
```
/products/{productId}     — Product catalog with variants & pricing tiers
/carts/{cartId}           — Shopping carts
/orders/{orderId}         — Completed orders
/bulk-orders/{id}         — B2B bulk order records
```

## Features

### Consumer Storefront
- Browse magnet products by shape, material, finish
- Photo upload with live magnet preview
- Size/finish selector with real-time pricing
- Volume pricing tiers (up to 50% off at 1000+ units)
- Cart and checkout flow

### B2B Portal
- CSV bulk upload (columns: name, photo_url, quantity, size)
- Client-side validation with error reporting
- Estimated total with tiered pricing
- Order tracking

### Multi-Tenant
- Tenant management via RTDB
- Products scoped to tenants

## Product Model

- **Shapes**: Rectangle, Circle, Square, Oval, Heart, Custom
- **Materials**: Flexible, Rigid, Vinyl, Photo Paper, UV Coated
- **Sizes**: 2×3", 3×4", 4×6", 5×7", 8×10"
- **Finishes**: Matte, Glossy, Satin, Soft Touch
- **Pricing Tiers**: 1-9, 10-49, 50-99, 100-499, 500-999, 1000+

## Legacy Backend

The original Express/PostgreSQL backend is preserved in `commerce/` and can be started with Docker Compose if needed, but the frontend no longer depends on it.
