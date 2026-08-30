# CONTROL PANEL / branch `f` — Deep Root Audit & Final Root-Correct Remediation Ledger

## 0. Metadata and live status

- **Repository:** `bthwani2-boop/bthwani-suite-next`
- **Branch:** `f`
- **Target application / Audit + Execution Anchor:** `apps/control-panel`
- **Requested scope:** لوحة التحكم كاملة: كل الأقسام، الصفحات، التبويبات، الحالات، الرحلات، العمليات، الصلاحيات، التكاملات، التصميم، UX، Accessibility، RTL، Backend/Data/Contracts/Auth/Runtime، وكل Writer/Reader/Consumer/Handoff مرتبط ماديًا بها.
- **Orchestrator entry point:** `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`
- **Orchestrator revision audited:** `20`
- **Primary audit baseline:** `7e1ecd37bb0f72ed3111f91fd44b2a535ce1dc89`
- **Live branch baseline before this ledger write:** `1bbef02ac34a62aad7e96dd415c984c1b1290b9d`
- **Concurrent work detected:** YES. Two commits advanced `f` after the primary baseline, both Captain/DSH-contract related. The delta touched `services/dsh/contracts/dsh.dispatch-governance.openapi.yaml`, `services/dsh/contracts/dsh.openapi.yaml`, `services/dsh/backend/internal/http/contact_proxy.go`, and `server.go`. Because Control Panel Operations contains Captain delivery-proof review, this delta is materially adjacent and must be revalidated rather than ignored.
- **Open PRs targeting `f` observed during the audit:** none at the inspected point.
- **Date:** 2026-08-29
- **Current closure state:** **NOT CLOSED — DEEP AUDIT / EXECUTION IN PROGRESS**

> This file is an execution and closure ledger, not a source of product truth and not proof of closure. The actual source of fix remains the correct code/data/contracts/runtime owners. Documentation records the fix; it must never substitute for the fix.

---

## 1. Governing law

The Control Panel is an **Audit/Execution Anchor only**. It is not allowed to become a second authority for Identity, Workforce, DSH, WLT, Partner, Store, Catalog, Order, Dispatch, Marketing, Finance, Support, Platform-Control, Maps, Provider, or other domain truth.

The only valid loop is:

`AUDIT → INSPECT → DIAGNOSE → ANALYZE → BUILD ROOT GRAPH → HIGHEST PROVEN EXECUTABLE ROOT → ACTUAL SOURCE OF FIX → ROOT-CORRECT EXECUTION → MIGRATION/CUTOVER/RECONCILIATION → CLEANUP/DELETION/FINISHING → VERIFY → RE-AUDIT → RE-RANK → REPEAT → FIXED POINT → EXACT FINAL CANDIDATE`.

Forbidden in this Closure Unit:

- patch / workaround / fallback that hides a violated invariant;
- half migration, dual truth, shadow truth, stale compatibility paths without a bounded migration purpose;
- UI-only treatment for backend/data/auth/contract roots;
- local Control Panel truth that duplicates another service authority;
- fake data, plausible zero/default values that conceal failed reads, or locally simulated business state presented as real;
- dead/experimental/superseded files retained merely “for later reuse” without a proven live consumer and necessary purpose;
- navigation-only access control where business authorization is required;
- green build/render as a substitute for Product/Journey/IA/Interaction/Visual/Rendered/A11y/Usability proof;
- declaring `CLOSED` while any material Writer/Reader/Consumer/Handoff/Permission/Transition/Failure state remains unproven.

---

## 2. Proven architecture: the app shell is not the implementation authority

A critical audit fact is already proven:

`apps/control-panel/runtime/src/app/**/page.tsx`
→ mostly thin Next.js composition wrappers
→ import actual business screens from `@bthwani/dsh/control-panel/*`
→ package export authority lives in `services/dsh/package.json`
→ implementation lives primarily under `services/dsh/frontend/control-panel/**`
→ shared business clients/controllers live under `services/dsh/frontend/shared/**`
→ domain authority continues into Backend / Contracts / DB / Identity / Workforce / WLT / Platform-Control / Providers.

