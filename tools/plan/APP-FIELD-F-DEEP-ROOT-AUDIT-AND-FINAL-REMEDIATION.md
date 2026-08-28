# APP-FIELD / branch `f` — Deep Root Audit & Final Root-Correct Remediation Ledger

## 0. Metadata and status

- **Repository:** `bthwani2-boop/bthwani-suite-next`
- **Branch:** `f`
- **Target application / execution anchor:** التطبيق الميداني (`app-field`)
- **Orchestrator entry point:** `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`
- **Orchestrator package revision:** `20`
- **Primary app-code audit baseline:** `ef90675f04f39ae1cce12bc19f875a7e6b15d93c`
- **Latest branch baseline immediately before this report:** `1efad91a8648fe1ecdf91ee36c2863581df21bc3`
- **Concurrent delta observed after the primary audit baseline:** one documentation-only commit adding `tools/plan/captain-app-root-correct-e2e-audit-execution.md`; no material `app-field` code delta was introduced by that commit.
- **Date:** 2026-08-29
- **Current closure state:** **NOT CLOSED**

> This file is an execution/closure ledger. It records the root graph, proven findings, canonical targets, required migrations, deletions, and proof gates. It is **not** itself evidence that the product defects have been fixed. Documentation records the fix; it must never substitute for the fix.

---

## 1. Governing execution law

`app-field` is an **Audit/Execution Anchor**, not an independent source of truth. Its complete material cone must be treated as one end-to-end system:

`Mobile Runtime → Identity/Workforce → DSH Field UI/Routes → Field Readiness Client → Governed HTTP → DSH Domain/AuthZ/Transactions → DB/Outbox → Control Panel governance → Partner/Store/Catalog authorities → WLT finance → Observability/CI/Release`.

The only valid execution loop is:

`AUDIT → INSPECT → DIAGNOSE → ANALYZE → HIGHEST PROVEN EXECUTABLE ROOT → CANONICAL TARGET → ROOT-CORRECT EXECUTION → MIGRATION/CUTOVER → CLEANUP/DELETION → VERIFY → RE-AUDIT → RE-RANK → REPEAT → FIXED POINT`.

Forbidden throughout this scope:

- Patch / workaround / fallback used to hide a violated invariant.
- Half migration or indefinite dual-write/dual-read.
- Parallel or shadow truth.
- UI-only fixes for backend/data/authorization roots.
- Client-provided actor authority where server identity is available.
- Leaving dead, superseded, placeholder, compatibility, or legacy mutation paths “for later”.
- Declaring `CLOSED` because screens render or tests are green while material roots remain unproven.

---

## 2. Material cone and canonical authority map

| Material area | Canonical authority / Source of Truth | `app-field` responsibility |
|---|---|---|
| Actor identity, role, surface, session | Identity | Authenticate and consume server-derived actor identity; never mint authority locally. |
| Workforce provisioning/status | Workforce | Gate access and represent incomplete/suspended states; not own HR truth. |
| Store assignment/object access | DSH canonical store scope (`store.ActorCanAccessStore`) | Request only objects allowed to the server-derived actor. |
| Visits/readiness/checks/escalations/work queue | DSH governed field-readiness domain | Submit intents, show server state, maintain non-authoritative offline intents. |
| Operator escalation/checklist-policy governance | Control Panel + governed backend | Consume resulting operational state; not create an operator authority. |
| Partner/store onboarding master truth | Canonical partner/store backend/data owner | Capture field inputs as explicit drafts/requests, never synthesize durable master truth. |
| Product/catalog truth | Central catalog authority | Upload/propose governed changes only; never own a second local catalog master. |
| Ledger/balance/payout financial truth | WLT | Read/request self-service through governed facade; never calculate or persist parallel financial truth. |
| Mobile cache/offline work | Mobile runtime secure storage | Temporary, actor-scoped execution state only; it must reconcile with server truth. |

Any implementation contradicting this table is a root violation, not a feature-specific exception.

---

## 3. Root graph

### 3.1 Runtime and navigation

