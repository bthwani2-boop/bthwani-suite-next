# Operational Root Evidence — Workspace System Root

Pinned truth/integration baseline: `A@8a244d7b2bb5a0193cd8a9ff7476892585175a1b`.

## Product operating model

BThwani is one unified multi-surface B2B2C commerce, fulfillment, workforce, operations and financial platform. The required operating surfaces are `app-client`, `app-partner`, `app-captain`, `app-field`, `control-panel`, backend/domain services, service-owned databases and shared generated clients/controllers/adapters/runtime infrastructure.

Primary actors are customer, partner, captain, field worker and operator. Service actors include Identity/Workforce/DSH/WLT/Providers/Platform-Control and runtime infrastructure.

## Canonical owners

- Identity: actor identity, credentials, authentication, activation, sessions, roles/permissions and trusted identity context.
- Workforce: employment/workforce profile, status, supervisor/shift/affiliation and workforce evidence.
- DSH: operational commerce, stores, catalog consumption, checkout/order, partner state, dispatch/delivery, serviceability, support/rescue and bounded app-facing projections.
- WLT: sole authoritative wallet/ledger/payment/refund/settlement/payout/commission/reconciliation and provider financial mutation truth.
- Platform Control: governed platform-wide configuration/rollout assigned by contracts.
- Providers: provider registration/capabilities/connection policy; secrets stay in approved runtime storage.
- Media runtime: governed object/document storage currently materialized by private MinIO runtime profile for DSH/media paths; it is infrastructure, not a competing business-truth owner.

## Material operating outcomes / journeys

1. Unified platform/context semantics across every surface.
2. Identity activation, login, refresh, revocation and actor administration.
3. Workforce provisioning/readiness/assignment for captain and field actors.
4. Partner onboarding, evidence, approval, first-store readiness and publication.
5. Store discovery, home discovery, central catalog and publication/serviceability gates.
6. Cart → serviceability → checkout intent → WLT financial handoff → one immutable order truth.
7. Partner acceptance/preparation/readiness → dispatch/assignment → store/captain bilateral custody → delivery/proof/exceptions → customer tracking/readback.
8. Zones/SLA/capacity/delivery-mode governance.
9. Field visits/readiness/escalation and workforce-linked operations.
10. Support tickets, incidents and order rescue.
11. Wallet/Cash-In/payment allocation/COD exposure/earnings/refunds/settlements/payouts/commissions/reconciliation/finance close under WLT ownership.
12. Platform configuration/change sets/provider health and governed rollout.
13. Operator administration, roles, approvals and audit.
14. Maps/service-area/address/location privacy.
15. Notifications, marketing, analytics/read models and special requests where registered by current DSH capability/contracts.
16. Cross-surface UX truthfulness, RTL/localization/accessibility/offline/error/recovery behavior.

## States and transitions

Material state families are contract-owned, not surface-local: actor/session states (`pending_activation`, `active`, `expired`, `blocked`, revoked/replay-rejected); partner/onboarding states (`draft`, `submitted`, review/readiness blocked, active/hidden/deactivated); commerce states (cart/serviceability, checkout eligibility, immutable order lifecycle); custody states (`awaiting_partner`, `partner_confirmed`, `completed`, `superseded`); financial states (pending/held/reserved/released/finalized/approved/frozen/executed/evidenced/verified/reconciled/completed/exception/unknown external result); and universal UI/runtime states (loading/empty/offline/forbidden/conflict/partial/error/recovery/success).

Legal transitions are owned by the backend/domain owner and require trusted context, object/business authorization, idempotency/concurrency controls and canonical committed readback. Surfaces render intent and readback; they do not create competing transition authority.

## Handoffs and flow graph

Canonical vertical flow: `surface interaction → shared controller/adapter → generated contract client → owning backend/domain rule → service-owned persistence/events/integration → canonical readback → all affected consumers`.

Key handoffs: Identity→Workforce provisioning/readiness; Field→DSH partner/store evidence; Partner→DSH fulfillment state; DSH→WLT payment/COD/payout-reference orchestration; DSH→Captain assignment/custody/delivery; WLT→approved financial provider/manual settlement evidence; Platform-Control/Providers→DSH/WLT consumers; owner readback→all required surfaces.

## Implementation/runtime boundaries proven at baseline

- Product surfaces: `apps/app-client`, `apps/app-partner`, `apps/app-captain`, `apps/app-field`, `apps/control-panel`.
- Shared runtime packages: `shared/control-panel`, `shared/data-runtime`, `shared/ui-kit`; shared config exists outside workspace package registration.
- Core bounded contexts: `core/identity`, `core/workforce`, `core/platform-control`, `core/providers`.
- Services: `services/dsh`, `services/wlt`.
- Contracts: root `contracts` plus bounded-context composed/generated OpenAPI paths.
- Canonical runtime: `infra/docker/compose.runtime.yml` with Identity/Workforce/Providers/Platform-Control/DSH/WLT APIs, PostgreSQL service-owned databases and MinIO media profile.
- Root commands expose full runtime profiles and type/build/lint/test/contract/binding/security/runtime guards.

## Canonical evidence sources

- `governance/GOVERNANCE.md`
- `governance/product/PRD.md`
- `governance/product/platform-model.yaml`
- `governance/product/contracts/bthwani-platform-model.product-truth.json`
- `governance/product/contracts/identity-activation-sessions.product-truth.json`
- `governance/product/contracts/partner-onboarding-store-publication.product-truth.json`
- `governance/product/contracts/order-creation-truth.product-truth.json`
- `governance/product/contracts/store-captain-handoff.product-truth.json`
- `governance/product/contracts/wlt-money-movement-settlement.product-truth.json`
- `services/dsh/capability-map.ts`
- `services/dsh/surface-map.ts`
- `services/dsh/runtime-map.ts`
- `services/dsh/service.manifest.ts`
- `services/wlt/service.manifest.ts`
- `pnpm-workspace.yaml`
- `package.json`
- `infra/docker/scripts/runtime.ps1`
- `infra/docker/compose.runtime.yml`
