# 02 — Services and Surfaces

Status: CANONICAL

## Canonical services

dsh, wlt, knz, arb, amn, esf, mrf, snd, kwd.

## Canonical surfaces

app-client, app-partner, app-captain, app-field, control-panel, webapp, website.

## Service-owned structure

```text
services/<service>/
  SERVICE_BLUEPRINT.md
  service.manifest.ts
  contracts/
  domain/
  backend/
  database/
  clients/
  frontend/<surface>/
  providers/
  tests/
  guards/
```

Apps are shells only. Service frontend lives under `services/<service>/frontend/<surface>`.

## DSH/WLT boundary

DSH owns operational commerce/delivery truth: stores, catalog, cart, checkout intent shell, orders, delivery lifecycle, readiness, execution, operations visibility.

WLT owns financial truth: wallet, payment sessions, refunds, settlements, payouts, commission, COD financial truth, ledger, reconciliation, finance reports, audit.

DSH may store WLT references/status only. DSH must not calculate or mutate financial truth.

## Acceptance condition

Accepted only when active services declare blueprint/manifest and DSH/WLT financial truth is not mixed.
