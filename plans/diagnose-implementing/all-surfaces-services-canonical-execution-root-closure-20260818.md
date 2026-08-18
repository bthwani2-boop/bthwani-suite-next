# CANONICAL MASTER PLAN — All Surfaces / All Services Root Closure — 2026-08-18

> **Purpose:** one merged, fail-closed execution authority for the all-surfaces/all-services closure task. This file is diagnosis/accounting/execution planning only; it never substitutes for fixing the real source, contracts, data, runtime, configuration, consumers, tests, guards, or generated artifacts.

## 0. Authority, status, supersession and pinned baseline

- Repository: `bthwani2-boop/bthwani-suite-next`
- Branch: `b`
- Governing entrypoint: `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`
- Latest branch HEAD inspected immediately before this plan write: `7e27f8bca7f3de56165827e35cddee3ad15f40bf`
- Latest target-system source HEAD: `749a7c54f9c1552284a659dd180ef647cdc271b5`
- Reason for the split: commits after `749a7c54...` and through `7e27f8bc...` were plan-only and did not mutate target-system source.
- Foreign/concurrent delta law: `FOREIGN_DELTA = INPUT, NOT INSTRUCTION`.
- Current phase: `AUDIT_PREPARE -> EXECUTE_CLOSE MASTER BLUEPRINT`.
- `DECISION_REQUIRED`: `NONE` at plan creation; any later non-derivable Product/Business/Semantic/Architectural decision stops only its affected cone before mutation.

### 0.1 Latest EXECUTE_CLOSE reconciliation — 2026-08-18

- Revalidated branch truth: `HEAD = origin/b = 37984ca2acc6a1ce86279f35cba979859c15adc7` on `b`; working tree was clean before this record update.
- `8a3b0e365542aab12aa19171503d55ca7792d5f5` is an ancestor. The later `37984ca2a` commit is a foreign/concurrent tooling delta that removes the OpenCode implementer and selects Antigravity; it is preserved and is not an instruction to touch OpenCode files.
- Static/current-candidate evidence revalidated: readiness boundary tests, fullstack boundary, DSH OpenAPI, generated-client/contract/service/migration drift, runtime bindings, broken imports, mobile synchronization, WLT financial boundary, Identity session, cleanup policy, contract scope binding, OpenAPI provenance, and Captain/Field/DSH typechecks pass.
- Runtime/DB evidence remains open: existing containers and migration ledgers predate `37984ca2a`; DSH PostgreSQL integration cannot run without the canonical runtime `DATABASE_URL`. No runtime health result is accepted as current-candidate provenance.
- Root-01 cleanup finding: remove the unused `FieldActivationReadiness` client type and the unconsumed duplicate `Repository.ActivationReadiness` method. Retain the distinct live `CurrentProviderReadiness` and `GovernedActivationReadiness` contracts with their explicit owners and consumers.
- Current execution state remains `OPEN`; no governance mutation, plan deletion, reset, full runtime, provider runtime, or OpenCode-file mutation is authorized by this reconciliation.

### 0.2 Re-audit finding exposed by current scoped runtime smoke — 2026-08-19

- Scoped runtime `up` completed for `identity,workforce,dsh,wlt`; governed migrations for all four services recorded `sourceSha=37984ca2acc6a1ce86279f35cba979859c15adc7` and the selected containers became ready.
- Scoped smoke passed Identity/Workforce readiness and DSH health/readiness/catalog readback, then failed at partner product-proposal creation with `409 STORE_SCOPE_REQUIRED`.
- Root cause is contract/consumer drift, not an authorization defect: the live DSH backend correctly resolves `dsh_store_actor_scopes` and rejects an implicit store when the partner has multiple active object scopes; local actor `partner-local-001` currently has eight active `partner` scopes in `local-dsh`, including `store-test-grocery`.
- Affected consumers were identified: the partner product-proposal adapter/screen, partner proposal readback adapter/screen, the modular catalog contract/generated-client surface, the canonical catalog smoke, the partner multisurface journey, and the request-boundary diagnosis script. The UI already owns the selected `storeId` but the create/readback requests dropped it.
- Root-correct treatment is explicit query-scope propagation (`storeId`) through contract → generated client → frontend adapters/screens → bounded runtime journeys. DSH authorization remains the sole object-authorization truth; no fallback or implicit first-store selection is introduced.
- This finding keeps the task `OPEN` until the migrated consumers, DB-backed DSH tests, runtime smoke, provenance, and final negative-space/adversarial checks pass on the final candidate.