Examples proven on the audited branch:

- `/dsh/dashboard` → `@bthwani/dsh/control-panel/dashboard`
- `/dsh/operations` → `@bthwani/dsh/control-panel/operations`
- `/dsh/partners` and partner detail/store surfaces → DSH control-panel partner modules
- `/dsh/catalogs` + governance → DSH catalog modules
- `/dsh/marketing` → DSH marketing modules
- `/dsh/platform` + policies → DSH platform modules
- `/dsh/administration` → DSH administration modules
- `/dsh/hr` → DSH HR/workforce modules
- `/wlt/finance` + payment sessions + ledger inspector → Control Panel finance/WLT integration.

**Consequence:** any audit or remediation limited to `apps/control-panel` is structurally invalid. The app folder is a composition/runtime boundary, not the full source-of-fix.

---

## 3. Route + shell inventory proven from the live tree

### 3.1 Public/runtime route roots currently present

DSH shell routes observed:

- `/dsh/login`
- `/dsh/dashboard`
- `/dsh/operations`
- `/dsh/analytics`
- `/dsh/analytics/operational`
- `/dsh/partners`
- `/dsh/partners/[partnerId]`
- `/dsh/partners/stores`
- `/dsh/catalogs`
- `/dsh/catalogs/governance`
- `/dsh/marketing`
- `/dsh/support`
- `/dsh/platform`
- `/dsh/platform/policies`
- `/dsh/administration`
- `/dsh/hr`

WLT/finance shell routes observed:

- `/wlt/finance`
- `/wlt/finance/payment-sessions`
- `/wlt/finance/ledger-inspector`

BFF/auth/runtime API roots observed inside the Control Panel runtime:

- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/refresh`
- `/api/auth/session`
- `/api/auth/activate`
- `/api/auth/dev-session`
- `/api/dsh/[...path]`
- `/api/platform-control/[...path]`
- `/api/providers/[...path]`
- `/api/workforce/[...path]`
- generic `/api/[service]/[...path]`

Runtime material owners include:

- `middleware.ts`
- `server/bff-proxy.adapter.ts`
- `server/csp-policy.ts`
- `server/session-cookies.ts`
- shell navigation/topbar/layout
- root styles and CSS variable contracts
- runtime startup/environment checks including Google Maps runtime contract.

### 3.2 Canonical primary navigation contract

`services/dsh/frontend/control-panel/navigation.ts` currently registers 11 primary sections:

1. الرئيسية / dashboard
2. العمليات / operations
3. التحليلات / analytics
4. الشركاء والمتاجر / partners
5. اعتماد الكتالوجات / catalogs
6. التسويق والاكتشاف / marketing
7. المالية والتسويات / finance
8. الدعم والمساعدة / support
9. المنصة السيادية / platform
10. الإدارة والصلاحيات / administration
11. الموارد البشرية / hr

This is only the **top-level IA contract**, not the full operational surface inventory.

---

## 4. Proven hidden depth beneath the 11 primary sections

The source tree proves that the real Control Panel is much larger than its route count. Major workspaces/components include at least the following.

### 4.1 Administration / Identity / authorization governance

- `AdministrationDashboardScreen`
- `AdministrationDiagnosticsPanel`
- `DecisionRollbackQueue`
- `RoleAssignmentApprovalQueue`
- `RoleDefinitionApprovalQueue`
- `GovernedAdministrationScreen`
- Actor list/create/detail
- Actor activation
- Actor commercial profile
- Actor sessions

### 4.2 Operations

- `CommandCenterScreen`
- carts activity
- checkout activity
- live orders
- pickup workbench
- delivery proof review
- dispatch assignment
- area capacity
- exceptions/escalations
- partner stores
- special operations
- assisted-order desk
- audit/support SLA
- audit trail detail
- order rescue
- operator intervention
- preparation alerts
- partner delivery SLA alerts
- pickup SLA alerts
- partner delivery workbench
- special flows including Shein/Awnak adapters

### 4.3 Partners + Stores + Field linkage

- Partner list/create/detail/unified/operational/governance/review queue
- field assignment workspace
- field readiness queue
- readiness checklist policy editor
- store management/admin table/detail/governance
- store service areas
- store delivery pricing
- partner fleet
- store creation wizard

### 4.4 Catalogs

- catalog dashboard
- approval
- governance
- reels review
- category control room
- category/product/store pickers

### 4.5 Marketing / discovery / commercial programs

`MarketingDashboardScreen` exposes 11 tabs:

- visibility gates
- store publication
- smart bar
- banners/carousel
- homepage promos
- campaigns
- partner offers
- coupons
- loyalty
- subscriptions
- signals/measurement

Related workspaces include campaigns, coupon funding reconciliation, coupon terms, loyalty policy, partner offers, ticker, subscriptions, store publication, home discovery, and measurement.

### 4.6 Finance / WLT

- finance dashboard
- commission governance
- settlement
- ledger inspector
- payment-session operations
- payout requests
- reconciliation cases
- refunds
- representative wallet lookup

### 4.7 HR / Workforce

- employee create/detail
- field-agent create/detail
- captain create/detail
- captain fleet memberships
- workforce reference
- workforce scopes
- provider list/type/core
- supervisor + zone selection

### 4.8 Platform / providers / maps / policy

- platform dashboard
- platform policies
- platform vars/workspaces
- platform change workflow
- rollout
- governance visual
- provider registry
- map-provider health/inspector
- service-area governance
- operational policy + governance
- address privacy
- onboarding fee policy
- sovereign leadership panel

### 4.9 Support

- support dashboard
- support workspaces
- platform notification configuration

**Closure implication:** every one of these live or materially connected modules must be classified as `LIVE_REQUIRED`, `INTERNAL_REQUIRED`, `MIGRATION_ONLY`, or `DELETE_REQUIRED`. Mere source presence is not proof of product completeness; equally, deleting a module without proving consumers is forbidden.

---

## 5. Root graph for the complete Control Panel Closure Unit

```text
Operator intent
  ↓