`apps/app-field/runtime/src/App.tsx`
→ Identity gate
→ Workforce gate
→ field operational-readiness gate
→ field router policy / URL resolution
→ `DshFieldSurface` / `FieldRouteScreen`
→ DSH route renderer.

Material route kinds include at least:

- stores
- account
- profile
- profile-completion
- finance
- onboarding
- products-upload
- partner-progress
- visit
- verification
- checklist
- escalation
- work-queue

### 3.2 Operational mutation path

`app-field screen/user intent`
→ `services/dsh/frontend/shared/field-readiness/field-readiness.api.ts`
→ canonical mutation context / offline queue
→ governed HTTP route
→ authenticated field actor
→ `AuthorizeStore` / owned-visit checks
→ transactional mutation
→ durable operation receipt
→ DB state + required outbox side effects
→ reconciliation/read model
→ app and/or Control Panel consumer.

### 3.3 Offline path

`user intent`
→ operation identity
→ encrypted actor/install-scoped queue
→ online attempt or retry
→ unknown-result reconciliation against server receipt
→ committed / retryable / permanent failure
→ quarantine when necessary
→ governed operator/user resolution
→ deletion only after final resolution.

### 3.4 Onboarding path

`field capture`
→ explicit draft state
→ canonical identity/contact prerequisites
→ partner/store validation
→ submit/review/approval or governed rejection
→ canonical partner/store materialization
→ downstream assignment/catalog/readiness consumers.

There must be no durable “fake truth” used merely to satisfy intermediate UI/API requirements.

### 3.5 Finance path

`app-field`
→ DSH representative/field finance facade
→ WLT financial truth
→ read/request response.

Payout destination master management remains Control Panel-only; field client cannot become a second master-data owner.

---

## 4. Proven canonical boundaries to preserve

These are positive findings and must not be accidentally removed while fixing other roots.

### P-CAN-01 — Object authorization is server-side and assignment-scoped

`services/dsh/backend/internal/fieldreadiness/authz.go` provides `AuthorizeStore(...)` through `store.ActorCanAccessStore`, and owned-visit access validates actor ownership plus current store scope. Role/permission alone does not bypass object authorization.

**Required preservation:** every current and future field object reader/writer must funnel through equivalent canonical authorization. Add negative-space tests so a new route cannot bypass it silently.

### P-CAN-02 — Governed mutations already use durable idempotency and transactions

`services/dsh/backend/internal/fieldreadiness/idempotent_mutations.go` and `mutation_idempotency.go` establish a strong server model:

- operations include `create_visit`, `complete_visit`, `upsert_readiness_check`, `create_escalation`;
- mutation receipt is persisted transactionally;
- same actor/operation/idempotency-key is serialized with transaction-scoped locking;
- same key + different request hash is rejected as an idempotency conflict;
- same committed request can return the stored response;
- completion locks the visit and validates ownership/scope/state/geofence/checklist/evidence/escalation invariants;
- required commission outbox state is written in the same transaction as completion.

This is the canonical backend mutation boundary. The remediation must converge all writers on it rather than inventing a second idempotency mechanism.

### P-CAN-03 — Governed HTTP derives actor authority from authentication

`services/dsh/backend/internal/http/field_readiness_governed_handlers.go` requires authenticated field context and mutation headers, and derives fields such as `FieldAgentID` / `RaisedBy` from the authenticated actor rather than accepting client actor authority.

`field_readiness_routes.go` exposes the governed state-changing routes, including visit creation/completion, visit checks, and escalation creation, plus reconciliation/read routes.

### P-CAN-04 — Unknown-result reconciliation exists

The frontend offline sync does not blindly replay every ambiguous mutation. It can reconcile by operation/idempotency receipt before deciding whether an operation must be retried, and it supports quarantine/permanent-failure handling.

### P-CAN-05 — Finance ownership is correctly separated

The representative/field finance backend establishes field finance as read/request self-service, while WLT remains the financial truth and payout destination master data remains Control Panel-owned. This boundary is canonical and must stay exclusive.

---

## 5. Root-ranked material findings

### R1 — HIGH / PROVEN: route contract fails into a valid but unrelated business surface

**Evidence:** `services/dsh/frontend/app-field/components/DshFieldRouteRenderer.tsx` handles known route kinds and then falls through to `DshFieldPartnersScreen`.