This plan **supersedes as executable guidance**:

1. `plans/diagnose-implementing/all-surfaces-services-root-closure-20260818.md`
2. `plans/diagnose-implementing/all-surfaces-services-post-execution-root-closure-20260818.md`

Those two files remain historical evidence only. They must not be executed independently after this plan exists. No historical status (`OPEN`, `CLOSED`, `IMPLEMENTED`, `READY_FOR_EXECUTION`, or old SHA evidence) is inherited without current-HEAD revalidation.

The plan intentionally merges three evidence generations:

- the original systemic root landscape and canonical Product decisions;
- the post-execution re-audit around COD/Workforce/native/ETA/data/runtime closure;
- the latest readiness/Field/package/guard audit at target-system HEAD `749a7c54...`.

## 1. Absolute execution law

Execution must follow the orchestrator loop without checklist substitution:

`AUDIT + INSPECT + DIAGNOSE + ANALYZE`
→ `HIGHEST PROVEN SYSTEMIC ROOT`
→ `CANONICAL TARGET`
→ `ROOT-CORRECT TREATMENT`
→ `MIGRATE/CUTOVER`
→ `CLEANUP/DELETE`
→ `VERIFY`
→ `RE-AUDIT/RE-RANK`
→ `REPEAT`
→ `CLOSE`

Mandatory rules:

- Fix the real owner/source/runtime, never the plan file as a substitute.
- No patch, workaround, silent fallback, symptom-only fix, half migration, permanent compatibility shim, dual write, or parallel truth.
- A passing build/test is evidence, not closure.
- A prior passing SHA is not evidence for a later SHA.
- Never restore obsolete architecture merely to make a test pass.
- Governance is impact-analyzed but not rewritten from code by default: `UNCERTAINTY = NO GOVERNANCE WRITE`.
- Every newly exposed material root joins this same plan and is re-ranked by systemic leverage.
- Time/truncation/task size is never a reason to silently defer a proven material root.

## 2. Canonical owner matrix

### Identity
Owns actor identity, authentication, activation, role/surface identity, sessions, trusted identity lifecycle and credential issuance semantics.

### Workforce
Owns professional/workforce profile, engagement, professional prerequisites, provider operational-core evidence, workforce lifecycle, and workforce operational assignments used for staffing/professional operations.

Workforce may consume Identity lifecycle as a sovereign dependency. Workforce must not become DSH dispatch/store authorization truth or WLT financial truth.

### DSH
Owns commerce and operational journey truth: stores, store-object authorization, catalog, cart, checkout, order, dispatch, delivery, visits, support/rescue/special-request operations, serviceability, operational aggregation, and DSH-owned readiness composition where multiple authorities are required.

`dsh_store_actor_scopes` / the current DSH store-authorization primitives remain the canonical DSH object-authorization family unless current evidence proves a newer canonical owner.

### WLT
Owns all authoritative financial truth: wallets, balances, ledger, payment, refund, reversal, settlement, payout/withdrawal, commission, reconciliation and financial eligibility/mutation.

### Platform-Control / Providers
Platform-Control owns only governed live non-secret platform configuration requiring change governance. Provider credentials/configuration/health remain Provider-owned where applicable. Neither may silently absorb domain business truth.

