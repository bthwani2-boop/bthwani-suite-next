# APP-FIELD / branch `f` — Deep Root Audit & Final Root-Correct Remediation Ledger

## 0. Metadata, authority and current verdict

- **Repository:** `bthwani2-boop/bthwani-suite-next`
- **Branch:** `f`
- **Target / execution anchor:** التطبيق الميداني (`app-field`) وكل ما يرتبط به ماديًا فقط
- **Exact live audit SHA:** `739aeaca3b74532146cc220cb40f241f5a676e29`
- **Exact branch HEAD at write preparation:** `739aeaca3b74532146cc220cb40f241f5a676e29`
- **Orchestrator entry point:** `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`
- **Orchestrator package revision:** `20`
- **Date:** 2026-08-29
- **Current closure verdict:** **NOT CLOSED**

> This file is the current execution/closure ledger for `app-field`. It records what the exact audited source proves, what remains open, what has already converged to a canonical boundary, and what evidence is still mandatory before final closure. **DOCUMENTATION RECORDS THE FIX; MUST NOT SUBSTITUTE FOR THE FIX.** Updating this file does not itself fix product source and does not authorize a `CLOSED` claim.

---

## 1. Governing execution law

`app-field` is an **Audit/Execution Anchor**, not an independent authority. The complete materially connected system must be treated as one graph:

`apps/app-field/runtime`
→ `Identity / session / installation boundary`
→ `Workforce provisioning and field access gate`
→ `DSH field routes/screens/controllers`
→ `field-readiness API/offline intent protocol`
→ `governed HTTP routes`
→ `server-derived actor + entity authorization`
→ `DSH transactional field-readiness domain`
→ `DB / receipts / outbox / migrations`
→ `Control Panel governance/reconciliation`
→ `Partner/Store/Catalog authorities`
→ `WLT finance authority`
→ `Observability / CI / release / rollback`.

The only accepted loop is:

`AUDIT → INSPECT → DIAGNOSE → ANALYZE → HIGHEST PROVEN EXECUTABLE ROOT → ACTUAL SOURCE-OF-FIX → ROOT-CORRECT EXECUTION → MIGRATION/CUTOVER → RECONCILIATION → CLEANUP/DELETION/FINISHING → VERIFY → RE-AUDIT → RE-RANK → REPEAT → FIXED POINT`.

Forbidden inside this scope:

- patch/workaround/fallback that hides an invariant violation;
- half migration or indefinite dual-read/dual-write;
- parallel/shadow/duplicate truth;
- UI-only treatment for backend/data/auth/runtime roots;
- compatibility residue retained without a bounded cutover reason;
- client-controlled actor authority when authenticated server identity exists;
- fabricated business/master data to advance a journey;
- keeping dead/superseded writers, parsers, routes or fixtures after zero-consumer proof;
- declaring `CLOSED` from documentation, visual rendering, historical CI, or partial tests.

---

## 2. Evidence taxonomy used by this ledger

Every material item must be classified into one of these states:

### `PROVEN OPEN ROOT`
Exact source evidence proves a violated invariant or unresolved root-correct migration/cutover gap. It must be fixed at its true source before closure.

### `LATENT PROVEN HAZARD`
Exact source proves a dangerous capability exists, but current production reachability or live data damage has not been proven. The capability still requires root-correct removal when it contradicts the target architecture.

### `PROVEN CANONICAL BOUNDARY`
Exact source proves the relevant authority/boundary already follows the canonical model. It must be preserved and protected with negative-space/conformance tests; it must not be “reimplemented” elsewhere.

### `MANDATORY CLOSURE GATE`
No defect is invented. The property is not yet fully proven on the exact final candidate and therefore remains mandatory evidence before `CLOSED`.

### `DISPROVEN / REMOVED FINDING`
A previous suspicion or stale plan statement was contradicted by newer exact-SHA evidence. It must not remain in the active root list.

---

## 3. Material cone and canonical authority map

| Material area | Canonical authority / Source of Truth | Allowed `app-field` responsibility | Forbidden shadow behavior |
|---|---|---|---|
| Actor identity/session | Identity/authenticated server context | Authenticate, retain local session material securely, consume server actor | Mint actor authority in payload or local truth |
| Workforce provisioning/status | Workforce | Gate field access and render allowed lifecycle states | Local HR/provisioning master |
| Field role/surface | Identity/Workforce policy | Require `field` + `app-field` | Client-side override/bypass |
| Store/entity assignment | DSH canonical store scope | Request only assigned/authorized entities | Role-only access or local assignment master |
| Visits/checks/escalations/work queue | DSH governed field-readiness domain | Submit/reconcile intents and render canonical results | Alternate non-governed production writer |
| Offline pending work | Actor-scoped mobile persistence, non-authoritative | Preserve unresolved intents and reconcile with server receipts | Treat queue as business truth or discard unresolved work silently |
| Onboarding partner/store master truth | Canonical partner/store backend/data authority | Capture explicit draft/request data | Durable fake partner/store values |
| Catalog/products | Central catalog authority | Proposal/upload/assortment workflow | Field-local product master |
| Field finance | WLT financial truth + governed DSH facade | Read/request self-service | DSH/mobile ledger/balance shadow |
| Payout destination master | Control Panel governed authority | Read resulting state only where allowed | Field app mutation of payout master |
| Reconciliation/manual decisions | Canonical DSH domain through Control Panel governance | Surface statuses/results | Panel-local shadow resolution |
| Navigation contract | One canonical field route manifest + verified projections | Render explicit supported routes | Business fallback for unknown route |
| Release evidence | Exact final candidate SHA | Execute required verification | Historical green run treated as proof |