**Root:** an unknown/unhandled route is treated as another valid business route instead of as contract drift. This is a semantic fail-open: new/invalid route states can be hidden behind a plausible screen.

**Canonical treatment:**

1. Establish one canonical discriminated route manifest for field routes.
2. Make rendering exhaustive (`switch` + `assertNever` or equivalent compile-time exhaustiveness).
3. Replace all business fallbacks with an explicit diagnostic unsupported-route boundary.
4. Generate or mechanically validate runtime/Expo/deep-link bridges against the canonical manifest.
5. Add positive tests for every route kind and negative tests for unknown/malformed routes.
6. Delete the final `DshFieldPartnersScreen` fallback and any superseded duplicate route definitions after cutover.

**Closure proof:** adding a new route kind must fail compilation/tests until its renderer and deep-link behavior are explicitly supplied.

---

### R2 — HIGH / PROVEN: generic session clearing can destructively erase unresolved field work

**Evidence:** `apps/app-field/runtime/src/index.ts` stores the field offline queue/quarantine in `expo-secure-store`, but the session-clear hook directly deletes the offline queue and quarantine storage.

**Root:** authentication-secret lifecycle and durable business-intent lifecycle are coupled. A logout/session reset is allowed to destroy unresolved queued/quarantined intents without a demonstrated server receipt or governed discard decision.

**Canonical treatment:**

1. Separate auth/session-secret cleanup from offline business-intent cleanup.
2. Keep unresolved intents encrypted and actor-scoped across logout/re-authentication.
3. A different actor must never see or execute the previous actor's queue.
4. The same actor after re-authentication must be able to resume reconciliation.
5. Define explicit resolved states: committed, superseded by canonical server state, or deliberately discarded through a governed decision.
6. Never delete quarantined items merely because credentials are cleared.
7. Record enough audit metadata to explain why/when an intent became terminal.
8. Purge only after proven resolution and retention policy permits it.

**Migration:** existing queue inventory must be classified before changing lifecycle. Do not silently drop legacy entries during schema migration.

**Closure proof:** logout/app restart/token revocation between local submit and server acknowledgement cannot cause silent work loss or cross-actor execution.

---

### R3 — HIGH / PROVEN ROOT WEAKNESS: client mutation identity is based on a 32-bit hash and conflates idempotency with correlation

**Evidence:** `services/dsh/frontend/shared/field-readiness/field-readiness.api.ts` builds mutation context with an FNV-like 32-bit stable hash and commonly derives both `idempotencyKey` and `correlationId` from the same deterministic fingerprint. Queue identity code also uses bounded hash-style identity.

**Root:** business-intent identity is not a sufficiently strong globally unique durable identifier, and tracing identity is conflated with business idempotency identity.

No observed collision is asserted here; the weakness is structural and code-proven.

**Canonical target — one mutation envelope:**

```text
schemaVersion
operationId        = cryptographically strong UUID/ULID/UUIDv7-class 128-bit+ identity generated once per user intent
idempotencyKey     = stable per business intent and persisted/reused across retries/restarts
correlationId      = separate trace/request-chain identity
operationType
payloadVersion
entity identifiers
createdAt
payload
actor              = server-derived authority, never trusted from client payload
installId          = cryptographically strong installation identity where needed for local partitioning only
```

**Canonical treatment:**

1. Introduce the envelope once in shared field-readiness infrastructure.
2. Generate the operation identity at user-intent creation, not at each transport attempt.
3. Persist it with the queued intent.
4. Reuse the same idempotency key for online retry/offline replay/restart reconciliation.
5. Use a separate correlation ID for observability.
6. Preserve server request-hash conflict detection.
7. Migrate queue schema in one bounded cutover; legacy identifiers remain readable only while actual legacy inventory exists.
8. After zero legacy inventory is proven, delete the 32-bit business-operation hash path and legacy parser.

**Closure proof:** property/concurrency/restart tests demonstrate unique stable operation identity and no accidental regeneration across retries.

---

### R4 — HIGH / LATENT PROVEN HAZARD: onboarding can synthesize durable placeholder business data