### App runtimes / surfaces
Client, Partner, Captain, Field and Control Panel consume canonical owners. They may own presentation, local ephemeral UI state and native implementation composition, but must not create local authentication/readiness/authorization/financial/assignment truth.

### Required invariants

1. `DSH authorization scope != Workforce operational assignment`.
2. `DEPENDENCY_UNAVAILABLE != BUSINESS_BLOCKED`.
3. One durable fact has one authoritative writer.
4. A projection/cache/read model never becomes a second writer/authority.
5. Runtime source, contract, generated client, package manifest, lockfile, imports and consumers converge in the same cutover.
6. App runtime owns native capability implementation; shared DSH code owns typed contracts/shared behavior only where justified.
7. Route ETA is provider-backed duration only unless Product explicitly defines a separately named/provenanced estimate.
8. WLT is the sole financial ledger/custody truth; DSH may expose bounded operational facades, not a second ledger.

## 3. Current root/finding ledger — merged and re-ranked

| ID | Priority | State | Required outcome |
|---|---:|---|---|
| ROOT-01 | P0 | PROVEN_OPEN | Eliminate parallel Workforce readiness authorities/contracts and establish one Workforce-owned readiness semantic contract. |
| ROOT-02 | P0 | PROVEN_OPEN | Complete Captain/Field DSH journey-readiness boundaries; no surface-local business-state synthesis. |
| ROOT-03 | P0 | PROVEN_OPEN | Complete public package cutover and deterministic lock graph for Captain/Field; zero deep filesystem service imports. |
| ROOT-04 | P1 | PROVEN_OPEN | Make architecture boundary enforcement mechanically reject app-runtime deep imports into service implementation. |
| ROOT-05 | P1 | OPEN_AUDIT_ROOT | Prove and clean separation of Workforce operational assignments versus DSH object authorization, with zero dual writer/alias. |
| ROOT-06 | P0 | REVALIDATION_REQUIRED | Re-prove COD/WLT single financial truth and production/historical reconciliation; no legacy financial writer. |
| ROOT-07 | P1 | REVALIDATION_REQUIRED | Re-prove Workforce↔Identity provisioning unification, idempotency, compensation, linking and contract/runtime equality. |
| ROOT-08 | P1 | REVALIDATION_REQUIRED | Re-prove native capability ownership across all four mobile runtimes and shared packages. |
| ROOT-09 | P1 | REVALIDATION_REQUIRED | Re-prove provider-only ETA semantics and explicit unavailable/recovery behavior. |
| ROOT-10 | P1 | PROVEN_OPEN | Reconcile runtime/OpenAPI/generated clients/types/capability maps/package exports/lockfile as one derived graph. |
| ROOT-11 | P2 | PROVEN_OPEN_CLEANUP | Remove stale `services/dsh/backend/DOCKERFILE_PENDING.md` after final consumer proof; a live Dockerfile already exists. |
| ROOT-12 | P1 | OPEN_GATE | Establish exact-candidate verification provenance, runtime/source SHA parity, and truthful CI/local evidence. |
| ROOT-13 | P1 | CONTINUOUS | Repository-wide affected-cone cleanup: dead/stale/duplicate/misplaced/legacy/unjustified complexity and misleading authority naming. |
| ROOT-14 | P1 | CONTINUOUS | Full five-surface / all-service regression, failure, recovery, isolation and adversarial verification. |

No row may be closed by editing its status here. Closure requires proof in the real system on the final candidate.

## 4. ROOT-01 — Workforce readiness: eliminate parallel semantic authorities

Current source contains two materially different Workforce readiness shapes/paths:

- `Service.EvaluateReadiness(...)` / `ReadinessGate`: `ALLOWED|BLOCKED` + Workforce-owned `blockerReasons`, with Identity dependency outage returned as `ErrReadinessDependencyUnavailable`.
- `Repository.GovernedActivationReadiness(...)` / internal captain+field routes: `ready/isActive + missing`, based on provider operational-core activation evidence.