Any implementation contradicting this table is a root violation, not a local exception.

---

## 4. Exact-SHA root graph

### 4.1 Runtime/auth/workforce path

`apps/app-field/runtime/src/App.tsx`
→ authenticated runtime/install boundary
→ `requiredRole="field"`
→ `requiredSurface="app-field"`
→ `WorkforceAccessGate(expectedKind="field")`
→ operational readiness gate
→ field navigation/runtime bridge
→ DSH field surface.

### 4.2 Route path

Runtime/Expo route representation
→ `apps/app-field/runtime/src/navigation/field-router-policy.ts`
→ DSH field route contract (`services/dsh/frontend/app-field/dsh-field.routes.ts`)
→ `DshFieldRouteRenderer.tsx`
→ explicit business screen.

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

### 4.3 Governed field-readiness mutation path

Field user intent
→ `services/dsh/frontend/shared/field-readiness/field-readiness.api.ts`
→ local operation envelope / offline queue when required
→ field-readiness HTTP contract
→ authenticated server actor
→ store/visit object authorization
→ governed transactional mutation
→ durable operation receipt
→ canonical DB state + required outbox effects
→ receipt/read/reconciliation
→ app and Control Panel consumers.

### 4.4 Runtime HTTP registration path

`services/dsh/backend/internal/http/field_readiness_routes.go`
contains the field-readiness route registration contract.

The exact audited runtime entrypoint:

`services/dsh/backend/cmd/dsh-api/main.go`

calls `httpapi.RegisterFieldReadinessRoutes(...)` after base router construction.

Therefore field-readiness route registration is **present on the audited SHA**; this is not an active missing-wiring root.

### 4.5 Offline path

Business intent
→ stable business-intent identity
→ actor/install-scoped persisted queue
→ online attempt or replay
→ unknown-result receipt reconciliation
→ committed / retryable / permanent failure / quarantined
→ canonical resolution
→ deletion only after terminal proof and retention rules.

### 4.6 Onboarding path

Field capture
→ explicit typed draft/request
→ missing/unverified values remain missing/unverified
→ server-side prerequisite validation
→ canonical partner/store creation or governed rejection
→ downstream assignment/catalog/readiness consumers.

No durable fake truth is permitted to satisfy intermediate UI/API requirements.

### 4.7 Finance path

`services/dsh/frontend/app-field/finance/WltFieldFinanceScreen.tsx`
→ WLT field-finance controller/facade
→ governed DSH representative/field finance endpoints
→ WLT financial truth.

Payout destination master remains Control Panel-owned.

---

## 5. What changed since the previous version of this plan

This section is mandatory because the previous ledger became stale after additional source work landed on branch `f`.

### 5.1 Previous “session clear destroys unresolved queue” wording is no longer valid as an active proven defect

The branch now contains later source/test work around offline session preservation and queue cutover. The old plan must not continue to assert that logout/session clearing indiscriminately deletes unresolved business work unless re-proven on the final candidate.

**Current classification:** session/offline lifecycle is a **closure-proof area**, while the remaining active root is identity convergence across migrated legacy operations and newly created operations.

### 5.2 Previous “32-bit mutation identity + idempotency/correlation conflation” wording is stale as a complete description

The field-readiness client/offline path has undergone protocol/identity modernization. The remaining concern is not correctly expressed as “everything still uses a 32-bit hash”.

**Current active root:** migration/cutover must prove that the **same semantic business intent has one canonical identity across new creation, persisted queue, legacy migration, replay and receipt lookup**. A migrated legacy intent and a newly materialized equivalent intent must not become two independent canonical operations.

### 5.3 Missing field-readiness HTTP runtime wiring suspicion is disproven

Exact audit shows:

- `services/dsh/backend/internal/http/field_readiness_routes.go` defines the governed registration;
- `services/dsh/backend/cmd/dsh-api/main.go` calls `httpapi.RegisterFieldReadinessRoutes(...)`.

**Classification:** `DISPROVEN / REMOVED FINDING`.

OpenAPI↔router↔handler conformance remains a mandatory regression gate, not an asserted defect.

### 5.4 Backend actor/object authorization is stronger than the early plan assumed

Exact backend evidence shows assignment/object checks and server-derived actor authority. These are now recorded as canonical boundaries to preserve, not open defects.

### 5.5 Governed backend idempotency/transactions are canonical positives

Durable mutation receipt handling, request-hash conflict semantics, transaction-scoped serialization, row locking and transactional completion/outbox behavior exist in the governed backend path. Remediation must converge all writers on this path rather than creating another idempotency subsystem.

### 5.6 Catalog and WLT boundaries are currently canonical-positive

