# AUDIT_PREPARE — All Surfaces / Services Root Closure — 2026-08-18

> Temporary diagnosis / accounting / execution-preparation record only. This file is **not** Product/System Truth and must never substitute for treatment in the real source/runtime. During `AUDIT_PREPARE` this file is the **only permitted write** for this task. No target-system mutation, cleanup, migration, governance mutation, or implementation is authorized by this phase.

## 0. Phase, repository and immutable audit baseline

- Repository: `bthwani2-boop/bthwani-suite-next`
- Branch: `b`
- Task: `all-surfaces-services-root-closure`
- Phase: `AUDIT_PREPARE`
- State: `AUDIT_PREPARE_ACTIVE — MATERIAL ROOTS OPEN — NO TARGET EXECUTION IN THIS PHASE`
- Audit authority entrypoint: `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`
- Target-system audited HEAD: `749a7c54f9c1552284a659dd180ef647cdc271b5`
- Target-system audited tree: `a208fafa1b325ee5a82101586363181edaea0005`
- Target-system HEAD commit: `captain: remove obsolete local readiness policy`
- Plan-only branch movement observed after that target-system HEAD: `c9673251cca60c7ced9f5638779b84879e2d1a39` then `7e27f8bca7f3de56165827e35cddee3ad15f40bf`.
- Those deltas modify this PLAN record only. They are accepted as audit input; they do not change target-system evidence.
- Previous plan narrative referring to earlier `EXECUTE_CLOSE`, uncommitted working-tree treatment, or older baselines is **historical evidence only**, not current closure proof.
- `CURRENT CODE ≠ GOVERNANCE UPDATE AUTHORITY`.
- `UNCERTAINTY = NO GOVERNANCE WRITE`.
- `TARGET_SYSTEM_MUTATION_THIS_PHASE = NONE`.
- No source, runtime, DB, contract, package, lockfile, app, service, migration, governance, generated artifact, or tool/guard treatment is authorized while this record remains in `AUDIT_PREPARE`.

### Phase law

`AUDIT + INSPECT + DIAGNOSE + ANALYZE → HIGHEST PROVEN ROOT → CANONICAL TARGET → ROOT-CORRECT TREATMENT DESIGN → BLAST RADIUS → MIGRATION/CUTOVER/CLEANUP PLAN → VERIFY PLAN → RE-AUDIT/RE-RANK`

Execution is explicitly deferred. A previous commit, a passing build/test, or disappearance of an observed symptom does not constitute closure.

---

## 1. Canonical owner matrix and invariants proven for this audit

### Identity

Identity owns actor identity, authentication, activation, roles/surfaces, sessions and identity lifecycle.

### Workforce

Workforce owns workforce/professional profile, engagement, professional prerequisites, workforce-specific evidence, and **operational workforce assignments** used for staffing/scheduling/workforce operations.

Workforce readiness may consume Identity lifecycle as a sovereign dependency, but Workforce must not manufacture DSH dispatch/store authorization truth or WLT financial truth.

### DSH

DSH owns commerce and operational journey truth, stores, store-object authorization, catalog/checkout/order/dispatch/delivery/visit state, and journey-level aggregation when DSH needs facts from multiple sovereign owners.

The currently proven canonical DSH store authorization path remains `dsh_store_actor_scopes` / DSH store-scope authorization primitives.

### WLT

WLT exclusively owns authoritative wallet, ledger, balance, payment, refund, settlement, payout, commission, reconciliation and financial-eligibility/mutation truth.

### Surfaces / app runtimes

Surfaces are consumers/composers only. They may present owner decisions and technical failure states but must not invent local eligibility, readiness, authorization, wallet, or assignment truth.

The `apps/app-*` runtime shell is a runtime/composition consumer. It must consume a declared public owner package boundary; it must not make a service implementation directory its implicit package API through filesystem traversal.

### Mandatory separation invariants