This is not automatically wrong merely because two endpoints exist, but it is a **proven parallel-semantic risk** until the responsibilities are made explicit and non-overlapping. Public OpenAPI/frontend mirrors also still carry stale cross-domain blocker vocabulary.

### Canonical target

- Define one explicit Workforce-owned professional/activation readiness model, or explicitly separate two uniquely named concepts with non-overlapping invariants and consumers.
- No Workforce reason may claim DSH dispatch/store authorization or WLT finance truth.
- Identity dependency failure is an error/unavailable state, never a normal Workforce business denial.
- Public API, internal service API, OpenAPI, generated clients, frontend mirrors and tests must express the same semantic ownership.
- Remove stale cross-domain blocker reasons only after every consumer is migrated.

### Required treatment

1. Inventory every readiness evaluator, route, type, reason code, caller, generated artifact, test, dashboard/surface and storage/read-model dependency.
2. Build a responsibility matrix: `professional activation`, `professional current readiness`, `DSH operational start-work readiness`, `financial eligibility`.
3. Collapse duplicate Workforce logic or rename/separate only where two concepts are genuinely required.
4. Make internal DSH consumption use the canonical Workforce service contract rather than a second repository-only policy if both express the same decision.
5. Update OpenAPI status/error contracts, including explicit 503 dependency-unavailable behavior.
6. Regenerate clients/types and migrate all consumers.
7. Negative-space prove stale blocker vocabulary, aliases and duplicate evaluators are gone or uniquely justified.

## 5. ROOT-02 — DSH operational readiness: Captain and Field

### Captain

Current DSH owns `GET /dsh/captain/me/readiness` and composes Workforce + DSH dispatch + WLT-backed financial eligibility. Preserve this owner direction.

Required closure:

- prove backend contract and frontend type/client equality;
- preserve `503 CAPTAIN_READINESS_UNAVAILABLE` for unverifiable sovereign dependencies;
- no surface-local reclassification of outage into business denial;
- reason vocabulary must be typed/stable and presentation mapping must not become a second policy;
- app unavailable UI must have an actual retry/recovery path, not text instructing retry without a retry action;
- stale UI state must not allow protected work to render after readiness becomes invalid.

### Field

Current Field has an internal semantic primitive but no single public `GET /dsh/field/me/readiness` boundary, while app-field deep-couples into DSH/Workforce internals and can synthesize `BLOCKED/ELIGIBILITY_UNAVAILABLE` on failure.

Required closure:

1. Define the minimum DSH Field start-work/readiness aggregate using existing canonical primitives; do not create a second policy engine.
2. Expose one public self-readiness API if current exact audit confirms this is the minimum correct application boundary.
3. Missing assignment/business prerequisite = business denial.
4. Workforce/DSH dependency outage = unavailable/503.
5. App-field consumes only the DSH public boundary and never synthesizes owner decisions.
6. Rename/remove misleading `enforceFieldReadinessGate`-style wrappers/comments if they only perform role checks.
7. Verify Field profile/readiness/assignment/visit/store-operation journeys end-to-end.

## 6. ROOT-03 — package/public-boundary and lockfile cutover

Proven current defects:

- `apps/app-captain/runtime/package.json` declares `@bthwani/dsh: workspace:*`, but the `apps/app-captain/runtime` importer in `pnpm-lock.yaml` does not contain `@bthwani/dsh`.
- app-field still uses deep relative filesystem imports into `services/dsh` and lacks a declared equivalent public DSH package dependency/export path.

### Canonical target

- Runtime shells import only public package boundaries such as `@bthwani/dsh/app-captain` and the minimum justified `@bthwani/dsh/app-field`.
- Every workspace import is declared in its manifest and represented in the lockfile.
- Clean checkout + frozen install + TypeScript + Metro/Expo resolution all succeed without existing `node_modules` masking defects.
- No tsconfig/Metro path hack exists solely to bypass a missing package boundary.