**Evidence:** `services/dsh/frontend/shared/field-onboarding/use-field-partner-onboarding-controller.tsx` contains `ensureDraftCreated(placeholder)` and can populate synthetic values including `متجر افتراضي`, `+967770000000`, and `temp-*` when placeholder mode is used.

A current direct production call with `placeholder=true` was **not proven** in this audit. Therefore this is not classified as proven live corruption; it is a dangerous durable capability whose continued existence violates the desired canonical model.

**Canonical treatment:**

1. Replace placeholder materialization with an explicit typed draft lifecycle.
2. Missing values stay absent/null/unverified according to schema; they are not forged.
3. Backend/DB must prevent promotion to canonical partner/store truth until required identity/contact/business invariants are satisfied.
4. Scan existing data for the exact known placeholder patterns and any structurally equivalent synthetic records.
5. For every match, classify canonical owner/source and repair, merge, recreate, or delete based on evidence; never blanket-rewrite unknown records.
6. Cut all consumers to the typed draft contract.
7. Delete the placeholder branch, constants, synthetic value generators, obsolete fixtures, and compatibility logic.

**Closure proof:** no production path can create partner/store master data with fabricated identity/contact/business values merely to advance onboarding UI.

---

### R5 — MATERIAL CLEANUP BLOCKER / CO-PRESENCE PROVEN, REACHABILITY UNPROVEN: legacy non-governed mutation APIs coexist with the governed path

**Evidence:** `services/dsh/backend/internal/fieldreadiness/fieldreadiness.go` contains older domain mutation functions such as non-idempotent visit creation while governed idempotent functions coexist in separate files.

The current registered field state-changing HTTP routes inspected are governed. Production reachability of every legacy function was not proven.

**Canonical treatment:**

1. Enumerate every caller of legacy state-changing field-readiness functions at exact final baseline.
2. Classify each as production, test-only, migration-only, dead, or generated.
3. Any production caller must be migrated to the governed transactional/idempotent boundary.
4. Update tests to target canonical behavior rather than keeping legacy APIs alive for test convenience.
5. Prove zero material consumers.
6. Delete or unexport the superseded mutation functions and their unique data paths.

No permanent compatibility wrapper is acceptable after zero-consumer proof.

---

### R6 — MATERIAL ARCHITECTURE RISK: route truth is represented in several layers and requires convergence proof

Runtime Expo route files, router policy, DSH route contracts, and DSH rendering bridges all participate in navigation. Multiple representations are acceptable only if one is canonical and the rest are generated/mechanically verified projections.

**Treatment:** establish the canonical route manifest, eliminate independently maintained overlapping truth where possible, and enforce bidirectional conformance tests for path parsing, route construction, deep links, role/surface gates, and renderer coverage.

---

## 6. Mandatory closure gates — unproven items must not be mislabeled as defects

The following were not fully proven from the evidence inspected and therefore are **Closure Gates**, not invented findings. They must be resolved before `CLOSED`.

### G1 — Complete writer coverage

Prove that **every production writer** for visit creation/completion, readiness checks, escalations, partner onboarding state, and field catalog operations uses the canonical governed path and canonical mutation envelope. Search, route registration, DI wiring, tests, jobs, scripts, migrations, and Control Panel consumers must all be included.

### G2 — Database invariants

Pin and prove schema/migration evidence for:

- durable mutation-receipt uniqueness on the intended actor/operation/idempotency identity;
- request hash and response/receipt integrity;
- visit/check/escalation foreign keys and ownership-relevant references;
- valid state/status `CHECK` constraints or equivalent domain enforcement;
- no orphan readiness/check/escalation state;
- uniqueness where the state machine requires it;
- atomic visit-completion/outbox semantics under rollback/concurrency;
- indexes supporting actor/store/work-queue/reconciliation access paths;
- migration/backfill behavior on real legacy rows.

If a required invariant exists only in Go/TypeScript and can be violated by another writer, either move/enforce it at the proper data/domain boundary or prove the repository has exactly one controlled writer and that bypass is impossible.

### G3 — Control Panel reconciliation authority

Prove a canonical operational workflow for:

- field provisioning/activation/assignment changes;
- checklist policy ownership/versioning;
- escalation review/resolution;
- mutation quarantine/reconciliation/operator decisions where human intervention is required;
- audit history of actor, operator, decision, reason, correlation, and final canonical state;
- payout master ownership remaining Control Panel-only.

The Control Panel may govern/resolve; it must not create a second mutation truth separate from DSH/WLT.

### G4 — Catalog authority

Prove end-to-end that field `products-upload`/batch workflows produce governed requests into the central catalog authority and do not create a local/parallel product/category master. Verify approval/rejection, duplicate handling, ownership, media, retries, and cleanup.

### G5 — Identity/Workforce negative states

Prove fail-closed behavior for:

- missing provisioning;
- incomplete profile when completion is mandatory;
- suspended/disabled/deactivated worker;
- revoked field role/surface;
- expired/revoked session;
- store assignment revoked while app is open/offline;
- actor switching on the same device.

### G6 — Product/UX/design/accessibility/RTL finishing

Every material screen/journey must have deliberate, testable behavior for:

- loading / empty / degraded / offline / retry / reconciling / quarantine / permanent failure;
- permission denied / assignment revoked / profile incomplete / session expired;
- duplicate submit prevention and visible committed state;
- Arabic RTL directional semantics, icon mirroring where semantic, layout order, truncation and mixed Arabic/Latin data;
- dynamic text/font scaling without hidden actions;
- TalkBack labels, roles, state announcements and logical focus order;
- minimum touch targets, keyboard/focus behavior where applicable, contrast and error semantics;
- no raw technical identifiers/errors leaking to users while preserving diagnostic correlation for support.

Visual polish is not closure unless failure and recovery journeys are equally finished.

---

## 7. Canonical final target architecture

### 7.1 One field mutation protocol

There is exactly one frontend mutation envelope and one governed backend mutation authority. Online and offline are transport states of the **same business intent**, not two implementations.

The app may optimistically represent pending work, but authoritative state comes from governed server state/receipt. Unknown server outcome always enters reconciliation before a dangerous replay.

### 7.2 Session lifecycle is not business-data lifecycle

Authentication secrets may be destroyed immediately when required. Unresolved business intents remain encrypted, actor-scoped, non-executable by other actors, and reconcilable after authorized re-entry. Final deletion requires a canonical result.

### 7.3 One route truth

A canonical route manifest owns route identity. Expo/router/deep-link/renderer layers are generated or mechanically verified projections. Unknown route states fail diagnostically; no valid business page doubles as a fallback.

### 7.4 Explicit onboarding draft truth

A draft is represented as a draft. Missing identity/contact/store fields remain missing/unverified until supplied. No synthetic master data is created to make intermediate APIs happy.

### 7.5 Exclusive domain authorities

- DSH owns field operational state and assignment authorization.
- Identity/Workforce own actor/provisioning status.
- WLT owns financial truth.
- Central catalog owns catalog truth.
- Control Panel owns operator policy/master actions assigned to it.
- Mobile owns only presentation, local execution state and encrypted unresolved intents.

---

## 8. Ordered root-correct execution plan

The sequence below is intentionally ordered to avoid parallel truth and unsafe deletion.

### Phase 0 — Re-pin and characterize the exact execution baseline

1. Pin exact `f` SHA before product mutation begins.
2. Recompute all files/callers/routes/data migrations inside the `app-field` material cone.
3. Add characterization tests only where required to protect proven current canonical behavior during migration.
4. Record active concurrent work and collision boundaries.
5. No source mutation may start from stale branch evidence.

### Phase 1 — Canonical mutation envelope and queue cutover

1. Define versioned envelope with strong operation ID, stable idempotency key, separate correlation ID and payload version.
2. Generate operation ID once at intent creation and persist it.
3. Upgrade queue schema (next version after current v3) with explicit migration.
4. Preserve legacy in-flight idempotency identity exactly so already-sent intents can reconcile safely.
5. New intents use only the new protocol; do not dual-generate two competing identities.
6. Drain/reconcile legacy inventory.
7. Instrument counts by queue schema/status without exposing PII.
8. After proven zero legacy inventory, delete legacy hash-based identity generation and legacy-only parser/migration code.