No field-local master catalog or field-local financial ledger/balance authority was established in the audited material paths. These remain proof/negative-space gates rather than roots to reimplement.

---

## 6. Proven canonical boundaries that must be preserved

### P-CAN-01 — Runtime role/surface/workforce access is fail-closed

**Evidence path:** `apps/app-field/runtime/src/App.tsx`.

Observed canonical properties include `requiredRole="field"`, `requiredSurface="app-field"`, `WorkforceAccessGate(expectedKind="field")`, and a field operational readiness boundary before the DSH field surface.

**Preservation proof required:** negative tests for missing provisioning, mandatory profile incompleteness, suspension/disable/deactivation, revoked role/surface, expired/revoked session and actor changes.

### P-CAN-02 — Server-side entity authorization is assignment/object scoped

**Evidence path:** `services/dsh/backend/internal/fieldreadiness/authz.go`.

Store access converges through canonical DSH store actor scope (`store.ActorCanAccessStore`), while visit access requires ownership plus current store scope. Role/permission alone is not sufficient to bypass object authorization.

**Preservation proof required:** IDOR/foreign-store/foreign-visit tests for every reader and writer.

### P-CAN-03 — Governed mutations have durable idempotency and transactional semantics

**Evidence paths:**

- `services/dsh/backend/internal/fieldreadiness/idempotent_mutations.go`
- `services/dsh/backend/internal/fieldreadiness/mutation_idempotency.go`

Governed operations include:

- `create_visit`
- `complete_visit`
- `upsert_readiness_check`
- `create_escalation`

The governed implementation provides durable receipt semantics, serializes the actor/operation/idempotency identity, rejects same-key/different-request conflicts, can return stored committed results, locks relevant mutable state, validates transition invariants and writes required completion/outbox effects transactionally.

**Canonical rule:** do not build a second idempotency mechanism; eliminate or migrate any production writer that bypasses this one.

### P-CAN-04 — Governed HTTP actor authority is server-derived

**Evidence paths:**

- `services/dsh/backend/internal/http/field_readiness_governed_handlers.go`
- `services/dsh/backend/internal/http/field_readiness_routes.go`

State-changing field routes use authenticated field context; field actor authority must remain server-derived rather than trusted from client payload fields.

### P-CAN-05 — Field-readiness runtime route registration exists

**Evidence path:** `services/dsh/backend/cmd/dsh-api/main.go`.

`RegisterFieldReadinessRoutes(...)` is invoked on the production router composition path.

**Regression gate:** OpenAPI path ↔ runtime registration ↔ governed handler ↔ auth/object scope must remain mechanically checked.

### P-CAN-06 — Catalog ownership is central

**Evidence paths:**

- `services/dsh/frontend/app-field/components/DshFieldCatalogOperationsScreen.tsx`
- `services/dsh/frontend/app-field/components/DshFieldPartnerProductsScreen.tsx`

The inspected field flows consume central/master product truth and use proposal/assortment/upload operations rather than establishing a second field catalog master.

### P-CAN-07 — WLT remains financial truth; payout master stays outside app-field

**Evidence paths:**

- `services/dsh/backend/internal/http/representative_finance_routes.go`
- `services/dsh/frontend/app-field/finance/WltFieldFinanceScreen.tsx`

Field finance is a governed read/request self-service surface. WLT owns financial truth. Payout destination master data remains Control Panel-only. Actor identity must remain derived from authenticated context.

---

## 7. Current root-ranked material findings

## R1 — HIGH / PROVEN OPEN ROOT — Canonical Business Intent identity is not yet proven convergent across migration/cutover

### Evidence area

- `services/dsh/frontend/shared/field-readiness/field-readiness.api.ts`
- `services/dsh/frontend/shared/field-readiness/field-offline-queue.ts`
- current branch work includes offline session preservation and legacy queue cutover tests

### Root

The source has moved beyond the old “weak hash everywhere” model, but the migration boundary still requires one invariant to be made mechanically true:

> **One semantic business intent must map to one canonical durable operation identity regardless of whether it was created online, queued offline, persisted before upgrade, migrated from a legacy queue representation, replayed after restart, or reconciled through a server receipt.**

If migrated legacy records derive identity from legacy payload/fingerprint semantics while new operations use a newer normalized envelope, the same underlying business action can be interpreted as two different canonical intents. That creates duplicate-execution and nondeterministic-reconciliation risk even if each individual path is internally idempotent.

### Root-correct target

Establish exactly one versioned `BusinessIntentFingerprint` / semantic normalization authority with these properties:

```text
schemaVersion
operationId       strong 128-bit+ identity minted once per user intent and persisted
idempotencyKey    stable canonical business-intent identity reused across attempts/restarts
correlationId     separate observability/trace identity
operationType
payloadVersion
canonical entity identifiers
canonical normalized payload identity
createdAt
payload
actor             server-derived authority
installId         local partitioning only where materially necessary
```

### Required execution