### Treatment order

1. Complete exact import inventory for all four mobile apps and Control Panel.
2. Export the minimum missing public DSH boundaries; do not export arbitrary internals.
3. Declare dependencies in consuming package manifests.
4. Migrate deep imports to public exports.
5. Regenerate `pnpm-lock.yaml` from manifests using the repository-canonical package-manager flow.
6. Inspect lock diff; no unrelated package churn is accepted without cause.
7. Prove `pnpm install --frozen-lockfile` (or repository-canonical equivalent) from a clean dependency state.
8. Remove obsolete path/include/Metro workarounds only after resolution proof.
9. Run app-specific typecheck/test/build/export and package/source ESM-resolution parity checks.

Forbidden: deleting the lockfile, using a non-frozen bypass as closure evidence, or relying on pre-existing `node_modules`.

## 7. ROOT-04 — mechanically enforce the architecture boundary

The existing `tools/guards/fullstack-boundary-gate.mjs` does not currently reject the exact deep app-runtime → service-implementation traversal proven in app-field.

Required treatment:

- extend the existing guard, rather than adding an overlapping second owner;
- forbid app runtimes from deep-importing `services/dsh/frontend/**` implementation paths;
- allow the intended public package exports;
- add focused negative fixtures/tests proving forbidden traversal fails;
- re-run all existing boundary cases to prevent regressions.

## 8. ROOT-05 — Workforce assignments vs DSH authorization scopes

Canonical split is already evidenced:

- Workforce operational assignments = staffing/professional operational assignment truth.
- DSH store/service-area authorization = DSH object authorization truth.

Execution must still prove the entire writer/reader graph:

1. enumerate tables/migrations/repos/routes/services/jobs/UI forms/generated clients for both meanings;
2. classify each as owner, projection, compatibility, stale, or duplicate;
3. prove no Workforce assignment by itself authorizes a DSH object;
4. prove no DSH authorization row is being used/written as workforce staffing truth;
5. remove surviving assignment-era DSH writers/tables/routes/aliases only after consumer proof;
6. preserve audit/history only where required and make it immutable/non-authoritative;
7. verify operator context, role, scope and IDOR/permission negative paths.

## 9. ROOT-06 — COD/WLT financial single truth revalidation

Historical treatment removed/fenced active legacy captain COD collection/remittance/custody paths. This must be re-proven on current HEAD and the governed runtime/data environment.

Required verification/treatment if any gap remains:

- WLT remains sole financial writer/ledger owner;
- no DSH/WLT legacy `collect/remit`, `cash_in_transit`, old custody or `cod_collected` writer can create new truth;
- current canonical lifecycle covers reserve/authorization/finalization/release/deduct/refund/reversal/settlement/reconciliation/idempotency;
- commission/settlement/read models do not revive legacy status semantics;
- migrations are ordered/applied and legacy writes fail closed;
- historical rows reconcile; no orphan/double-post/unbalanced/refund/custody discrepancy survives;
- DSH only exposes operational evidence/facades and never becomes a second financial ledger.

Production/data evidence that is unavailable must be labeled unavailable; it cannot be represented as proven green.

## 10. ROOT-07 — Workforce ↔ Identity provisioning revalidation

Prove one trusted professional provisioning model for Field/Captain/Employee/leadership paths:

- Identity owns actor/auth/session/role/surface identity;
- Workforce owns provisioning intent/profile and derives allowed identity role/surface server-side;
- no caller-controlled raw actor ID becomes provisioning authority;
- exact-fingerprint idempotency, conflict semantics and compensation are correct;
- rollback cannot leak an orphan Identity actor or orphan Workforce profile;
- existing-actor linking is explicit and validated;
- activation occurs only after required professional prerequisites;
- contracts/runtime/generated clients/forms agree;
- obsolete external provisioning-case routes, commented rollback code, dangling clients and duplicate employee-creation APIs are removed if no unique Product requirement remains.