1. `DSH authorization scope != Workforce operational assignment`.
2. A Workforce operational assignment must not become a second DSH store-object authorization ledger.
3. A DSH store authorization scope must not be presented as Workforce staffing/professional assignment truth.
4. Cross-domain operational readiness belongs to the owning journey composition boundary, not to every sovereign service and not to the surface shell.
5. `DEPENDENCY_UNAVAILABLE != BUSINESS_BLOCKED`.
6. One durable fact has one authoritative writer/owner; projections/caches/read models never become parallel truth.
7. Runtime source, contracts, generated clients, package manifests, lockfile and consumers must converge in the same cutover.
8. App runtime shells must consume stable declared package exports; direct traversal into service implementation is not a canonical dependency contract.

These invariants are supported by current implementation/database evidence and current `governance/product/PRD.md`; Governance is supporting evidence only and remains non-writable in this phase.

---

## 2. Exact-HEAD evidence and findings

### 2.1 Workforce readiness implementation — ownership direction corrected, closure not proven

Current source under `core/workforce/backend/**` proves:

- Workforce evaluates Workforce-owned provider/professional prerequisites and Identity lifecycle.
- DSH dispatch and WLT financial blockers are no longer legitimate Workforce-owned blockers in runtime source.
- sovereign readiness dependency failure is represented as `ErrReadinessDependencyUnavailable` and exposed as HTTP `503 WORKFORCE_READINESS_UNAVAILABLE` rather than silently becoming a normal `BLOCKED` decision.

**Disposition:** canonical source direction is present, but public contract/generated/consumer propagation remains open.

### 2.2 Workforce runtime ↔ OpenAPI ↔ frontend mirror drift — `PROVEN_OPEN`

Inspected:

- `core/workforce/contracts/workforce.openapi.yaml`
- `services/dsh/frontend/shared/workforce/workforce.types.ts`
- current Workforce readiness source/route.

Proven drift:

- actor readiness contract does not expose the runtime `503 WORKFORCE_READINESS_UNAVAILABLE` behavior.
- public blocker vocabulary still retains stale cross-domain values including `FINANCIAL_ELIGIBILITY_BLOCKED`, `DISPATCH_OWNER_BLOCKED` and `ELIGIBILITY_UNAVAILABLE` alongside Workforce-owned values.
- DSH frontend Workforce mirror still carries obsolete cross-domain blocker vocabulary.

**Finding:** `IMPLEMENTATION ↔ PUBLIC CONTRACT ↔ DOWNSTREAM TYPE PARALLEL TRUTH`.

**Highest root:** semantic ownership was corrected in source but not propagated through the complete contract/consumer graph.

### 2.3 DSH Captain operational readiness owner exists — source direction canonical

Current DSH exposes `GET /dsh/captain/me/readiness` and composes Workforce, DSH dispatch and WLT-backed financial facts. Dependency failure is surfaced as `503 CAPTAIN_READINESS_UNAVAILABLE`, not as business ineligibility.

**Disposition:** semantic owner is correct; package/contract/consumer/candidate closure remains open.

### 2.4 Captain frontend/package cutover — `PROVEN_OPEN HALF-CUTOVER`

Current positive state:

- `services/dsh/frontend/app-captain/captain-readiness.api.ts` calls `/dsh/captain/me/readiness`.
- `services/dsh/frontend/app-captain/index.ts` is the intended public Captain composition boundary.
- `services/dsh/package.json` exports `./app-captain`.
- `apps/app-captain/runtime/src/App.tsx` consumes `@bthwani/dsh/app-captain`.
- obsolete local `captain-readiness.policy.ts` was deleted.
- Captain outage is no longer fabricated into a business blocker in the app shell.

Current incomplete state:

- `apps/app-captain/runtime/package.json` declares `@bthwani/dsh: workspace:*`.
- the corresponding `apps/app-captain/runtime` importer in `pnpm-lock.yaml` does not contain `@bthwani/dsh`.

**Finding:** package manifest and deterministic lock graph disagree. Clean-checkout/frozen-lockfile reproducibility is not proven and the migration is incomplete.

### 2.5 Field frontend — local shadow readiness + deep service coupling — `PROVEN_OPEN`

Current Field runtime:

- imports DSH internals through deep relative filesystem paths under `../../../../services/dsh/...`.
- directly consumes Workforce readiness from DSH shared Workforce code.
- on readiness request failure/outage synthesizes `BLOCKED + ELIGIBILITY_UNAVAILABLE`.
- can therefore claim business ineligibility when the actual state is merely unverifiable/unavailable.
- has no declared `@bthwani/dsh` workspace dependency.
- cannot consume `@bthwani/dsh/app-field` because DSH package does not currently export `./app-field`, even though `services/dsh/frontend/app-field/index.ts` exists.
- retains a TypeScript include into DSH app-field declarations, part of the current filesystem-coupled composition.

**Findings:** `FALSE BUSINESS STATE`, `SURFACE-LOCAL READINESS SHADOW`, `DEEP FILESYSTEM COUPLING`, `UNDECLARED WORKSPACE OWNERSHIP`, `PARTIAL MULTI-SURFACE CUTOVER`.

### 2.6 DSH Field readiness primitive exists, but no public self-readiness boundary exists — `PROVEN_OPEN`

Inspected:

- `services/dsh/backend/internal/fieldreadiness/fieldreadiness.go`
- `services/dsh/backend/internal/http/field_readiness_gate.go`
- `services/dsh/backend/internal/http/field_readiness_closure_test.go`
- `services/dsh/backend/internal/http/server.go`

Proven internal semantics:

- Workforce dependency `ERROR` is unavailable/error, not business denial.
- missing Workforce assignment is a business decision such as `MISSING_WORKFORCE_ASSIGNMENT`.
- tests distinguish dependency error (`503`) from missing assignment (governed denial).

Proven boundary gap:

- no `GET /dsh/field/me/readiness` route exists.
- no `/dsh/field/readiness` route exists.
- `enforceFieldReadinessGate` only performs `requireActor(..., "field")`; it is a role gate, not a readiness evaluator.

**Highest root:** Field has an internal semantic primitive but no single public application-facing readiness boundary, leaving the runtime shell to manufacture a shadow decision.

### 2.7 Field role-gate naming/commentary contradicts actual authorization owner — `PROVEN_OPEN CLEANUP`

`field_readiness_gate.go` describes store access as “Workforce-backed authorization primitives”, while current DSH store authorization is separately owned through DSH store-object access primitives.

The wrapper name also overstates its behavior because it only performs a field-role check.

**Later treatment:** simplify/rename/remove according to real responsibility; never add fake complexity merely to justify the name.

### 2.8 DSH store authorization vs Workforce operational assignment — `INVARIANT_PROVEN`; consumer audit open

Inspected:

- `core/workforce/backend/internal/workforce/operational_assignments.go`
- `services/dsh/database/migrations/dsh-990_workforce_assignment_cleanup.sql`
- `services/dsh/contracts/dsh.workforce-scopes.openapi.yaml`

Evidence converges:

- Workforce owns operational assignment records for workforce operations.
- DSH owns canonical store/area authorization scope.
- DSH cleanup removes assignment-era DSH tables while preserving `dsh_store_actor_scopes` as authorization truth.
- DSH scope contract describes store-scoped authorization, not a Workforce assignment ledger.

**Disposition:** ownership itself is **not** `DECISION_REQUIRED`. Exact all-writer/all-reader negative-space proof remains required.

### 2.9 Mobile runtime composition boundary is systemically broken across surfaces — `PROVEN_OPEN SYSTEMIC ROOT`

Inspected exact target-system HEAD:

- `apps/app-client/runtime/src/App.tsx`
- `apps/app-client/runtime/package.json`
- `apps/app-client/runtime/tsconfig.json`
- `services/dsh/frontend/app-client/index.ts`
- `apps/app-partner/runtime/src/App.tsx`
- `apps/app-partner/runtime/package.json`
- `services/dsh/frontend/app-partner/index.ts`
- current Captain and Field runtime/package state.

Proven current pattern:

- **Client** imports DSH surface, rating gate, IdentitySessionGate and push registration by deep relative filesystem paths into `services/dsh`.
- Client package does not declare `@bthwani/dsh`.
- Client `tsconfig.json` explicitly includes DSH app-client, shared frontend and DSH client source trees, making the service implementation tree part of app compilation by path rather than public package contract.
- **Partner** imports DSH surface, rating gate, shared catalog configuration, IdentitySessionGate and push registration by deep relative paths into `services/dsh`.
- Partner package does not declare `@bthwani/dsh`.
- **Field** follows the same deep path model and additionally owns a readiness shadow.
- **Captain** is the only mobile shell currently moving to `@bthwani/dsh/app-captain`, but that migration remains half-cut because the lockfile is stale.
- DSH already has `frontend/app-client/index.ts`, `frontend/app-partner/index.ts`, `frontend/app-field/index.ts`, and `frontend/app-captain/index.ts`; however `services/dsh/package.json` currently exposes only the Captain mobile subpath among these surfaces.