1. Define one canonical versioned semantic normalization contract for each governed mutation type.
2. Make live online creation, offline persistence, replay, server receipt lookup and legacy migration use the same canonical intent semantics.
3. Mint `operationId` once at user-intent creation and persist it; never regenerate it per transport attempt.
4. Preserve the same idempotency identity across restart, retry, offline replay and unknown-result reconciliation.
5. Keep `correlationId` distinct from idempotency identity.
6. Migrate actual legacy queue inventory through a bounded migration.
7. For legacy records whose business identity cannot be deterministically reconstructed, **do not guess**; quarantine for governed reconciliation/manual decision.
8. Drain legacy inventory to zero.
9. Prove zero post-cutover legacy queue records.
10. Only then delete legacy parser/migration/fingerprint compatibility code.

### Required tests

- same intent online vs offline → same canonical business identity;
- pre-upgrade queued intent vs post-upgrade replay → one canonical operation;
- restart/retry → no operation identity regeneration;
- unknown result followed by reconciliation → committed receipt reused, not second mutation;
- same idempotency key + changed semantic payload → conflict;
- actor switch → no cross-actor identity reuse/execution;
- malformed/ambiguous legacy record → quarantine, never silent coercion.

### Closure condition

No legacy/new identity divergence remains in code, persisted inventory, tests or reconciliation behavior.

---

## R2 — HIGH / PROVEN OPEN ROOT — Route renderer is semantically fail-open

### Evidence

`services/dsh/frontend/app-field/components/DshFieldRouteRenderer.tsx`

Known route kinds are handled, but the renderer ultimately falls through to `DshFieldPartnersScreen`. `stores` is not represented as a deliberately exhaustive terminal branch; the business screen effectively acts as a catch-all.

### Root

An invalid, malformed, newly added or otherwise unhandled route can silently display a valid but unrelated business surface. This hides route-contract drift and violates fail-closed navigation semantics.

### Root-correct target

One canonical discriminated field-route manifest, with every other route representation generated from it or mechanically verified against it.

### Required execution

1. Establish the canonical field route manifest and owner.
2. Make `stores` explicit rather than dependent on catch-all behavior.
3. Implement exhaustive rendering with `switch` + `assertNever` or equivalent compile-time exhaustiveness.
4. Introduce an explicit unsupported/invalid route diagnostic boundary that does not render a business screen.
5. Converge runtime/Expo/deep-link/router-policy projections on the manifest.
6. Delete independent duplicate route truth where possible.
7. Delete the `DshFieldPartnersScreen` fallback after cutover.

### Required tests

- positive render/path/deep-link test for every route kind;
- unknown route fails diagnostically;
- malformed params fail safely;
- adding a route kind fails compile/test until renderer and projections are supplied;
- role/surface gate cannot be bypassed by deep link;
- backward/forward navigation preserves intended state without mapping to a fallback screen.

### Closure condition

There is no business fallback for an unknown field route anywhere in the material cone.

---

## R3 — HIGH / LATENT PROVEN HAZARD — Onboarding retains a durable fake-data capability

### Evidence

`services/dsh/frontend/shared/field-onboarding/use-field-partner-onboarding-controller.tsx`

The controller still exposes placeholder-capable draft creation and contains synthetic values such as:

- `متجر افتراضي`
- `+967770000000`
- `temp-*`

No exact current production caller of `ensureDraftCreated(true)` was proven in this audit.

### Correct classification

This is **not evidence of live corrupted rows**. It is a source-proven dangerous capability that can fabricate durable business/master-like truth and therefore violates the desired architecture even when currently unreachable.

### Root-correct target

A typed onboarding draft lifecycle in which missing/unverified data remains missing/unverified until canonical server prerequisites are met.

### Required execution

1. Define explicit draft states and nullability/verification semantics.
2. Remove placeholder business identity/contact/name generation from the durable creation API.
3. Make backend/DB promotion/materialization fail closed until required partner/store prerequisites exist.
4. Perform an exact final-baseline caller inventory for the placeholder-capable function/branch.
5. Scan canonical data for exact known placeholders and structural equivalents.
6. Classify every actual match by source/owner and reconcile using evidence: repair, merge, recreate or delete as appropriate.
7. Never blanket-rewrite unknown records.
8. Cut all onboarding consumers to the typed draft contract.
9. Delete placeholder constants, generator branches, obsolete fixtures and compatibility residue.

### Required tests

- missing name/phone/contact stays explicitly absent/unverified;
- canonical partner/store materialization rejects incomplete prerequisites;
- no client flow can manufacture durable placeholder identity to advance UI;
- data migration/reconciliation is repeatable and produces zero known placeholder residue.

### Closure condition

The fake-data capability is absent from production source and zero affected persisted records remain unresolved.

---

## R4 — MATERIAL CLEANUP BLOCKER / CO-PRESENCE PROVEN, PRODUCTION REACHABILITY NOT FULLY PROVEN — Legacy non-governed field mutation APIs coexist with the canonical governed path

### Evidence

`services/dsh/backend/internal/fieldreadiness/fieldreadiness.go`
coexists with the newer governed/idempotent mutation implementation in:

- `idempotent_mutations.go`
- `mutation_idempotency.go`

The registered field state-changing HTTP path inspected is governed. This audit does **not** claim every legacy function is reachable in production.

### Root

A superseded state-changing API cannot remain indefinitely beside the canonical writer because it creates a future bypass/shadow-writer surface even if today it is only test/dead code.

### Required execution

