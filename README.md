# Magnet Manufacturing Platform

A unified software platform for custom magnet manufacturing.

## Core Features
1. **Automated Pre-Press & Nesting Engine** — AI-powered image processing, background removal, contour detection, bleed areas, SVG cutlines, and optimized 2D bin-packing
2. **B2B Bulk Personalization Portal** — Multi-tenant storefront with CSV-upload for bulk roster personalization
3. **AI-Native Print Shop Manager (MIS)** — LLM-powered email quoting, real-time material waste calculation, gross margin tracking, and CNC plotter routing

## Tech Stack
- **Frontend:** Next.js, React, TypeScript (strict mode)
- **Commerce:** Medusa.js (headless commerce)
- **Backend:** Python, FastAPI, Docker microservices
- **Database:** PostgreSQL (multi-tenant)
- **AI/CV:** OpenCV, background removal APIs, LLM integrations
- **Nesting:** C++ with Python bindings (2D polygon bin-packing)
- **Infrastructure:** GCP Cloud Run, Docker

## Architecture
```
┌─────────────────────────────────────────┐
│            Next.js Frontend              │
│   Consumer Store + B2B Bulk Portal       │
├─────────────┬───────────┬───────────────┤
│  Medusa.js  │  PrePress │    MIS        │
│  Commerce   │  Service  │   Service     │
│  (Node.js)  │ (FastAPI) │  (FastAPI)    │
├─────────────┼───────────┼───────────────┤
│         PostgreSQL (Multi-Tenant)        │
└─────────────────────────────────────────┘
```

## Microservices
- `commerce/` — Medusa.js headless commerce (products, orders, tenants)
- `backend/prepress/` — Image processing: bg removal, contour detection, bleed, cutlines
- `backend/nesting/` — 2D polygon bin-packing optimization
- `backend/mis/` — Print shop MIS: quoting, routing, margin calculation

## Private Repository
https://github.com/AjayaDahal/magnet-manufacturing-platform