**Highest proven architectural root:** mobile shell composition evolved around source-tree reachability instead of declared service public package boundaries. Field readiness is one dangerous symptom of that larger architecture.

**Canonical target:** all four mobile runtime shells consume only deliberate public owner package boundaries. Composition-only modules required by a shell are either exported from that surface boundary or moved behind the surface owner so the shell remains thin. No shell may depend on arbitrary DSH internal paths.

### 2.10 Existing guards/tooling permit the systemic boundary violation — `PROVEN_OPEN SYSTEMIC GUARD GAP`

Inspected:

- `tools/guards/fullstack-boundary-gate.mjs`
- `apps/mobile/verify-mobile-source.mjs`
- root guard/lint wiring.

Proven gap:

- `fullstack-boundary-gate` recognizes mobile roots and blocks web/mobile cross-ownership, cross-surface imports and direct backend/generated/controller-core imports.
- it does **not** reject app-runtime deep traversal into corresponding DSH frontend implementation.
- `verify-mobile-source.mjs` validates syntax and a small set of forbidden source constructs, but has no architectural import-boundary rule.
- therefore Client/Partner/Field deep service imports can remain while the normal mobile source guard passes.

**Finding:** a file-by-file import cleanup would be non-durable unless the architectural invariant is mechanically enforced at the existing owner guard.

### 2.11 Governance read-only impact — supporting evidence; mutation remains `HOLD`

Current `governance/product/PRD.md` states one authoritative owner per durable fact, separates workforce affiliation from operational ownership, allows DSH to consume Workforce eligibility without turning Workforce into a parallel assignment owner, and requires vertically complete surface→contract→backend→readback integration.

No current Field-specific Product Truth was found that authorizes surface-local readiness synthesis or deep service coupling.

**Disposition:** `GOVERNANCE_WRITE = HOLD`. Governance supports the current owner direction but is not rewritten in AUDIT_PREPARE.

---

## 3. Re-ranked root-cause landscape

### ROOT-A — P0 — Mobile runtime composition architecture uses implementation-tree reachability instead of public package boundaries — `PROVEN_OPEN`

Affected proven surfaces: Client, Partner, Field; Captain is a partial migration.

Why highest leverage:

- it explains repeated direct imports, undeclared DSH dependencies, tsconfig service-tree inclusion, inconsistent shell ownership and the ability for surface-local policies to form.
- fixing Field alone would leave the same structural defect active in Client/Partner and would allow regression.

Canonical target:

- four thin runtime shells.
- four deliberate DSH mobile public subpath boundaries or an equivalently minimal single package boundary with surface-owned exports; no arbitrary internal traversal.
- declared workspace dependencies + regenerated deterministic lockfile.
- shell-specific native adapters remain runtime-owned only when native runtime ownership is justified.
- DSH/business/session/journey policy stays behind service/package owner boundaries.

### ROOT-B — P0 — Readiness semantic ownership was only partially propagated — `PROVEN_OPEN`

Cone: Workforce source → Workforce contract/generated types → DSH Captain/Field composition → app consumers.

Canonical target:

- Workforce exposes Workforce-only readiness.
- DSH owns DSH journey aggregates.
- surfaces consume owner boundaries and never invent blocker meanings.
- technical unavailable remains technical unavailable.
- contracts/generated clients/types equal runtime semantics.

### ROOT-C — P0 — Field operational readiness has no public journey boundary — `PROVEN_OPEN`

Internal resolver is semantically useful; public owner route/client is missing; app-field compensates locally.

Canonical target: one minimum DSH Field readiness boundary backed by existing owner semantics, no duplicate policy engine.

### ROOT-D — P0 — Architecture guards do not enforce the mobile shell/public package invariant — `PROVEN_OPEN`