1. Enumerate every caller of each legacy state-changing function on the exact candidate SHA.
2. Classify each caller: production, test-only, migration-only, generated, or dead.
3. Migrate every production caller to the governed transactional/idempotent path.
4. Update tests to exercise the canonical API rather than retaining old functions for convenience.
5. Prove zero material consumers.
6. Delete/unexport superseded mutation functions and their unique helpers/data paths.
7. Re-run negative-space search proving no alternate state-changing writer remains.

### Closure condition

Exactly one production mutation authority exists for field readiness; no legacy writer remains reachable or retained without a bounded migration reason.

---

## 8. Offline/session lifecycle — current status and remaining proof

The old ledger overstated this as an active destructive-clear defect. Later branch work must be recognized.

### Current classification

**Not an active proven destructive-clear root on this audit baseline; remains a mandatory closure-proof domain.**

### Must still be proven on final candidate

1. unresolved business intents survive logout/session invalidation when preservation is required;
2. auth secret deletion is independent from unresolved business intent lifecycle;
3. same actor can resume reconciliation after re-authentication;
4. a different actor on the same device cannot see or execute another actor's queue/quarantine;
5. token revocation between submit and acknowledgement cannot silently lose intent;
6. restart/crash during persistence/replay is deterministic;
7. quarantine is durable until canonical terminal resolution;
8. deletion occurs only after committed/superseded/governed-discard terminal proof plus retention policy;
9. migration does not silently drop unresolved legacy entries;
10. telemetry/audit state can explain terminal outcomes without leaking secrets.

If any of these fails, treat the highest source-of-fix as an open root and re-rank before lower work.

---

## 9. Mandatory closure gates — do not invent defects where proof is incomplete

## G1 — Complete writer/reader/consumer inventory

Before closure, build an exact candidate-SHA call graph/inventory for:

- visit creation/completion;
- readiness checks;
- escalations;
- work queue and receipt reconciliation;
- onboarding partner/store writes;
- assignment changes;
- catalog proposal/upload/assortment writes;
- finance request/read paths;
- Control Panel manual decisions;
- jobs/scripts/migrations/test helpers that can write canonical tables.

Every material writer must terminate at the canonical authority. Every alternate writer must be migrated or deleted.

---

## G2 — Database invariants and migrations

The exact source audit proves the backend code uses durable receipt semantics, including the `dsh_field_readiness_operation_receipts` domain in mutation idempotency code, but this pass did not fully pin every underlying migration/constraint/index from the database tree. Therefore no DB defect is invented; these are mandatory closure gates.

Prove on the exact final candidate:

- durable receipt uniqueness for intended actor/operation/idempotency identity;
- persisted request hash + canonical committed response/receipt integrity;
- visit/check/escalation foreign-key integrity;
- ownership-relevant references cannot orphan;
- valid transition/status constraints or an equally strong invariant that no alternate writer can bypass;
- uniqueness where the state machine requires it;
- transaction rollback leaves no partial completion/outbox state;
- concurrent mutation behavior is serialized correctly;
- actor/store/work-queue/reconciliation queries have required indexes;
- migration/backfill handles actual legacy rows deterministically;
- no invalid/orphan rows remain after migration;
- downgrade/forward-fix behavior is defined for protocol/schema cutover.

If an invariant exists only in application code while another writer can bypass it, enforce it at the proper authoritative layer or eliminate the bypassing writer.

---

## G3 — Control Panel operational/reconciliation closure

Prove that Control Panel is a governance surface, not a second domain truth.

Required capabilities/evidence:

- field provisioning/activation/assignment lifecycle where owned by Control Panel;
- checklist policy ownership/versioning if materially applicable;
- escalation review/resolution;
- quarantine/ambiguous mutation reconciliation when manual decision is required;
- every manual decision writes back to canonical DSH state/receipt, never a panel-local resolution store;
- operator, affected actor/entity, decision, reason, correlation/operation identity, timestamp and final canonical state are auditable;
- payout destination master remains Control Panel-only and app-field cannot mutate it;
- permission/role separation prevents unauthorized operator actions.

Any manual “resolved” state that exists only in Control Panel is a shadow truth and blocks closure.

---

## G4 — Catalog boundary proof

Preserve the currently canonical-positive model and prove:

- every field catalog write ends in the central catalog authority;
- no local/mobile/DSH shadow master product truth exists;
- retries/duplicate uploads are idempotent or deterministically reconciled;
- partial batch failure has a deterministic recover/retry model;
- partner/store assortment/proposal state cannot silently diverge from canonical products;
- dead legacy product-import paths and duplicate schemas are deleted after cutover.

---

## G5 — WLT/finance boundary proof

Preserve the currently canonical-positive model and prove:

- WLT remains sole balance/ledger financial truth;
- app-field/DSH does not calculate or persist a second authoritative balance;
- field finance endpoints remain read/request self-service only;
- payout destination master mutations are not exposed to app-field;
- server derives actor authority from session;
- duplicate financial requests have safe semantics;
- failed/unknown financial requests reconcile against canonical WLT state;
- no stale DSH/mobile financial shadow tables/caches are treated as truth.

---

## G6 — Product/UX/design/accessibility/RTL/failure-state completeness

