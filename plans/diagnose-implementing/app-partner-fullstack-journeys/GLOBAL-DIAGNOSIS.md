# Global diagnosis — app-partner-fullstack-journeys

Pinned baseline: `bthwani2-boop/bthwani-suite-next@abbas` at `4dbcc1c39190d6c19da0a54e0a6db1f6f0582ce0`.

## 1. Diagnosis scope and method

The diagnosis followed the current authority chain rather than treating source code as policy. Current instruction was bounded to `app-partner` plus only proven dependencies. The active authority registry, unified governance, PRD, Engineering/Security/Delivery policies, applicable Product Truth, the current package schema/validator, Partner runtime/surface/shared code, DSH/WLT boundaries, control-panel section inventory, and the requested derived journey registry were inspected. Every seeded surface, control-panel section and cross-cutting domain has a classified record in `COVERAGE.json`; unrelated areas are explicitly excluded with reopen triggers rather than silently ignored.

`docs/architecture.drawio` was also inspected as requested and is zero bytes on the pinned commit. It is therefore evidence of an unavailable architecture artifact, not evidence of architecture. Architecture conclusions below come from canonical authority plus current code/contracts only. `plans/smsm-dsh-wlt-journeys/04-JOURNEY-REGISTRY.yaml` is used only as discovery support because the authority registry classifies that planning tree as derived support.

## 2. Repository architecture and truth ownership

The platform is one multi-surface system. Identity owns authentication, sessions, roles/permissions and trusted identity context. DSH owns Partner/Store operational state, catalog consumption/publication, order lifecycle, dispatch/custody, serviceability, support/rescue and operational analytics facts/projections. WLT exclusively owns wallet, ledger, payment/refund, settlement, payout, commission, COD financial custody/reconciliation and related financial mutation. Surface code renders, collects intent and coordinates canonical contracts; it cannot become a competing owner.

The current Partner runtime already shows several good fail-closed patterns: secure session storage and role/surface gating in `apps/app-partner/runtime/src/App.tsx`; explicit route-binding registry; no silent all-store fallback for store-scoped catalog/team/courier routes; server-backed order reads; and a Partner guard that rejects fake readiness, seeded scopes, unsafe catalog defaults, local optimistic order success, fake team results and local support cases. These controls reduce known failure classes but do not prove backend, database, runtime or cross-surface closure.

## 3. Surfaces and control-panel boundary

`app-partner` is fully in scope only for its proven product capabilities: activation/readiness, Store scope and settings, orders/notifications, central catalog and media/overrides, team/fleet, handoff/delivery exceptions, support, WLT-facing finance and Partner analytics/commercial readback.

Other surfaces are deliberately partial. `app-field` participates in Partner onboarding draft/evidence/submission only. `app-captain` participates in one-time Partner fleet binding, bilateral store handoff and shared support compatibility only. `app-client` participates when Partner/store publication or Partner order/custody truth changes what customers can discover/read, plus shared support-contract compatibility. `control-panel` participates through only the Partner-related slices of administration/roles, analytics, catalogs, marketing visibility gates, operations, partners, platform serviceability, support and WLT finance.

Generic DSH dashboard, HR and control-panel login sections are not canonical Partner writers or required Partner journey surfaces in the applicable Product Truth set and are excluded. Their exclusion must be reopened if implementation discovery proves a mandatory Partner dependency.

## 4. Backend, contracts, data, events, and integrations

Partner state-changing flows must follow the canonical path: surface intent → shared controller/adapter → registered contract/client → DSH or WLT owning backend → service-owned PostgreSQL state/transaction/audit/outbox as applicable → canonical readback → affected surface consumers. Partner/store scope must be proved server-side and cross-scope identifiers must fail without disclosure where the current contract requires it. Retriable mutations need stable idempotency; stale state requires OCC/locking; events and reconciliation must not create a second state machine.

DSH/WLT is the highest-risk boundary. The current Partner finance presentation composes actor wallet, commissions, payout destination and COD custody panels. The COD remit API is a real mutation carrying correlation and idempotency, so it must be proven all the way through authenticated DSH proxy/orchestration to WLT-owned ledger/audit/reconciliation. Settlement/commission values may not be calculated authoritatively by DSH or frontend.

## 5. Cross-surface Partner journeys

Eight non-overlapping concerns capture the complete evidence-backed Partner boundary:

1. Partner access, activation/readiness, trusted Store scope, field evidence, operator approval, serviceability and client publication prerequisites.
2. Partner order intake/accept/reject/preparation and canonical order readback before custody transfer.
3. Central catalog assortment, price/stock/media overrides, store settings, marketing visibility gates and client publication.
4. Store team plus one-time Partner fleet connection shared with Captain and redacted operator readback.
5. Bilateral store-to-Captain custody, reassignment and persistent handoff exceptions with client/operator readback.
6. Partner support conversation, order issue escalation and operator-owned incident/rescue with actor isolation.
7. Partner WLT readback and COD custody/remit through the financial ownership boundary.
8. Partner operational analytics/commercial readback and multi-store scoping.

These map to `U001` through `U008` and the dependency DAG in `EXECUTION-ORDER.json`.

## 6. Material defects and root causes

### D1 — Partner analytics selected-store binding is not explicit

The app supports a selected Partner Store scope and `AnalyticsInsightsPanel` receives `canonicalStoreId`, but `fetchPartnerPerformance(period)` sends no Store identifier. The backend `handlePartnerPerformance` resolves a Store through `partnerStore` and therefore cannot receive the UI-selected Store through this operation. In a Partner model that permits multiple Stores, the UI label/selection and the analytics query cannot currently be proven to refer to the same Store. Root cause: the analytics contract models actor-scoped performance but the surface presents selected-Store-scoped performance without an explicit authorized Store-intent contract. `U008` must resolve this at the contract/backend authorization boundary rather than by trusting an arbitrary client Store ID.

### D2 — Architecture artifact requested for review is unavailable

`docs/architecture.drawio` is empty on the pinned baseline. This is a repository documentation gap, but the task is not authorized to invent architecture content inside the package phase. Implementation must not use historical architecture assumptions. The reopen condition is a newer current-head architecture file or an explicit task to repair documentation.

### D3 — Several Partner-critical Product Truth capabilities are not closed product states

Onboarding is marked `READY_FOR_IMPLEMENTATION`; serviceability, support/rescue and settlement/commission capabilities are in `DISCOVERY`; handoff is a compatibility product model. Current code/guards therefore cannot be interpreted as evidence that these journeys are complete. The root cause is evidence/lifecycle incompleteness, not necessarily one code defect. Each affected unit defines the exact implementation and verification boundary needed before a stronger decision.

### D4 — Partner finance bridge requires vertical proof, especially COD remit

The UI bridge exposes actual financial panels, and COD remit accepts a proof reference and sends an idempotent mutation. Static frontend success is insufficient: WLT-owned authorization, legal state, ledger effect, reconciliation, audit, failure/unknown outcome and readback must all be proven. Any DSH/frontend-owned final financial truth is forbidden.

### D5 — Cross-surface success can be falsely inferred from Partner-only tests

Fleet, handoff, publication, support and financial journeys have required consumers outside `app-partner`. A Partner UI pass cannot prove Captain, Client, operator, database or WLT readback. The execution units therefore bind cross-surface compatibility and negative-path verification to the same candidate.

## 7. Execution boundary

Included areas are present only because a current Product Truth, canonical ownership rule, route/binding, backend contract, persistence invariant, security boundary or required readback ties them to Partner behavior. Generic areas are not included for completeness theater. In particular, Captain/Field financial/workforce flows, generic dashboard/HR/login work, unrelated marketing programs, unrelated provider/platform administration and unrelated client commerce are outside the execution boundary unless new pinned evidence proves a direct dependency and `COVERAGE.json` is updated first.

No product/runtime/governance code is changed by this package commit. All actual implementation occurs later inside the exact unit paths and must be re-based on the then-current remote head.

## 7.1 Latest-head reconciliation before write

The diagnosis was first assembled against `d354e757966296236c9a3c809e4d591dae72e13d`. Immediately before the write batch, `abbas` resolved to `4dbcc1c39190d6c19da0a54e0a6db1f6f0582ce0`. A GitHub commit comparison showed three intervening commits with only `tools/scripts/check-archpulse-config.ps1` changed. That path is outside the Partner execution boundary and did not alter the package schema, authority, Product Truth, DSH/WLT Partner paths, or the requested architecture artifact. The package was therefore re-pinned to the latest head without changing its diagnosis. `docs/architecture.drawio` was fetched again at the new head and remained zero bytes.

## 8. Residual uncertainty

No shell/runtime execution was available through the GitHub connector during package preparation. Therefore the official Node package validator, TypeScript, Go, PostgreSQL, mobile runtime, visual/RTL/accessibility, network failure, security isolation, WLT reconciliation and GitHub CI checks are not claimed as PASS here. The package is structured for strict validation and remote readback, but implementation closure remains `NEEDS_EVIDENCE` until the recorded commands run against the exact final implementation candidate. Current live branch movement must also be rechecked immediately before implementation.