Canonical target: strengthen the existing full-stack boundary owner and focused tests after migration; avoid a second overlapping guard.

### ROOT-E — P1 — Authorization/assignment semantics require all-writer/all-reader negative-space proof — `OPEN AUDIT ROOT`

Owner split is proven; every writer/reader/alias/contract/UI model must still be proven compliant and obsolete parallel paths removed.

### ROOT-F — P1 — Prior systemic treatments require exact-current-HEAD revalidation — `OPEN AUDIT GATE`

Historical evidence exists but is not automatically current-candidate closure proof.

---

## 4. Historical roots retained for current-head revalidation

### HIST-01 — COD financial single truth — `REVALIDATION_REQUIRED`

Revalidate active writers/readers/contracts/migrations/data negative space. WLT remains financial truth; DSH must not regain a second financial liability ledger.

### HIST-02 — Workforce ↔ Identity provisioning — `REVALIDATION_REQUIRED`

Revalidate creation inputs, role/surface derivation, idempotency, existing-actor linkage, activation/session path, obsolete provisioning-case APIs and source↔contract equality.

### HIST-03 — Mobile native capability ownership — `REVALIDATION_REQUIRED`

Revalidate typed runtime adapters and native evidence. The newly proven composition root means earlier mobile cleanup cannot be treated as global closure.

### HIST-04 — ETA fallback — `REVALIDATION_REQUIRED`

Revalidate provider duration ownership, unavailable behavior, recovery and all consumers. No fabricated distance-based ETA may reappear.

### HIST-05 — Derived contracts/capabilities — `REOPENED_BY_CURRENT_EVIDENCE`

Workforce OpenAPI drift and Captain lockfile drift already invalidate old all-green derived-artifact claims for the current state.

---

## 5. Minimum blast radius before any EXECUTE_CLOSE

Current proven cone includes at minimum:

- `core/workforce/backend/**`
- `core/workforce/contracts/**`
- `core/workforce/clients/generated/**`
- Workforce operational assignment persistence/contracts/consumers.
- `services/dsh/backend/internal/fieldreadiness/**`
- `services/dsh/backend/internal/http/**` Captain/Field readiness and field routes.
- DSH store authorization readers/writers and `dsh_store_actor_scopes`.
- `services/dsh/contracts/**` and generated DSH API artifacts.
- `services/dsh/frontend/shared/**` modules exposed to mobile composition where affected.
- `services/dsh/frontend/app-client/**`
- `services/dsh/frontend/app-partner/**`
- `services/dsh/frontend/app-captain/**`
- `services/dsh/frontend/app-field/**`
- `services/dsh/package.json`.
- `apps/app-client/runtime/**`
- `apps/app-partner/runtime/**`
- `apps/app-captain/runtime/**`
- `apps/app-field/runtime/**`
- all four mobile package manifests, tsconfig, Metro/Expo composition and tests.
- `pnpm-lock.yaml`.
- `tools/guards/fullstack-boundary-gate.mjs` and affected guard tests/registry/wiring.
- `apps/mobile/verify-mobile-source.mjs` only if exact treatment proves it should own complementary checks; do not duplicate full-stack guard responsibility without justification.
- `governance/**` impact analysis read-only.
- every newly exposed consumer/dependency.

This is a minimum cone, not a fixed checklist.

---

## 6. Root-correct treatment design for later EXECUTE_CLOSE — NOT AUTHORIZED IN THIS PHASE

### Wave 1 — establish one mobile composition architecture

1. re-pin latest target-system HEAD and classify concurrent deltas.
2. inventory every app-client/app-partner/app-captain/app-field import crossing into DSH implementation paths.
3. design the minimum public surface API for each DSH mobile surface from existing owners; prefer consolidating/moving policy behind the owner over exporting many internals.
4. expose the justified mobile subpath exports from `@bthwani/dsh`.
5. declare `@bthwani/dsh` in every mobile runtime that consumes it.
6. migrate all four shells coherently; do not leave mixed filesystem/package composition.
7. regenerate `pnpm-lock.yaml` from manifests.
8. remove tsconfig/Metro/path reachability workarounds that lose their proven purpose after package cutover.