Every material field journey must deliberately implement and test:

- loading;
- empty;
- degraded dependency;
- offline;
- retryable failure;
- syncing;
- unknown-result reconciliation;
- quarantined/manual-review state;
- permanent failure;
- permission denied;
- assignment revoked;
- profile incomplete;
- session expired/revoked;
- duplicate submit / already committed result;
- stale data and refresh semantics;
- safe retry after process restart.

Arabic/RTL and accessibility proof must include:

- semantic RTL ordering, not merely mirrored containers;
- directional icons/arrows and navigation affordances;
- mixed Arabic/Latin/numeric content;
- truncation/long names/long error text;
- dynamic font scaling;
- TalkBack labels, roles, states and actionable hints;
- logical focus order;
- touch target size;
- contrast;
- disabled/loading/error semantics;
- safe user-facing error wording while preserving a diagnostic correlation/operation reference for support.

A visually green screen is not closure evidence.

---

## G7 — Contract/runtime conformance

Although the suspected missing registration was disproven, prevent recurrence mechanically.

Prove:

- every OpenAPI field-readiness route required by app-field is registered in runtime composition;
- every registered public field route is represented in canonical contract or deliberately internal;
- state-changing routes use governed handlers;
- auth/role/surface/object checks are applied consistently;
- contract-generated/request-response schemas match frontend consumers;
- runtime smoke exercises work queue, visits, checks, escalations and receipt reconciliation;
- duplicate/shadow route tables are absent.

---

## G8 — Observability and operational diagnosis

Prove that failures can be diagnosed without weakening security:

- correlation ID and operation ID are separately available where appropriate;
- logs do not expose secrets/session tokens or sensitive payload fields;
- retry/quarantine/reconciliation state is observable;
- duplicate/idempotency conflicts are distinguishable from generic failures;
- authorization denials are auditable without revealing protected entity existence;
- Control Panel/operator actions are linked to canonical final results.

---

## 10. Re-ranked root-correct execution sequence

The sequence below replaces the stale ordering in the previous plan. At every phase, re-audit first; if a higher root appears, preempt lower work.

### Phase 0 — Re-pin exact execution baseline and active-workset delta

1. Pin branch `f` HEAD immediately before product mutation.
2. Compare against audit SHA `739aeaca3b74532146cc220cb40f241f5a676e29`.
3. Classify concurrent changes for material overlap.
4. Rebuild material cone/caller inventory for changed areas.
5. Never overwrite concurrent canonical work blindly.

**Exit:** execution baseline and ownership/collision status are explicit.

### Phase 1 — Canonical Business Intent identity and legacy queue cutover

Execute R1 at shared field-readiness source-of-fix.

Deliver:

- canonical versioned business-intent normalization;
- one strong operation identity lifecycle;
- stable idempotency identity;
- separate correlation identity;
- deterministic migration for recoverable legacy records;
- quarantine for ambiguous legacy records;
- zero legacy inventory proof;
- deletion of legacy parser/fingerprint/migration after zero inventory.

**Exit:** same business intent cannot split into different canonical operations across online/offline/pre-upgrade/post-upgrade paths.

### Phase 2 — Offline/session lifecycle and cross-actor proof

Prove/fix unresolved-intent preservation, auth/business lifecycle separation, same-actor resume, different-actor isolation and deterministic quarantine/reconciliation.

**Exit:** no silent work loss, cross-actor execution or indefinite unresolved shadow state.

### Phase 3 — Route authority convergence and fail-closed rendering

Execute R2.

Deliver:

- canonical manifest;
- explicit `stores` branch;
- exhaustive renderer;
- invalid-route diagnostic boundary;
- generated/verified projections;
- deletion of business fallback/duplicate route truth;
- positive and negative route tests.

**Exit:** unknown route cannot render any business screen.

### Phase 4 — Onboarding truth cleanup

Execute R3.

Deliver:

- typed explicit draft lifecycle;
- server/DB promotion prerequisites;
- placeholder capability deletion;
- exact data scan;
- evidence-based reconciliation of real matches;
- zero placeholder residue proof.

**Exit:** no fabricated business truth path or unresolved affected data remains.

### Phase 5 — Legacy mutation cutover/deletion

Execute R4.

Deliver:

- complete caller classification;
- production cutover to governed mutations;
- canonical test migration;
- zero material consumer proof;
- delete/unexport superseded writer APIs and exclusive helpers.

**Exit:** one production mutation authority.

### Phase 6 — DB invariants and migration closure

Execute G2 with exact migrations/schema evidence and real-row reconciliation.

**Exit:** DB cannot retain/accept materially invalid state through any remaining writer; migration is complete and cleanup is finished.

### Phase 7 — Control Panel governance/reconciliation closure

Execute G3.

**Exit:** all operator/manual decisions converge to canonical DSH/WLT/Workforce authorities with auditability and no panel shadow truth.

### Phase 8 — Catalog and WLT boundary conformance

Prove G4/G5 and delete any discovered stale/shadow residue.

**Exit:** one catalog truth and one financial truth remain.

### Phase 9 — Product/UX/A11y/RTL/failure-state finishing

Execute G6 across every material screen/journey/state.

