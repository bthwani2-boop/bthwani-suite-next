# DSH Service Blueprint

Status: ACTIVE_SERVICE_CONTRACT
Stage: SLICE_002_IMPLEMENTED

## Purpose

DSH owns operational commerce and delivery truth: store discovery, catalog, cart, checkout intent, orders, delivery lifecycle, readiness, execution, and operations visibility.

WLT exclusively owns wallet, payment, refund, settlement, payout, commission, COD financial truth, ledger, reconciliation, and finance reporting.

## Active contract endpoints

### System

- `GET /dsh/health`
- `GET /dsh/readiness`

### Store Discovery (DSH-001)

- `GET /dsh/stores` — public store list
- `GET /dsh/stores/{storeId}` — public store detail
- `GET /dsh/store-context` — actor-scoped store context (bearerAuth)
- `GET /dsh/operator/stores` — operator store list (bearerAuth)
- `GET /dsh/operator/stores/{storeId}` — operator store detail (bearerAuth)
- `PATCH /dsh/partner/stores/{storeId}/settings` — partner operating settings (bearerAuth)
- `POST /dsh/field/stores/{storeId}/verifications` — field verification (bearerAuth)
- `POST /dsh/captain/stores/{storeId}/pickup-readiness` — captain readiness (bearerAuth)
- `POST /dsh/operator/stores/{storeId}/governance` — lifecycle/visibility/serviceability (bearerAuth)
- `GET /dsh/operator/stores/{storeId}/audit` — audit timeline (bearerAuth)

### Home Discovery (DSH-002)

- `GET /dsh/home-discovery` — public home discovery payload
- `GET /dsh/operator/home-discovery/{kind}` — operator admin list (bearerAuth)
- `POST /dsh/operator/home-discovery/{kind}` — operator admin create (bearerAuth)
- `PATCH /dsh/operator/home-discovery/{kind}/{itemId}` — operator admin update (bearerAuth)
- `DELETE /dsh/operator/home-discovery/{kind}/{itemId}` — operator admin delete (bearerAuth)

## Active surfaces

- app-client — store discovery + home discovery (consumer)
- app-partner — store role context (partner)
- app-captain — store role context (captain)
- app-field — store role context (field)
- control-panel — store governance + home discovery admin (operator)

## Security boundary

All mutating and role-scoped endpoints require `Authorization: Bearer <token>`.
Public read endpoints (`/stores`, `/stores/{id}`, `/home-discovery`) require no authentication.

## Port

DSH API canonical runtime port: `58080` (container internal: `8080`, mapped to `58080`).

## Exclusions from current slices

- Storefront catalog (products, categories, media, overrides) — DSH-003
- Cart/serviceability — DSH-004
- Financial mutations — WLT-owned exclusively

## Evidence

Evidence belongs under `tools/registry/runs/<SESSION>`.
