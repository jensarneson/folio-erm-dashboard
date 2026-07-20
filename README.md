# FOLIO ERM Dashboard

Rubric review queue dashboard for EKU Libraries' FOLIO ERM system.

## Features

- Login with FOLIO credentials
- Summary of agreement review status (total, pending, decided)
- Active review queue sorted by urgency (WATCH items first)
- Previous decision badges (color-coded)
- Inline decision form — set RENEW/WATCH/CANCEL with optional notes
- Organization links to FOLIO UI with roles and primary indicator
- Fiscal year selector (±3 years)
- Refresh button to reload data

## Tech Stack

- React 19 + TypeScript + Vite 6
- TanStack Query for data fetching
- React Router DOM v7
- Direct FOLIO API calls (no backend proxy)

## Setup

```bash
npm install
npm run dev
```

## Configuration

Login screen connects to the FOLIO Okapi gateway. No build-time config needed — the dashboard discovers supplementary property names at runtime.

## Deployment

```bash
npm run build
```

Output is in `dist/`. Deploy to any static hosting (GitHub Pages, Netlify, etc.).

## Architecture

See `docs/adr/` for architectural decisions covering project structure, deployment target, API design, authentication, and more.