**Exit:** complete Arabic/RTL/accessibility/error/recovery behavior is evidence-backed, not inferred from happy-path rendering.

### Phase 10 — Negative-space sweep and physical cleanup

Delete everything proven dead/superseded after migration/cutover:

- route business fallback;
- duplicate route manifests/projections that are not generated/verified;
- legacy business-intent parser/fingerprint/migration after zero inventory;
- stale queue schema support after bounded cutover;
- placeholder onboarding branches/constants/generators/fixtures;
- legacy non-governed mutation APIs after zero consumers;
- orphaned handlers/routes/exports/types/tests/config unique to deleted paths;
- shadow financial/catalog/readiness state;
- obsolete migration/backfill helpers after completion where policy permits deletion;
- stale docs/comments that describe removed behavior.

**Exit:** negative-space inventory is clean.

### Phase 11 — Exact final candidate verification and fixed-point re-audit

Only after source/migration/deletion work is complete:

- TypeScript typecheck;
- lint;
- frontend/unit tests;
- Go tests;
- DB migration/invariant tests;
- contract/conformance tests;
- runtime integration/smoke;
- Android build/smoke;
- critical E2E journeys;
- offline/restart/reconciliation tests;
- auth/IDOR/assignment-revocation negatives;
- accessibility/RTL checks where automatable plus required device verification;
- repo-required security/quality checks;
- exact candidate SHA CI evidence;
- rollback/forward-fix procedure for schema/protocol cutover.

Then perform a fresh deep re-audit from the orchestrator. Repeat until no higher/material root remains.

---

## 11. Required journey verification matrix

At minimum, the exact final candidate must prove these end-to-end journeys:

| Journey | Required proof |
|---|---|
| Field login/activation | correct field role/surface only; revoked/incomplete/suspended states fail closed |
| Assigned store list/access | only current canonical assignments visible/usable |
| Deep link to field route | explicit contract mapping; unknown/malformed route fails diagnostically |
| Create visit online | one operation, server actor, object authorization, durable receipt |
| Create visit offline then reconnect | same persisted intent/idempotency identity, one canonical visit |
| Complete visit | transition invariants + transaction + required outbox atomicity |
| Unknown network result | receipt reconciliation before replay; no duplicate mutation |
| App crash/restart | pending intent survives and resumes deterministically |
| Logout/re-auth same actor | unresolved intent preserved/reconciled where required |
| Actor A → actor B same device | no visibility or execution of actor A queue/quarantine |
| Assignment revoked while pending | replay re-authorizes current scope and fails safely if revoked |
| Readiness check | governed mutation, object scope, duplicate-safe semantics |
| Escalation | governed creation + review/resolution canonicalized through backend/CP |
| Legacy queue migration | deterministic identity or quarantine; no silent drop/duplicate |
| Onboarding incomplete data | typed draft, no fake durable master values |
| Onboarding promotion | server/DB prerequisites before canonical partner/store creation |
| Product/catalog operation | central catalog authority; deterministic duplicate/batch behavior |
| Finance | WLT truth only; field cannot mutate payout destination master |
| Session/token expiry | secure fail-closed auth without silent business-intent destruction |
| Permission/IDOR attempt | no cross-store/visit disclosure or mutation |
| RTL/A11y/error flows | correct semantics across happy, empty, loading, offline and failure states |

---

## 12. Negative-space closure checklist

Final audit must prove the **absence**, not merely non-observation, of all of the following:

- [ ] `DshFieldPartnersScreen` or another business screen used as unknown-route fallback.
- [ ] independently maintained route truth that can drift without failing CI/tests.
- [ ] weak/hash-only canonical business operation identity.
- [ ] idempotency identity conflated with correlation/tracing identity.
- [ ] migrated-vs-new business intent identity divergence.
- [ ] regenerated operation identity on retry/restart/replay.
- [ ] unresolved business intent silently deleted by auth/session cleanup.
- [ ] cross-actor local queue/quarantine visibility or execution.
- [ ] replay that skips current server-side assignment/object authorization.
- [ ] fabricated durable onboarding master values such as known placeholder patterns.
- [ ] production state-changing field writer that bypasses governed mutation boundary.
- [ ] client-controlled field actor authority.
- [ ] legacy non-governed mutation API with a material consumer after cutover.
- [ ] post-cutover legacy queue inventory or indefinite legacy parser/migration support.
- [ ] OpenAPI field endpoint required by app-field but absent from runtime registration.
- [ ] public runtime field route absent from canonical contract without deliberate reason.
- [ ] duplicate/shadow HTTP registration authorities.
- [ ] orphan/invalid field-readiness DB state.
- [ ] partial visit-completion/outbox transaction residue.
- [ ] Control Panel “resolved” state not reflected in canonical domain truth.
- [ ] DSH/mobile authoritative balance/ledger shadow beside WLT.
- [ ] app-field payout-destination master mutation.
- [ ] local/shadow catalog master.
- [ ] dead routes/screens/controllers/handlers/exports/types/config/fixtures unique to superseded paths.
- [ ] stale compatibility code retained after zero-consumer/zero-inventory proof.
- [ ] historical CI or documentation used as substitute for exact-final-SHA evidence.