### Wave 2 — sovereign readiness semantics and contracts

1. make Workforce readiness runtime/OpenAPI/generated client/type vocabulary one truth.
2. model dependency-unavailable behavior explicitly.
3. remove obsolete cross-domain Workforce blocker values only after all consumers migrate.
4. re-audit DSH Captain readiness contract and public client.

### Wave 3 — Field journey owner boundary

1. expose the minimum DSH Field self-readiness API backed by existing readiness resolver/composition.
2. business missing-assignment denial stays business denial.
3. Workforce/dependency outage stays `503`/unavailable.
4. export the Field readiness client through the Field public package boundary.
5. delete Field shell readiness synthesis after consumer cutover.

### Wave 4 — durable architecture enforcement

1. extend the existing `fullstack-boundary-gate` to reject app-runtime deep service implementation imports.
2. add focused negative fixtures/tests for Client/Partner/Captain/Field shell boundaries.
3. preserve allowed public package imports.
4. avoid duplicate/overlapping guard systems.

### Wave 5 — assignment/scope authority and finishing cleanup

1. enumerate all Workforce operational-assignment writers/readers and DSH authorization-scope writers/readers.
2. prove no dual writer/alternate truth.
3. delete/migrate surviving obsolete assignment-era DSH truth only with full blast-radius evidence.
4. correct/remove misleading Field readiness/authorization naming and comments.
5. remove dead/stale/duplicate imports, exports, aliases, files, folders, tests, generated mirrors, TODO/FIXME/HACK/fallback/workaround residue exposed by the cutover.

### Wave 6 — historical-root revalidation and adaptive repeat

Re-audit COD, Identity/Workforce provisioning, native capabilities, ETA, contracts/capabilities, Governance impact and every newly exposed finding. Re-rank by highest systemic leverage and repeat.

---

## 7. Verification matrix required before a future closure claim

### Mobile composition/package architecture

- Client/Partner/Captain/Field shells use declared package boundaries only.
- zero deep app-runtime traversal into `services/dsh/frontend/**` or DSH client internals.
- public surface exports contain only justified shell API; no accidental internal package surface explosion.
- package manifests and `pnpm-lock.yaml` agree.
- canonical frozen/clean install succeeds.
- all four mobile TypeScript/Metro/Expo builds resolve from clean checkout.

### Boundary enforcement

- negative guard fixture proving app-runtime → service-internal traversal is rejected.
- public package imports remain allowed.
- no regression in web/mobile/cross-surface/backend/generated boundary rules.

### Contracts and readiness semantic equality

- Workforce runtime == OpenAPI == generated client == frontend/shared types.
- Workforce outage => unavailable/error, never fabricated blocker.
- DSH Captain runtime == contract == public client.
- DSH Field runtime == contract == public client.
- Captain/Field UI distinguishes business denial from technical unavailability.

### Authorization and assignment ownership

- DSH store-object authorization is single-owner and server-enforced.
- Workforce assignment cannot authorize DSH objects by itself.
- DSH authorization scope is not written as Workforce assignment truth.
- no alternate legacy table/API/dual writer remains.

### Runtime adversarial cases

- Identity/readiness dependency outage.
- missing Workforce assignment.
- suspended/inactive Identity/Workforce state.
- Captain dispatch blocked/suspended/profile missing.
- Captain WLT financial eligibility blocked.
- DSH/WLT/Workforce outage and recovery.
- malformed/mismatched readiness payload.
- stale cached UI state.

Every unavailable/degraded state must fail closed without false business truth.

### Required build/test/guard families

At minimum for the final blast radius:

- Workforce Go tests/build + contract generation/verification.
- DSH Go tests/build + contract generation/verification.
- DSH TypeScript typecheck/build/tests.
- app-client typecheck/tests/build/export.
- app-partner typecheck/tests/build/export.
- app-captain typecheck/tests/build/export.
- app-field typecheck/tests/build/export.
- contract registry/generated-client/binding guards.
- full-stack boundary guard + new negative tests.
- DB/schema/contract checks for DSH authorization vs Workforce assignment separation.
- canonical frozen install.

### Negative-space search on exact candidate

Prove absence of:

- app-client/app-partner/app-captain/app-field deep DSH implementation imports.
- direct Captain app call to Workforce readiness.
- obsolete Captain local readiness policy references.
- Field surface-local `ELIGIBILITY_UNAVAILABLE` fabrication.
- stale cross-domain Workforce blockers.
- duplicate Field readiness policies/wrappers.
- undeclared `@bthwani/dsh` usage.
- stale package exports/imports and tsconfig/path workarounds.
- obsolete assignment-era DSH writers/tables/routes where retired.
- misleading ownership comments/names.
- affected TODO/FIXME/HACK/workaround/fallback/dead/duplicate code.

### Exact-candidate rule

Final evidence binds to one exact candidate SHA after the last target-system write. Branch movement requires re-pin, delta classification/reconciliation and affected re-verification.

---

## 8. Governance impact and mutation gate

`governance/**` remains read-only in `AUDIT_PREPARE`.

Current disposition:

- `GOVERNANCE_WRITE = HOLD`.
- current PRD supports one-owner-per-fact and DSH/Workforce/financial separation.
- current PRD also requires vertically complete shared governed truth rather than independent surface-local truth.
- no current Product Truth evidence authorizes filesystem service implementation as the mobile public API or Field-local readiness fabrication.
- code alone is not authority to rewrite Governance.
- any later governance mutation requires proven canonical truth + root cause + blast radius + no unresolved material decision.

---

## 9. Decision register

`MATERIAL_DECISION_REQUIRED: 0`

The owner split and public-boundary direction are sufficiently derivable from current architecture, existing Captain package cutover direction, service surface entrypoints, package ownership and Product invariants. Exact export shape remains an implementation design task under minimum necessary complexity, not a Product decision.

If a later non-derivable Product/Business/Semantic/Architectural choice appears, stop the affected cone and record:

`problem + required decision + options + recommendation/reason + impact/risk`.

---

## 10. AUDIT_PREPARE continuation queue

Continue read-only and re-rank automatically:

1. complete file-level inventory of every deep DSH import in all four mobile runtimes and classify each required public API versus misplaced shell responsibility.
2. complete Workforce readiness overlays/generated-client/all-consumer cone.
3. complete DSH Captain OpenAPI/operator/public-client cone.
4. complete DSH Field handler/visit/start-work/finance/catalog cone around the missing public readiness boundary.
5. enumerate all DSH store authorization writers/readers versus Workforce operational-assignment writers/readers.
6. revalidate HIST-01 COD financial truth.
7. revalidate HIST-02 Workforce↔Identity provisioning.
8. revalidate HIST-03 native capability ownership.
9. revalidate HIST-04 ETA semantics.
10. revalidate generated contracts/capabilities and all relevant guards.
11. Governance read-only drift pass over affected Product Truth contracts.
12. negative-space/adversarial pass and root re-ranking.

No queue item is closure by itself; evidence determines closure.

---

## 11. Phase exit / closure law

Do **not** switch to `EXECUTE_CLOSE` until:

- current exact target-system audit covers every material root and affected consumer/dependency.
- `DECISION_REQUIRED` is zero or resolved for the executable cone.
- canonical target and root-correct treatment are explicit.
- migration/cutover order prevents half migration and parallel truth.
- cleanup/deletion scope is explicit.
- verification matrix can prove the final exact candidate.

A future `EXECUTE_CLOSE` must continue:

`Highest Root → Execute → Migrate/Cutover → Cleanup/Delete → Verify → Re-Audit/Re-Rank → Repeat`

until every original and newly exposed material finding is `PROVEN_CLOSED` or `N/A_PROVEN`.

Only after complete proven closure may this temporary PLAN file be deleted as the last write, followed by a new final candidate and final read-only Audit + Negative Space + Adversarial Re-check.

### Current status

`PHASE: AUDIT_PREPARE`

`AUDIT_PREPARE_ACTIVE`

`TARGET_SYSTEM_WRITES_THIS_PHASE: 0`

`PLAN_RECORD_WRITE_ONLY: YES`

`MATERIAL_DECISION_REQUIRED: 0`

`READY_FOR_EXECUTION: NO — AUDIT CONTINUATION REQUIRED`