Next route / Shell / IA / tab / deep-link
  ↓
Control-panel screen / workspace / form / table / command deck
  ↓
Shared controller / query / mutation client
  ↓
Control Panel BFF / service proxy / auth-session boundary
  ↓
Canonical service API + authorization capability
  ↓
Domain use-case / transaction / state machine
  ↓
Canonical DB / outbox / external provider / WLT / Identity / Workforce
  ↓
Downstream readers and consumers
  ↓
app-client / app-partner / app-captain / app-field / Control Panel readback
  ↓
reconciliation / notifications / audit / support / analytics
  ↓
operator-visible final state
```

A feature is not complete merely because the Control Panel can submit an action. The loop must prove the downstream consumer and final-state readback.

---

## 6. Cross-surface integration is a first-class closure dimension

The Control Panel materially governs or observes state used by other BThwani surfaces. Therefore the audit must prove these bidirectional cones, not only outbound API success.

### 6.1 Captain cone

Control Panel Operations contains live `DeliveryProofReviewScreen`, dispatch/capacity, proof review and order operational workspaces. Captain owns execution-side delivery proof and dispatch participation. During this audit the branch advanced with a Captain delivery-proof OpenAPI contract correction, proving this is a live shared contract boundary.

Required proof chain:

`app-captain proof/dispatch intent → DSH canonical API/state → Control Panel review/decision → DSH terminal transition/outbox → app-captain/client/partner readback + WLT side effect where applicable`.

Any asymmetric state, stale status vocabulary, duplicated transition logic, or missing readback is a Closure Blocker.

### 6.2 Partner cone

Control Panel owns/hosts partner review/governance/store control while app-partner owns partner operational/self-service actions.

A positive shared-code bridge is already visible in marketing: the operator queue uses `usePartnerOffersController`, while the shared module also defines partner self-submission via `usePartnerSelfOffersController` with explicit ownership separation. This is the pattern to preserve.

Required broader proof chain:

`app-partner submission/change → canonical DSH state → Control Panel review/governance → canonical decision → app-partner readback/enforcement`.

This must be proven for offers, stores, catalogs, store publication, operations, team/scopes, delivery modes, service areas, commercial model, support and any partner-controlled lifecycle.

### 6.3 Field cone

Control Panel HR/Partners includes employee/field-agent provisioning, workforce scopes, field assignment and readiness policy/workspaces. app-field consumes Identity + Workforce + DSH assignments/readiness.

Required proof chain:

`Control Panel provision/assign/policy → Identity/Workforce/DSH canonical state → app-field eligibility/readiness/work queue → field mutation/result → Control Panel operational/readiness readback`.

### 6.4 Client cone

Catalog/marketing/store publication/platform policies and customer-facing discovery affect app-client directly.

Required proof chain:

`Control Panel governed publish/policy → canonical catalog/marketing/store truth → app-client eligibility/visibility/read model → analytics/support signals → Control Panel readback`.

No marketing/catalog UI is complete until actual client-facing visibility and rollback semantics are proven.

### 6.5 WLT cone

Control Panel finance and several DSH operational decisions interact with WLT-owned money truth.

Required proof chain:

`Control Panel governed request/decision → DSH/WLT canonical ownership boundary → ledger/payment/settlement/refund/payout effect → reconciliation → Control Panel + relevant user/partner/captain readback`.

Control Panel must never become a parallel ledger, balance, settlement or payout authority.

---

## 7. Root-ranked proven findings

### R1 — CRITICAL / PROVEN: the apparent app boundary hides the real source-of-fix

**Evidence:** Next pages are thin wrappers that import business screens from `@bthwani/dsh/control-panel/*`; `services/dsh/package.json` exports the canonical Control Panel modules.

**Failure mode:** treating `apps/control-panel` as the complete application produces superficial fixes at composition level while leaving DSH/shared/backend roots untouched.

**Canonical treatment:** maintain a route→screen→controller→API→domain→data→consumer matrix and always execute at the highest proven source-of-fix.

**Closure proof:** no material defect remains whose owner lies outside the Next shell but was skipped because the audit was folder-scoped.

---

### R2 — CRITICAL / PROVEN COVERAGE GAP: authentication is global, but business authorization is deliberately delegated downstream

`ControlPanelAuthBoundary` explicitly states that it authenticates the exact Control Panel session only and that business roles/permissions remain authorization concerns of protected APIs.

At shell navigation level, `useDshNavigation()` currently performs explicit visibility filtering for the `platform` section through `platform:read`; the other top-level sections are not equivalently filtered there.

This does **not** by itself prove an authorization bypass because individual screens/controllers/APIs may enforce the correct permissions. It does prove that closure cannot be claimed from the shell boundary.

**Required canonical treatment:**

1. Build a complete `section/tab/action → read permission → manage permission → service owner → backend guard` matrix.
2. Prove both UI affordance gating and backend enforcement for every privileged action.
3. Direct URL/deep-link access must fail closed.
4. Read-only users must not receive mutable UI that merely fails after submit.
5. Unauthorized API responses must render a clear authorization state, not empty/zero data.
6. No permission string may be invented locally; use canonical capability contracts.
7. Add negative-space tests for each privileged action family.

**Closure proof:** every top-level section and every mutation/deletion/approval/rollback has both positive and negative authorization evidence.

---

### R3 — HIGH / PROVEN: Operations contains retained experimental/superseded source by explicit design

`OperationsHubScreen.tsx` explicitly states:

> “Experimental source files remain available for later reuse, but cannot be reached … as live Operations surfaces.”

The same directory contains many alternative/proxy/workbench files beyond the live `SCREEN_RENDERERS` mapping, and `operations/index.ts` exports compatibility/proxy names including Shein/Awnak surfaces.

**Root:** source retention for hypothetical future reuse conflicts with Orchestrator Finishing unless each file has a necessary current purpose and real consumer.

**Canonical treatment:**

1. Enumerate every operations source/export.
2. Classify each as current live renderer, necessary adapter, test-only support, migration-only, or dead/superseded.
3. Trace every export consumer on exact branch SHA.
4. Delete dead/proxy/experimental residues after consumer proof.
5. Collapse duplicate names/re-export shims when they add no necessary boundary.
6. Replace `props: any` proxy boundaries where retained with explicit contracts.

**Closure proof:** no file/export remains solely because it might be useful later; no duplicate screen semantics exist in parallel.

---

### R4 — HIGH / PROVEN: Marketing KPI read failure is converted into plausible zero values without rendering the disclosure

`buildMarketingKpiMetrics()` returns an unbacked state with:

- `activeStoresRatio: "—"`
- `deliveredOrders: 0`
- `openTickets: 0`
- `openEscalations: 0`
- `isBackedByApi: false`
- a `disclosureReason`.

`useMarketingKpiMetricsController()` falls back to this shape when KPI reads fail.

`MarketingDashboardScreen` renders the KPI values directly (`0` for delivered orders/tickets/escalations) but does not render `isBackedByApi` or `disclosureReason` in the inspected implementation.

**Root:** backend/read failure can become a plausible operational dashboard state rather than an explicit unavailable/error state.

**Why severe:** zero delivered orders or zero open incidents is semantically different from “unknown because the analytics call failed.” This can mislead an operator.

**Canonical treatment:**

1. Model KPI state as explicit discriminated `loading | ready | empty-valid | unavailable/error`.
2. Never encode read failure as valid numerical zero.
3. Render a visible fail-closed state and retry path.
4. Preserve stale known-good data only if explicitly timestamped and labeled stale; never silently.
5. Apply the same audit to every dashboard/analytics/stat card across all sections.

**Closure proof:** simulated analytics failure cannot display a plausible zero business state.

---

### R5 — HIGH / PROVEN: cross-surface contract changes can land concurrently with Control Panel execution

During this audit `f` advanced by two Captain-oriented commits. One changed the canonical Captain delivery-proof OpenAPI request/response contract; Control Panel has a live Delivery Proof Review workspace consuming the same journey family.

**Root risk:** a Control Panel final candidate can become stale while concurrent work changes shared DSH contracts/backend semantics even when no Control Panel file changes.

**Canonical treatment:**

- maintain `ACTIVE_WORKSET` continuously;
- compare exact candidate against audit baseline before every integration/write/closure gate;
- invalidate only affected proofs based on Material Cone, not filename ownership alone;
- re-run contract/readback/journey verification for shared paths.

**Closure proof:** final verification is executed against one exact SHA after all materially overlapping concurrent changes are reconciled.

---

### R6 — HIGH / PROVEN SCOPE FACT: primary navigation under-represents the true operational capability count

The public navigation has 11 primary entries while source modules contain dozens of operational workspaces, nested tabs, detail flows, review queues, approval queues, editors, inspectors and policy surfaces.

This is not automatically bad IA. It is a closure hazard if nested reachability is not mechanically inventoried.

**Required treatment:** build `capability → owning primary section → subtab/deep link → states → actions` inventory and classify any implementation that has no reachable UX, no consumer, or no necessary internal purpose as a gap or deletion candidate.

---

## 8. High-risk areas that are BLOCKING until proved — no assumptions allowed

The following are not declared defective solely from filename presence; they are mandatory deep-audit streams because closure is impossible without evidence.

### B1 — Every action-state machine

For create/edit/delete/archive/approve/reject/activate/suspend/rollback/publish/refund/settle/assign/review actions, prove:

- allowed source states;
- validation;
- permission;
- object scope;
- idempotency/optimistic concurrency where required;
- transactional durability;
- retry semantics;
- terminal state;
- audit record;
- downstream side effect;
- readback.

### B2 — Every table/list/search/filter/pagination

Prove loading, empty, error, offline/unavailable, partial, unauthorized, stale, pagination, sorting, search, filter reset, selected-row/detail transition and mutation refresh semantics.

### B3 — Every nested tab and deep link

Prove URL ↔ tab state is canonical where deep-linkable; browser back/forward must not corrupt state; unknown query values fail closed to a valid explicit state.

### B4 — Forms and destructive actions

Prove required labels, server error mapping, validation parity, disabled/submitting states, double-submit resistance, confirmation for destructive operations and focus recovery.

### B5 — Accessibility

For every interactive workspace prove keyboard-only navigation, focus visibility/order, landmarks/headings, dialog focus trap/return, accessible names, table semantics, status/error live regions, non-color-only meaning, contrast and reduced-motion expectations.

### B6 — RTL + responsive behavior

Prove RTL at route, shell, tabs, tables, drawers, forms, charts, maps, icons/directional affordances and mixed Arabic/LTR identifiers. Verify narrow and wide desktop breakpoints and overflow behavior.

### B7 — Visual/design-system consistency

Audit raw inline styles, CSS modules, UI-kit use, spacing, color roles, typography, table density, action hierarchy, danger/warning semantics, empty/error/loading states and duplicated local design tokens.

### B8 — Runtime/BFF/session/security

Prove cookie flags, refresh/logout semantics, CSRF/origin assumptions, proxy allowlist, service routing, sensitive header forwarding, CSP, map-provider CSP, dev-session isolation, production fail-closed configuration and no browser exposure of backend secrets.

### B9 — Observability/auditability

Every high-impact operator mutation needs attributable actor, target, reason where required, before/after or version context, outcome, correlation/request/operation identity and retrievable audit trail.

### B10 — Data migrations / orphan states

Prove schema/state vocabularies across Control Panel + APIs + DB + other apps. Inventory obsolete statuses, legacy columns, parallel representations, abandoned rows and migration residue.

---

## 9. Cross-surface closure matrix — mandatory evidence

| Control Panel area | Canonical owner(s) | Other required consumers/surfaces | Closure requirement |
|---|---|---|---|
| Operations / orders | DSH | partner, captain, client, support, WLT where applicable | Every intervention/transition appears consistently on all affected surfaces. |
| Dispatch/capacity/proof | DSH | captain, client, partner | Assignment/proof/review/terminal readback is one state machine. |
| Partner/store governance | DSH + Identity where needed | app-partner, app-field, app-client | Provisioning, readiness, publication, suspension and scopes are enforced everywhere. |
| HR/workforce | Workforce + Identity + DSH scopes | app-field, app-captain | Activation/profile/status/scope lifecycle is coherent and no duplicate actor truth exists. |
| Catalog governance | Catalog/DSH canonical catalog | app-partner, app-client, app-field if relevant | Draft/review/publish/unpublish/version visibility closes end-to-end. |
| Marketing/discovery | DSH marketing + client-visible read model | app-client, app-partner | Publish/eligibility/audience/timing/rollback is actually enforced on consuming surfaces. |
| Offers/coupons/loyalty/subscriptions | DSH + WLT by ownership | client, partner | No Control Panel-only state; money/product/subscription ownership remains canonical. |
| Finance | WLT + governed DSH bridges | partner/captain/field/client as applicable | Reconciliation and ledger truth prove every operator request. |
| Support/escalations | DSH support | all operational apps | Intake, escalation, resolution and user-facing readback are connected. |
| Platform/provider/maps | platform-control/providers/DSH | all dependent surfaces | Policy/provider/config changes have health, rollout, rollback and consumer proof. |
| Administration/RBAC | Identity/authorization contracts | every Control Panel module | Permissions are canonical and enforced at both UX and API boundaries. |

No row may be marked closed from Control Panel tests alone.

---

## 10. Required execution waves — root-first, not folder-first

### Wave 0 — Live candidate and collision control

- continuously refresh `f` HEAD;
- record materially overlapping commits/PRs/worktrees where visible;
- compare deltas against this Material Cone;
- never overwrite concurrent work.

### Wave 1 — Complete inventory + Root Graph

- route manifest;
- primary + nested navigation;
- all exported screens/workspaces/components;
- all shared controllers/APIs;
- all backend routes/use-cases;
- all DB/state-machine owners;
- all cross-surface consumers.

Deliverable: no `UNKNOWN` material owner.

### Wave 2 — AuthN/AuthZ/RBAC and operator identity

- session restoration/login/logout/refresh/dev-session;
- section visibility;
- action permissions;
- object scope;
- capability contract parity;
- direct URL and direct API negative tests.

### Wave 3 — Operations + order/captain journey closure

- command center;
- cart/checkout/live orders;
- dispatch/capacity;
- pickup/proof review;
- exceptions/rescue/intervention;
- special ops;
- partner/captain/client readback;
- cleanup experimental/dead operation surfaces.

### Wave 4 — Partners / Stores / Field governance closure

- partner create/review/detail;
- store create/detail/governance/service area/pricing/fleet;
- field assignment/readiness;
- app-partner/app-field/app-client handoffs;
- delete duplicate or unreachable representations.

### Wave 5 — Catalog + Marketing + Client/Partner consumer closure

- category/product/catalog governance;
- publication/reels;
- visibility gates;
- home discovery/banners/promos/ticker;
- campaigns/offers/coupons/loyalty/subscriptions;
- actual consumer rendering/eligibility/readback;
- eliminate synthetic KPI/error semantics.

### Wave 6 — HR / Workforce / Identity closure

- employee/field/captain provisioning;
- actor/session/activation;
- scopes/supervisors/zones/fleet;
- suspension/deactivation/re-activation;
- exact app-field/app-captain access effects.

### Wave 7 — Finance/WLT closure

- finance dashboard;
- commission/settlement/refund/payout/reconciliation;
- payment sessions/ledger inspection;
- operator vs WLT ownership;
- end-to-end financial readback and audit.

### Wave 8 — Platform / Provider / Maps / Support / Analytics

- platform policy/change/rollout/rollback;
- providers/maps health/config;
- support workflows/notifications;
- analytics provenance/failure semantics;
- cross-surface enforcement and observability.

### Wave 9 — Product/UX/IA/Visual/A11y/RTL finishing

For **every** page/tab/state/journey:

`Product intent → Journey → IA → Interaction → Visual system → Component behavior → Rendered experience → Accessibility/usability`.

Delete dead CSS/tokens/components and unify duplicated patterns only after consumer proof.

### Wave 10 — Exact Final Candidate

- full type/build/tests for affected workspaces;
- Control Panel runtime tests;
- DSH contracts/OpenAPI;
- backend tests;
- DB/migrations where changed;
- journey tests across other apps;
- security boundary tests;
- rendered/manual evidence where required;
- re-audit source tree for dead/superseded/shadow truth;
- verify exact SHA and no materially overlapping delta after proof.

---

## 11. Mandatory verification families

A final candidate is not eligible for `CLOSED` unless all applicable families pass:

1. **Source/authority:** one canonical owner per truth.
2. **Compile/type:** all changed/affected TS/Go/contracts compile.
3. **Unit/component:** important state and interaction logic.
4. **Contract/OpenAPI:** generated/composed artifacts match source contracts.
5. **Database:** migrations, constraints, invariants, backfill, rollback posture.
6. **Auth/security:** authentication, authorization, object scope, cookies, proxy, CSP.
7. **Runtime:** production-like routing/BFF/session/config.
8. **Journey:** operator action through downstream consumer and final readback.
9. **Failure semantics:** loading/error/offline/unauthorized/stale/partial are explicit.
10. **UX/visual:** coherent IA, action hierarchy, responsive rendered experience.
11. **Accessibility/RTL:** keyboard, focus, semantics, contrast, RTL and mixed-direction content.
12. **Observability/audit:** attributable operator changes and diagnosable failures.
13. **Cleanup:** no dead/experimental/obsolete/duplicate/shadow artifacts remain in scope.
14. **Concurrency:** exact final SHA contains and reconciles all materially overlapping concurrent work.

---

## 12. Current proven positive boundaries to preserve

Not everything is wrong. Root-correct execution must preserve good boundaries rather than rewrite indiscriminately.

### P1 — Canonical navigation contract exists

`DSH_NAV_ITEMS` centralizes primary section labels/routes instead of scattering them across the shell.

### P2 — Platform navigation uses canonical permission read

`useDshNavigation` gates platform visibility through `hasControlPanelPermission(..., "platform:read")`, and the canonical authorization-capability contract registers `platform-control.read → platform:read`.

### P3 — Operations has internal permission gating

The inspected `OperationsHubScreen` calls `useOperationsPermission(activeGroup, activeSubGroup)` and renders an explicit denied state before mounting the active operational screen. This must be expanded/verified, not removed.

### P4 — Partner offer ownership separation is intentionally modeled

Shared marketing logic distinguishes operator review from partner self-submission; the operator does not create partner-originated offers through that controller. Preserve this single-truth separation while verifying backend enforcement and app-partner readback.

### P5 — Delivery-proof review uses live DSH controller semantics

The inspected Control Panel proof review screen loads actual DSH proof state, supports explicit unavailable/error states and uses expected version/reason on review decisions. It is materially coupled to the canonical Captain/DSH delivery-proof contract and must remain synchronized with it.

---

## 13. Immediate next audit targets after ledger creation

The audit must continue without waiting for a report-only milestone. Highest-priority next proofs:

1. **Permission coverage matrix** for all 11 sections + every mutation/approval/rollback.
2. **Operations dead/experimental source inventory** and consumer proof.
3. **Marketing KPI and all dashboard fallback semantics** — search entire Control Panel for error→zero/default/plausible data conversions.
4. **Cross-surface state vocabulary parity** for order, dispatch, delivery proof, store, catalog, offer, workforce, finance and support lifecycles.
5. **Partner/Field/Captain activation + scope handoffs** through Identity/Workforce and consuming apps.
6. **Catalog/marketing publication actual consumption** in app-client/app-partner, including cache invalidation/refresh/rollback.
7. **WLT ownership audit** for every Control Panel finance/commercial action.
8. **BFF/proxy/security audit** including service allowlist, cookie/session propagation, CSP and dev-session behavior.
9. **Rendered UX/A11y/RTL audit** for all pages/tabs/states, not only source review.
10. **Cleanup ledger** with explicit `DELETE_REQUIRED` candidates after exact consumer searches.

---

## 14. Closure ledger state

| Gate | State |
|---|---|
| Exact target + branch pinned | PASS for current checkpoint (`1bbef02…`), must re-pin continuously |
| Orchestrator revision read from branch | PASS |
| App treated as anchor, not independent authority | PASS |
| Runtime routes inventoried | PARTIAL-PASS; nested/deep-link inventory still expanding |
| Implementation modules inventoried | PARTIAL-PASS; major areas identified, exact consumer matrix pending |
| Cross-surface Material Cone | OPEN / BLOCKING |
| Permission matrix | OPEN / BLOCKING |
| Operations residue cleanup | OPEN / BLOCKING |
| Failure-state truthfulness | FAILED by proven Marketing KPI issue |
| Backend/data/state-machine parity | OPEN / BLOCKING |
| Product/UX/IA/Visual/A11y/RTL | OPEN / BLOCKING |
| Runtime/BFF/security | OPEN / BLOCKING |
| Migration/reconciliation/cleanup | OPEN / BLOCKING |
| Exact final candidate verification | NOT REACHED |
| Final fixed point | NOT REACHED |
| `CLOSED` | **NO** |

---

## 15. Non-negotiable final closure statement

The Control Panel is eligible for `CLOSED` only when repeated audit/execution loops reach a fixed point on one exact final SHA and there is:

- no known material Root or Gap;
- no missing section/page/tab/state/journey;
- no unproven business permission or object-scope boundary;
- no Control Panel-only truth that should belong to another service;
- no broken or one-way handoff to client/partner/captain/field/WLT;
- no misleading fallback/default business state;
- no dead/experimental/superseded/duplicate/shadow implementation residue;
- no incomplete migration/cutover/reconciliation;
- no materially unverified backend/data/contract/runtime consequence;
- no material UX/Visual/A11y/RTL defect within the Closure Unit;
- no concurrent materially overlapping change that invalidates the final proof.

Until all of those are evidence-backed, status remains **NOT CLOSED**.