Any checked-negative item that is still present blocks `CLOSED`.

---

## 13. Deletion and finishing inventory

Deletion is part of the fix, not optional polish. Each item is deleted only after its migration/cutover dependency is proven complete.

### Delete after route cutover

- business fallback branch for unknown routes;
- duplicate route definitions not selected as canonical/generated projections;
- tests that validate fallback behavior instead of fail-closed behavior.

### Delete after intent-protocol cutover

- legacy business-intent fingerprint/identity code;
- legacy queue parser/schema migration code after zero legacy inventory;
- compatibility branches that can mint a second operation identity;
- obsolete fixtures tied solely to old identity behavior.

### Delete after onboarding migration

- placeholder boolean/branch;
- synthetic store/contact/temp ID generators;
- placeholder-specific fixtures/compatibility helpers;
- stale data-repair scripts after governed completion where repository policy permits.

### Delete after mutation writer convergence

- legacy non-governed state-changing exports/functions;
- dead helpers and tests unique to those APIs;
- orphan handlers/routes if any become unreachable after canonicalization.

### Delete after governance/data closure

- shadow reconciliation stores;
- stale panel-only pseudo-statuses not represented canonically;
- obsolete DB/backfill compatibility artifacts after migration completion;
- stale documentation/comments that could reintroduce superseded behavior.

Every deletion requires a zero-consumer/zero-inventory proof appropriate to the artifact; “unused in the one screen inspected” is not sufficient.

---

## 14. Exact final candidate CI/release gate

No historical run proves a later SHA.

For the single final candidate SHA, capture and retain evidence for all materially required repository checks, including:

1. TypeScript typecheck/lint/tests for app-field/shared/runtime.
2. Go backend tests, especially fieldreadiness/authz/idempotency/transactions.
3. DB migration and invariant tests.
4. OpenAPI/runtime route conformance.
5. Runtime DSH smoke for work queue/visits/checks/escalations/receipts.
6. Android app-field build/install/smoke as applicable.
7. Critical E2E happy-path and failure/recovery journeys.
8. Offline/restart/migration/quarantine scenarios.
9. Authorization, IDOR, role/surface and assignment revocation negatives.
10. Catalog and WLT boundary integration checks.
11. Security/quality checks required by the repository.
12. Observability correlation/operation evidence without secret leakage.
13. Schema/protocol rollback or forward-fix procedure.

If source changes after a green run, the relevant exact-SHA evidence must be regenerated.

---

## 15. Fixed-point closure contract

`app-field` may be declared **CLOSED** only when **one exact final candidate SHA** proves all of the following simultaneously:

1. every current `PROVEN OPEN ROOT` is fixed at its actual source-of-fix;
2. every `LATENT PROVEN HAZARD` that violates the target architecture is removed or conclusively proven non-material and governed;
3. all required migration/backfill/cutover/reconciliation is complete on actual inventory;
4. all delete-required legacy/shadow/dead/placeholder/fallback artifacts are physically removed after zero-consumer/zero-inventory proof;
5. all `MANDATORY CLOSURE GATES` have exact evidence rather than assumptions;
6. runtime/auth/workforce/entity authorization remains fail-closed;
7. offline intent identity, persistence, replay and reconciliation are deterministic across restart/upgrade/session transitions;
8. DB transaction/invariant behavior is proven under failure and concurrency;
9. Control Panel manual governance converges to canonical backend truth;
10. catalog and WLT remain sole canonical authorities for their domains;
11. Product/UX/design/A11y/RTL and all material failure/recovery states are complete;
12. negative-space audit is clean;
13. CI/security/quality/runtime/E2E evidence belongs to the exact final SHA;
14. a fresh orchestrator-driven re-audit finds no higher material root, no known material gap, no shadow/parallel truth, no collision, no unproven transition, no stale migration and no unfinished cleanup;
15. repeating `AUDIT → FIX → VERIFY → RE-AUDIT` produces no new material execution unit: the fixed point is reached.

Until every condition is satisfied, the only valid status is:

# **NOT CLOSED**

---

## 16. Immediate next execution order from this audit baseline

1. Re-pin branch `f` and classify any delta after `739aeaca3b74532146cc220cb40f241f5a676e29`.
2. Close canonical Business Intent identity convergence and complete the bounded legacy queue cutover.
3. Prove/fix offline session lifecycle and cross-actor isolation on the canonical protocol.
4. Replace route fail-open fallback with one exhaustive canonical route authority.
5. Remove onboarding fake-data capability and reconcile any real affected records.
6. Inventory/cut over/delete legacy non-governed mutation APIs.
7. Prove and, where required, strengthen DB constraints/migrations/invariants.
8. Close Control Panel operational reconciliation and auditability without shadow truth.
9. Prove catalog/WLT boundaries and delete any discovered shadow residue.
10. Finish Product/UX/A11y/RTL and all failure/recovery states.
11. Execute full negative-space/deletion/finishing sweep.
12. Produce exact-final-SHA CI/runtime/E2E/security evidence.
13. Re-audit from the latest Orchestrator and repeat until fixed point.

This ordering is root-ranked, not feature-ranked. If a new higher proven root is discovered during any phase, it preempts lower phases immediately.