### Phase 2 — Correct session/offline lifecycle

1. Remove direct queue/quarantine deletion from generic auth-session clear.
2. Introduce actor-scoped secure intent retention.
3. On logout: stop execution, clear credentials, retain unresolved intents.
4. On same-actor login: reconcile then resume eligible work.
5. On different-actor login: isolate previous intents completely.
6. Implement explicit governed discard only for terminal cases with audit reason/authority.
7. Delete items only after committed/superseded/governed-discard resolution.

### Phase 3 — Route convergence and fail-closed rendering

1. Select/create the canonical route manifest at the correct owner.
2. Migrate all route constructors/parsers/runtime bridges/renderers.
3. Replace the partners business fallback with exhaustive handling and diagnostic unsupported-route state.
4. Add complete route/deep-link conformance tests.
5. Delete superseded parallel route declarations or make them generated projections.

### Phase 4 — Onboarding truth migration

1. Define backend/domain draft contract with explicit completeness/verification state.
2. Remove the need for fabricated name/phone/temp business values.
3. Add/verify server and DB promotion invariants.
4. Query exact placeholder patterns and structurally suspicious rows.
5. Reconcile each actual row to canonical identity/partner/store truth.
6. Migrate all consumers to explicit draft semantics.
7. Delete placeholder generation and obsolete compatibility/tests.

### Phase 5 — Eliminate legacy mutation surfaces

1. Build exact caller graph for every non-governed state-changing field-readiness function.
2. Cut production callers to governed transactional APIs.
3. Cut scripts/jobs/tests/migrations as appropriate.
4. Prove zero material consumers.
5. Delete/unexport the legacy mutable APIs and their unique helpers.
6. Re-run negative search/callgraph proof after deletion.

### Phase 6 — DB, Control Panel and catalog operational closure

1. Verify/add required DB constraints, uniqueness, FKs, checks and indexes at canonical owners.
2. Run deterministic migration/backfill; no write can depend indefinitely on compatibility state.
3. Verify Control Panel assignment/policy/escalation/reconciliation workflows and auditability.
4. Ensure quarantined field intents have a canonical resolution path without copying truth into the Control Panel.
5. Verify field product uploads terminate in central catalog authority; migrate/delete any local shadow catalog state.
6. Preserve WLT financial ownership and delete any discovered DSH/mobile parallel ledger/balance truth.

### Phase 7 — Product/UX/design/accessibility/RTL closure

For every screen/state/journey in the field route manifest:

1. Audit task intent, primary/secondary actions and destructive actions.
2. Finish loading/empty/offline/retry/reconciliation/quarantine/error/success states.
3. Make authorization and assignment revocation understandable without leaking internals.
4. Validate Arabic RTL and mixed-direction content.
5. Validate TalkBack/focus/labels/roles/state announcements/touch targets/text scaling.
6. Remove duplicated UI truth and one-off behavior that bypasses shared canonical state.

### Phase 8 — Deletion and finishing

Delete, once their cutovers are proven:

- `DshFieldRouteRenderer` business fallback;
- 32-bit hash helpers used as business operation identity;
- direct unresolved queue/quarantine purge behavior;
- placeholder onboarding branch/synthetic values;
- legacy non-governed state-changing field-readiness APIs;
- legacy queue schema/parser/migration code after zero legacy inventory;
- superseded route definitions after canonical route cutover;
- dead fixtures, stale compatibility code, unused exports and shadow configs found in the material cone.

No `TODO cleanup later` is acceptable inside the effective scope.

### Phase 9 — Verification, re-audit and fixed point

1. Pin the exact final candidate SHA.
2. Recompute the app material cone from that SHA.
3. Re-run all required static, unit, contract, DB, integration, runtime and E2E evidence.
4. Re-run negative-space searches/callgraphs for deleted roots.
5. Re-rank any newly exposed finding.
6. If any material finding remains, return to the highest proven executable root.
7. `CLOSED` is allowed only when the loop reaches a fixed point with zero known material root/gap/shadow truth/collision/unproven transition in the effective scope.

---

## 9. Verification matrix