## 11. ROOT-08 — native mobile capability ownership

Across Client/Partner/Captain/Field:

- app runtime owns Expo/native implementation and dependency declarations;
- DSH/shared packages consume typed capability interfaces/adapters only where needed;
- no shared package silently re-acquires native implementation ownership;
- every native dependency has a real app consumer and justified owner;
- Android export/build/device evidence is run on the final candidate;
- iOS evidence is produced only on an iOS-capable environment and otherwise explicitly marked external/unavailable, never faked;
- offline/retry/background/permission-denied/device-capability failure behavior is tested where applicable.

## 12. ROOT-09 — ETA semantics

Re-prove:

- provider route duration is the only route ETA truth;
- provider absent/error/no duration returns explicit unavailable/degraded semantics;
- no geometric/distance-time approximation is silently presented as route ETA;
- serviceability remains separately governed by DSH policy and is not changed by ETA unavailability;
- provider failure → recovery journey is verified across API and affected surfaces.

## 13. ROOT-10 — derived graph convergence

After root treatment, reconcile all derived representations from canonical owners:

- OpenAPI roots/modules/overlays/composed bundles;
- generated Go/TS clients/types;
- route binding/API registries;
- capability maps and manifests;
- service manifests;
- package exports;
- workspace manifests + `pnpm-lock.yaml`;
- database migration manifests;
- UI state/reason mappings;
- tests/fixtures/guards.

Any generated drift is fixed at the canonical generator/owner, not by hand-editing a downstream artifact as the root fix.

## 14. ROOT-11 — stale/dead artifact cleanup

`services/dsh/backend/DOCKERFILE_PENDING.md` still states that a DSH Dockerfile should not yet exist, while `services/dsh/backend/Dockerfile` exists. Recheck all references/intent on latest HEAD; if no unique historical requirement exists, delete the pending artifact. Do not replace it with another status document.

Apply the same retention test to every touched/exposed artifact:

`Necessary Purpose + Correct Owner + Real Consumer + Requirement + Proven Value + Correct Placement`.

If that proof fails: simplify, consolidate, move to the canonical owner, or delete after blast-radius proof.

## 15. ROOT-12 — exact-candidate evidence and reproducibility

Before any closure claim:

1. Re-pin latest `b` HEAD before writes.
2. Classify concurrent delta: disjoint / related / overlap / conflict / authority change.
3. Reconcile onto latest HEAD; do not overwrite newer valid work.
4. Stage only an explicit allowed set; never use `git add .` as uncontrolled closure staging.
5. Inspect staged diff and generated/lockfile delta.
6. Pin implementation candidate SHA after target-system writes.
7. Run all required verification on that exact candidate/runtime build.
8. If a bookkeeping/plan write follows, pin the new candidate and reconcile evidence.
9. Runtime `sourceSha`/artifact provenance must match the candidate where supported.
10. Missing hosted CI is recorded as missing; local governed evidence may supplement but must not be called hosted green CI.
11. Final branch movement after verification invalidates affected evidence until reconciled.

## 16. Full audit coverage before EXECUTE_CLOSE

Before starting mutation, finish the current read-only inventory across the entire material cone:

- all five product surfaces and runtime shells;
- Identity, Workforce, DSH, WLT, Platform-Control, Providers;
- shared packages/data-runtime/UI/runtime composition;
- APIs/routes/handlers/clients/contracts/generators;
- DB schemas/migrations/indexes/triggers/jobs/outbox/events;
- package manifests/exports/lockfile/Metro/TS/Expo resolution;
- guards/CI/journey profiles/scripts;
- runtime config/readiness/health/dependency failure;
- permissions/operator context/IDOR/isolation;
- current deep service imports for Client/Partner/Captain/Field/Control Panel;
- all assignment/scope readers/writers;
- all current COD writers/readers/status references;
- all readiness reason/evaluator/route/type consumers;
- all TODO/FIXME/HACK/workaround/fallback/deprecated/legacy/duplicate/dead artifacts in the affected cone.

