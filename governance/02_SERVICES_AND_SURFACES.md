# 02 — Services and Surfaces

Status: ACTIVE_CANONICAL

## Service authority

A service is active only when its current service manifest, blueprint, contracts, implementation, and registered surfaces support that claim. This document defines ownership structure; it does not fabricate activation.

Registered service domains include `dsh`, `wlt`, `knz`, `arb`, `amn`, `esf`, `mrf`, `snd`, and `kwd`. Live service manifests own their current capability and readiness state.

## Surface authority

Supported surface identifiers are:

- `app-client`
- `app-partner`
- `app-captain`
- `app-field`
- `control-panel`
- `webapp`
- `website`

A capability uses only the surfaces required by Product Truth, role boundaries, and current contracts. A surface identifier does not prove that a route, screen, binding, or runtime exists.

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

Application folders are runtime shells. Reusable service-owned frontend behavior lives under `services/<service>/frontend/<surface>` or the service’s shared frontend owner.

## DSH/WLT boundary

- DSH owns operational commerce and delivery truth: stores, catalog, cart, checkout intent shell, orders, delivery lifecycle, readiness, execution, and operations visibility.
- WLT owns financial truth: wallets, payment sessions, refunds, settlements, payouts, commission, COD financial truth, ledger, reconciliation, finance reporting, and financial audit.
- DSH may hold WLT references and projected status only. DSH must not calculate or mutate authoritative financial truth.

## Acceptance condition

Accepted only when live manifests and code support every active-service claim, every capability declares required and excluded surfaces, app shells do not duplicate service ownership, and DSH/WLT financial truth remains separated.