### 9.1 Authorization / security

Must prove at minimum:

- field actor cannot read/write an unassigned store;
- field actor cannot access another actor's visit;
- revoking store scope takes effect on subsequent governed access;
- suspended/deactivated/revoked-role actor fails closed;
- client-supplied actor identifiers cannot escalate authority;
- malformed/unknown object IDs fail safely;
- Control Panel operator functions require their own explicit authority/context;
- logs/errors redact sensitive payloads while retaining safe correlation.

### 9.2 Idempotency / concurrency / transactions

Must prove:

- same key + same request returns the canonical committed result;
- same key + different request conflicts;
- concurrent duplicate submissions create one canonical mutation result;
- process/network failure before commit is safely retryable;
- failure after commit but before response reconciles to receipt without duplicate side effect;
- transaction rollback leaves no partial receipt/visit/check/escalation/outbox state;
- visit completion + required outbox are atomic;
- lock ordering does not create uncontrolled deadlocks under representative concurrency.

### 9.3 Offline and lifecycle

Test the matrix across online/offline/kill/restart/logout/reauth:

- submit while offline;
- network loss before server receives request;
- network loss after server commit before response;
- app kill during `syncing`;
- restart with queued/reconciling/quarantined work;
- logout with unresolved work;
- same actor re-authentication;
- different actor login on same install;
- store scope revoked while intent is queued;
- server state changed so pending intent is no longer valid;
- explicit governed discard.

No case may silently lose unresolved work, duplicate side effects, or execute another actor's intent.

### 9.4 State-machine invariants

Prove valid and invalid transitions for:

- visit creation → active → completion;
- readiness checks and evidence requirements;
- blocking escalations;
- checklist policy snapshots/version behavior;
- onboarding draft → eligible submit → approval/rejection/materialization;
- terminal failure/reconciliation;
- work-queue projection after each transition.

### 9.5 Navigation / UI

- every route kind renders its intended screen;
- path parse/build round trip;
- deep link to each material route;
- malformed/unknown route shows diagnostic failure, never an unrelated business page;
- back navigation and restart restore valid state only;
- permission/session/assignment changes invalidate stale screens safely.

### 9.6 Finance

- finance reads/requests use the governed facade/WLT truth;
- no field write can mutate payout destination master data;
- no DSH/mobile balance or ledger shadow truth exists;
- actor is server-derived.

### 9.7 Catalog/onboarding

- field product upload ends in central catalog governance;
- duplicates/retries do not create a second master;
- rejected/failed batches have deterministic status/recovery;
- onboarding can remain incomplete without fake master values;
- known placeholder patterns are absent after migration unless explicitly proven legitimate data.

### 9.8 Accessibility / RTL

On representative Android device/emulator and supported text scales:

- TalkBack announces labels/roles/errors/state changes;
- focus order follows task order;
- actionable targets remain reachable at large font sizes;
- RTL visual order and directional icons are semantically correct;
- mixed Arabic/Latin numbers/IDs/addresses remain readable;
- contrast and disabled/error states are distinguishable without color-only meaning.

### 9.9 Build / CI / release

At exact final candidate:

- TypeScript typecheck/lint/tests for affected packages;
- Go tests for DSH/backend affected domains;
- DB migration/up/down or forward/compatibility proof according to repository policy;
- contract/integration tests;
- Android field-app runtime build/smoke;
- E2E critical field journeys including offline/recovery and authorization negatives;
- repository-required CI/security/quality checks on the exact candidate;
- rollback/forward-fix procedure tested for schema/protocol cutover where rollback cannot simply restore old binaries.

Green checks are necessary evidence, not sufficient closure by themselves.

---

## 10. Negative-space closure gates

Final audit must prove the **absence** of all of the following:

- business-screen fallback for unknown field route;
- 32-bit/bounded non-cryptographic hash as canonical business operation identity;
- conflation of idempotency identity and observability correlation identity;
- generic logout/session clear that silently deletes unresolved business intents;
- cross-actor access to retained local intents;
- fabricated placeholder partner/store master truth;
- production state-changing field-readiness writer bypassing the governed mutation boundary;
- client-controlled actor authority;
- stale legacy mutation API with a material consumer;
- post-cutover legacy queue inventory or indefinite compatibility parser;
- orphan or invalid DB state for field visits/checks/escalations/receipts;
- DSH/mobile parallel WLT ledger/balance/payout truth;
- field/local shadow catalog master;
- unresolved Control Panel/manual reconciliation path whose result is not reflected in canonical domain truth;
- dead routes/screens/files/exports/configuration/fixtures created or exposed by the migration.

Any one surviving material item means `NOT CLOSED`.

---

## 11. Source-of-fix execution table

| Closure object | Primary source-of-fix | Required consumers/effects |
|---|---|---|
| Mutation identity/envelope | `services/dsh/frontend/shared/field-readiness` | app-field screens, offline queue, HTTP headers, reconciliation, backend receipt contract |
| Offline/session lifecycle | `apps/app-field/runtime` + shared field-readiness queue | auth logout/login, secure storage, sync UI, quarantine/recovery |
| Route exhaustiveness | DSH app-field route contract/renderer + runtime router bridge | Expo routes, deep links, screens, tests |
| Object authorization | DSH backend fieldreadiness/store scope | all reads/writes, work queue, visit/check/escalation, negative tests |
| Transaction/idempotency authority | DSH governed fieldreadiness backend | HTTP routes, DB receipt/outbox, frontend reconciliation |
| Onboarding draft truth | shared onboarding + canonical partner/store backend/data | field onboarding UI, Control Panel review, partner/store consumers |
| Legacy writer deletion | DSH fieldreadiness backend | all production/test/job/script consumers |
| DB invariants | canonical DSH migrations/schema/domain | governed mutation code, reconciliation, work queue, outbox |
| Operator reconciliation | Control Panel + governed DSH backend | escalations, quarantine/manual decisions, audit trail |
| Catalog ownership | central catalog backend/data + governed field batch path | field products-upload, partner/catalog consumers |
| Finance ownership | WLT; DSH facade only | field finance UI, Control Panel payout master |
| UX/A11y/RTL | app-field screens + shared UI kit | all field journeys/states on Android |

---

## 12. Exact fixed-point closure contract

The final candidate may be declared **CLOSED** only when all of the following are true on one exact SHA:

1. Every proven root above has been corrected at its actual source-of-fix.
2. Every required migration/backfill/cutover has completed without unresolved parallel truth.
3. Every listed delete-required artifact/path is deleted or has evidence proving it is still canonical and necessary.
4. All mandatory closure gates have concrete code/data/runtime evidence, not assumptions.
5. Negative-space search/callgraph/data checks are clean.
6. Authorization, offline/replay, state-machine, transaction, onboarding, catalog, finance, Control Panel, UX/A11y/RTL, and failure/recovery journeys pass on the exact candidate.
7. Required CI/security/quality checks are valid for the exact candidate SHA.
8. A fresh re-audit of the material cone exposes no new higher root.
9. Re-ranking produces no known material `Root`, `Gap`, `Shadow/Parallel Truth`, `Collision`, unproven transition/consumer, stale migration residue, or unfinished cleanup item.
10. The system has reached the Orchestrator fixed point; only then may status change from **NOT CLOSED** to **CLOSED**.

---

## 13. Current execution verdict

**NOT CLOSED.**

The audit proves that several important backend boundaries are already structurally strong: assignment-scoped authorization, server-derived actor identity, transactional/idempotent governed field mutations, reconciliation receipts, and WLT financial ownership. The remaining work is therefore not “rewrite everything”; it is to close the highest material roots without damaging those boundaries:

1. eliminate route fail-open business fallback;
2. decouple unresolved business intents from destructive session cleanup;
3. replace weak/conflated client mutation identity with one durable strong mutation protocol;
4. eliminate durable synthetic onboarding truth and reconcile any actual legacy data;
5. prove complete writer coverage and delete superseded mutation paths;
6. prove DB/Control Panel/catalog closure at their canonical owners;
7. finish all failure/recovery, accessibility and RTL journeys;
8. delete migration residue and re-audit to fixed point.

No report, recommendation, single green workflow, or visually working screen satisfies this contract by itself.