For live-system-relevant roots, collect the orchestrator evidence classes as applicable: workspace truth, runtime configuration, source evidence, runtime flow, DB/storage evidence, network/API evidence, identity/request context, tests/logs. Mark genuinely unavailable/not-applicable evidence truthfully.

## 17. Execution waves

### Wave 0 — latest-HEAD reconciliation
Re-pin, classify foreign delta, expand blast radius, re-rank roots. If a higher root is exposed, execute it first.

### Wave 1 — readiness authority closure
Close ROOT-01 first: Workforce semantics/contracts/internal/public consumers become coherent. Then close DSH Captain/Field journey boundaries without surface-local policy.

### Wave 2 — public package and dependency cutover
Close ROOT-03 and ROOT-04: Field/Captain public exports, manifests, lockfile, clean install, no deep imports, durable guard.

### Wave 3 — assignment/authorization closure
Close ROOT-05 with writer/reader/data/API/UI negative-space proof and cleanup.

### Wave 4 — high-risk historical roots
Revalidate/fix ROOT-06 COD/WLT, ROOT-07 Workforce↔Identity, ROOT-08 native capabilities, ROOT-09 ETA. Any reopened source/data root is treated before lower cleanup.

### Wave 5 — derived graph and cleanup
Regenerate/reconcile contracts/clients/capabilities/exports/lock/migration manifests. Delete stale/dead/duplicate/legacy artifacts including proven stale pending files and misleading authority names/comments.

### Wave 6 — full operational verification
Run all five surfaces, all affected services, DB migrations, runtime readiness, permissions, failure/recovery, offline/native and cross-surface readback/adversarial cases.

### Wave 7 — re-audit/re-rank loop
Repeat until every material root is `PROVEN_CLOSED` or `N/A_PROVEN`. The plan being exhausted is not closure.

## 18. Mandatory verification matrix

### Semantics/contracts

- Workforce runtime == internal/public API contract == OpenAPI == generated clients == frontend types.
- Captain DSH readiness runtime == contract == client == UI state model.
- Field DSH readiness runtime == contract == client == UI state model.
- unavailable/error states never become false business denial.

### Backend/services

- Go tests for Identity/Workforce/DSH/WLT/Platform-Control/Providers according to blast radius.
- integration/database tests for readiness, provisioning, authorization, COD, settlement/refund/reversal, serviceability and migration invariants.
- idempotency/concurrency/retry/duplicate-event/partial-failure/restart cases.

### Database/data

- migration manifest/order/application on representative pre-change data;
- financial before/after reconciliation and ledger balance;
- actor/profile/linkage integrity;
- assignment/scope single-writer proof;
- no orphan rows/references or unintended dual writes.

### Frontend/mobile

For Client, Partner, Captain, Field and Control Panel as applicable:

- typecheck/lint/test/build;
- Metro/Expo resolution and mobile export;
- real-device/native evidence where required;
- auth/session/profile/readiness/permission unavailable+forbidden+conflict+stale/offline/recovery states;
- no screen becomes usable before required owner decisions are proven.

### Product journeys preserved

- Client: stores/catalog/cart/checkout/orders/tracking/special requests/support/wallet readback/addresses/serviceability.
- Partner: store/catalog/orders/commercial/finance readback/support; no Awnak/SHEIN role unless Product changes it.
- Captain: Workforce profile/readiness, availability/dispatch/pickup/delivery/proof, finance/COD, special-request dispatch.
- Field: profile/readiness/assignments/visits/catalog/onboarding/finance; no Awnak/SHEIN role unless Product changes it.
- Control Panel: Identity/Workforce administration, operations/rescue/special requests, governed configuration, finance readback/operator mutations, audit.

