# Operational Negative-Space Challenge

Baseline: `A@8a244d7b2bb5a0193cd8a9ff7476892585175a1b`.

Purpose: actively search for material operating nodes omitted by the initial root map.

## Challenge dimensions

### Surface negative space

The repository contains exactly the five standard product application surfaces named by the PRD under `apps/`: client, partner, captain, field and control-panel. `apps/mobile` and helper PowerShell scripts are runtime/tooling helpers, not additional Product Truth surfaces. Product Truth records explicitly exclude `webapp`/`website` where no current published operational contract exists.

### Bounded-context negative space

Workspace registration and runtime composition expose `core/identity`, `core/workforce`, `core/platform-control`, `core/providers`, `services/dsh`, `services/wlt`, root contracts and shared packages. Runtime orchestration additionally materializes media through private MinIO and optional financial simulator/mail/cache/observability profiles. These helpers do not become durable product-truth owners.

### Journey/capability negative space

The Product Truth directory was inventoried at the pinned SHA. Material contracts include platform model, Identity activation/sessions, partner onboarding/store publication, order truth, captain dispatch/handoff, zones/SLA/capacity, maps/address privacy, support/order rescue, special requests, administration/audit, platform changes/executive read model, representative wallets, settlements/commissions and WLT money movement/settlement. DSH's capability registry additionally exposes discovery/catalog/cart/checkout/orders/dispatch/field/support/analytics/notifications/marketing/policies/admin/partner activation. These lower registry capabilities remain bounded under the PRD/owner contracts even where no same-named Product Truth file exists; absence of filename equality is not treated as proof of missing Product Truth.

### Ownership negative space

The PRD explicitly assigns Identity, Workforce, DSH, WLT, Platform Control, Providers and Media ownership. No second durable owner is authorized. Analytics is a read model only. Shared UI/data/controller packages and application surfaces are consumers/presenters, not owners.

### Trust/security negative space

Trusted Platform/Operator Context, actor role, business scope and object ownership are distinct. Client headers/query/body/local state cannot grant trusted context. Protected auth/session, PII/secrets, isolation and finance domains therefore remain part of root coverage even when a feature appears UI-only.

### Data/runtime negative space

Full-runtime scripts include service-owned databases for identity, workforce, providers, platform-control, WLT and DSH; MinIO is media storage. Migrations, generated clients, contract composition, provider integration, runtime readiness, CI and evidence are consumers/dependencies of operational outcomes and cannot be excluded as “infrastructure only.”

## Negative-space result

PASS for bounded Operational Root discovery: no additional material actor, standard product surface, canonical durable truth owner, top-level runtime API owner, or major Product Truth journey was found outside the recorded root categories. This PASS does **not** claim implementation completeness; lower-layer gaps discovered during implementation/runtime inspection remain findings/HOLD until rooted and clustered.

Evidence:
- `governance/product/PRD.md`
- `governance/product/platform-model.yaml`
- `governance/product/contracts/`
- `apps/`
- `core/`
- `services/`
- `shared/`
- `pnpm-workspace.yaml`
- `package.json`
- `infra/docker/scripts/runtime.ps1`
- `infra/docker/compose.runtime.yml`
