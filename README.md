# ForensAI — AP Fraud Detection

An AI-assisted accounts payable (AP) fraud-risk detection tool for forensic accountants. It runs deterministic statistical checks (Benford's Law, duplicate invoices, threshold splitting, shell-company scoring, off-hours approvals) against an AP ledger and can draft an investigation report from the findings using Claude.

This repository contains two versions of the app:

- **`original-forensai.html`** — the Workshop 1.4 single-file prototype. Left untouched as a reference point; do not edit it.
- **`frontend/` + `backend/`** — the Workshop 2.3 migration: a React (Vite) frontend and a Node/Express backend, described below.

## Why it was split into two apps

The prototype ran entirely in the browser, including the call to Anthropic's API — which meant the API key had to be typed into the page and sat in the browser's memory and network traffic, visible to anyone who opened DevTools. This version fixes that by moving every fraud-detection calculation and the Anthropic API call onto a backend server that only your machine can reach. The browser never sees the API key.

## Architecture

```
Browser (React app, localhost:5173)
   │  fetch('/api/analyze'), fetch('/api/report')
   ▼
Express backend (localhost:5000)
   │  holds ANTHROPIC_API_KEY, runs all detection math
   ▼
Anthropic API (only called from the backend, only for /api/report)
```

## Getting started

You need two terminals — one for the backend, one for the frontend.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # then open .env and paste in your real Anthropic API key
npm run dev                # or: npm start
```

The server starts at `http://localhost:5000`. `ANTHROPIC_API_KEY` is only required for the "Generate report" feature — everything else (loading data, Benford's Law, findings, vendor risk) works without it.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. During development, Vite proxies any request to `/api/*` through to the backend on port 5000, so the frontend never needs to know the backend's URL directly.

## API reference

### `POST /api/analyze`

Runs every fraud-detection check against a list of transactions.

Request body:
```json
{ "transactions": [{ "id": 1, "date": "2024-01-08", "vendor": "Office Depot", "invoice": "OD-2401", "amount": 847.23, "category": "Supplies", "address": "...", "approved_by": "S. Williams", "ein": "35-0347960" }] }
```

Response: `{ stats, findings, benford, vendorRisk }`

### `POST /api/report`

Sends a summary of findings to Claude and returns a draft investigation report. Never accepts or exposes an API key — the key lives only in `backend/.env`.

Request body:
```json
{ "stats": { "totalTransactions": 64, "totalValue": 123456.78, "uniqueVendors": 15 }, "findings": [/* finding objects from /api/analyze */] }
```

Response: `{ report, generatedAt }` — `report` is always prefixed with `DRAFT — AI-GENERATED, REQUIRES PROFESSIONAL REVIEW`.

## Responsible use of AI-generated output

Every fraud-detection check in this app produces a **statistical fraud-risk indicator** or **anomaly** — not proof that fraud occurred. The UI includes a disclaimer on the Findings, Vendor Risk, and Report tabs, and every AI-generated report is labeled as a draft that requires review by a qualified forensic examiner before any finding is treated as conclusive.

## Security notes

- The Anthropic API key lives only in `backend/.env`, which is gitignored. `backend/.env.example` documents the required variable without a real value.
- The frontend has no API key input anywhere and never talks to `api.anthropic.com` directly — only the backend does.
- `/api/analyze` and `/api/report` validate their request bodies and return plain, generic error messages — no stack traces or upstream error details are ever sent to the browser.

## Project structure

```
AIML515-Workshop-2.3/
├── original-forensai.html   # Workshop 1.4 prototype (unchanged, for comparison)
├── frontend/                # React + Vite UI
│   └── src/
│       ├── components/      # Header, TabNav, and the six tab views
│       ├── data/            # Sample AP ledger
│       ├── utils/           # CSV parsing, currency formatting
│       ├── api/             # fetch wrappers for the backend
│       └── styles/          # Ported CSS (same dark theme as the prototype)
└── backend/                 # Node + Express API
    └── src/
        ├── routes/          # /api/analyze, /api/report
        ├── services/        # Fraud-detection math + Anthropic client
        └── utils/           # Shared helpers and request validation
```

## Notes on scope

This is a local development setup — there's no build/deploy pipeline, no database, and no authentication, none of which the assignment calls for. The 64-row sample dataset and detection thresholds are unchanged from the original prototype.
