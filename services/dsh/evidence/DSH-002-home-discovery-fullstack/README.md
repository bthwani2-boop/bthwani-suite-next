# DSH-002 Home Discovery — Full-Stack Multi-Surface Evidence

Date: 2026-06-23
Branch: starting-implementing-slices
Surfaces: app-client, control-panel

## Implemented

- Public app-client composition remains backed by `GET /dsh/home-discovery`.
- Operator CRUD API for `banners`, `promos`, and `categories`.
- Operator authentication and content audit records.
- Shared home-discovery admin API/controller ownership.
- Control-panel routes:
  - `/dsh/marketing/home-discovery/banners`
  - `/dsh/marketing/home-discovery/promos`
  - `/dsh/marketing/home-discovery/categories`
- Loading, success, empty, and error visual evidence for all three admin routes.

## Runtime Proof

- banners: list/create/update/delete PASS
- promos: list/create/update/delete PASS
- categories: list/create/update/delete PASS
- audit table: create/update/delete persisted for every content kind
- public endpoint after CRUD cleanup: banners=2, promos=2, categories=5, stores=5

## Verification

- contracts foundation: PASS
- DSH TypeScript tests: 122/122 PASS
- DSH Go tests: PASS
- control-panel typecheck: PASS
- control-panel production build: PASS
- shared ownership guard: PASS
- app-shell control-panel guard: PASS
- WLT financial boundary guard: PASS
- matrix v3: PASS
- foundation gate: PASS (`FOUNDATION-GATE-20260623-050634`)
- global slice gate: FAIL (`SLICE-GATE-20260623-051308`) because DSH-001 remains `FIX_REQUIRED`

## Decision

`DSH002_IMPLEMENTED_MULTI_SURFACE_NEEDS_SLICE_GATE`

The DSH-002 implementation and its own visual states are present. Global `slice:gate`
cannot be used as closure proof while DSH-001 remains `FIX_REQUIRED` with missing
visual-state evidence.