### Security/authority negative paths

- wrong role/surface;
- wrong operator context;
- cross-actor/IDOR attempt;
- absent/expired session;
- unavailable sovereign dependency;
- forged caller scope/actor ID/financial amount;
- stale version/concurrency conflict;
- direct frontend-to-WLT authority bypass;
- deep app-runtime service import guard failure.

### Negative-space scans

Prove absence or uniquely justified retention of:

- deep `apps/** -> services/dsh/frontend/**` imports;
- local Captain/Field readiness policy/evaluator remnants;
- stale cross-domain Workforce blocker vocabulary;
- `ELIGIBILITY_UNAVAILABLE` business-state fabrication;
- undeclared workspace dependencies;
- manifest/lock drift;
- active legacy COD collect/remit/cash-in-transit writers;
- obsolete provisioning-case clients/routes/commented rollback code;
- duplicate assignment/authorization truth;
- silent ETA fallback;
- stale `DOCKERFILE_PENDING.md` after reference proof;
- affected TODO/FIXME/HACK/workaround/fallback/deprecated/legacy/dead/duplicate files, aliases, exports and comments.

## 19. Cleanup law

Cleanup continues through:

`line → branch → function → symbol → file → file-group → folder → package/module → service/surface/domain`.

Do not delete complexity that protects a proven invariant: ledger balancing, idempotency, optimistic locking, maker-checker, trusted context, append-only audit, migration safety, offline/retry correctness or security isolation.

Do delete complexity whose only purpose is obsolete migration history, an abandoned workaround, duplicate authority, dead API, stale generated mirror, misleading naming, unused compatibility, or hidden fallback.

## 20. Governance mutation gate

Governance stays read-only unless all are true before a write:

1. canonical Product/System truth is established independently;
2. a specific governance statement is materially stale/incorrect/missing;
3. root cause and blast radius are proven;
4. no material decision remains unresolved;
5. the write records proven truth and does not invent approval/authority.

No agent may manufacture Product/QA/security/release approval metadata.

## 21. Closure protocol

`CLOSED` is allowed only when:

- every original and newly exposed material root is `PROVEN_CLOSED` or `N/A_PROVEN`;
- every required consumer is migrated and verified;
- no material parallel/legacy truth survives;
- all required data/native/runtime external evidence has a truthful disposition;
- no material stale/dead/duplicate/misplaced artifact survives in the affected blast radius;
- final candidate is clean and reproducible;
- exact-candidate positive + negative + failure/recovery + adversarial evidence passes;
- final re-audit finds no new higher root.

Final sequence:

1. finish last target-system treatment and cleanup;
2. verify clean workspace/staging and pin implementation candidate;
3. run exact-candidate verification;
4. re-audit/re-rank;
5. retire/delete superseded temporary plan records only after all material closure proof is complete;
6. pin the post-plan-deletion final candidate;
7. perform final read-only `Audit + Inspect + Diagnose + Analyze + Negative Space + Adversarial Re-check`;
8. if anything material appears, outcome returns to `OPEN`; otherwise outcome may be `CLOSED`.

## 22. Current declaration

- `CANONICAL_MERGED_PLAN: YES`
- `SUPERSEDES_TWO_PRIOR_PLANS_AS_EXECUTABLE_GUIDANCE: YES`
- `TARGET_SYSTEM_MUTATION_BY_THIS_PLAN_WRITE: NONE`
- `MATERIAL_DECISION_REQUIRED: NONE`
- `READY_TO_EXECUTE_BLINDLY: NO`
- `REQUIRED_NEXT_ACTION: finish latest-HEAD read-only audit cone, then enter EXECUTE_CLOSE at highest proven root`
- `NO_HISTORICAL_CLOSURE_INHERITED_WITHOUT_REVALIDATION: YES`
