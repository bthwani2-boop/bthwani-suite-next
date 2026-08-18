# CANONICAL EXECUTION RECORD — All Surfaces / All Services Root Closure — 2026-08-19

> **CLASS:** `TEMPORARY EXECUTION RECORD — NOT SOURCE OF TRUTH`
>
> **PURPOSE:** one current execution-ready record for the all-surfaces/all-services closure task. This file records audited evidence, root status, canonical targets, treatment, verification and closure accounting. It never substitutes for treatment in the actual system.
>
> **ABSOLUTE LAW:** `DOCUMENTATION RECORDS THE REQUIRED FIX; IT NEVER SUBSTITUTES FOR THE FIX.`

## 0. AUDIT_PREPARE authority and exact baseline

- Repository: `bthwani2-boop/bthwani-suite-next`
- Branch: `b`
- Task: `all-surfaces-services-canonical-execution-root-closure`
- Phase that produced this revision: `AUDIT_PREPARE`
- Governing entrypoint: `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`
- Governing package revision observed: `PACKAGE_REVISION: 6`
- Audited branch HEAD before this planning write: `ea6eda6bbb79c94ae31d709107945c93fc8d8ea0`
- Latest target-system source HEAD under that plan-only HEAD: `5425e10fe766520832e185feb3bc4719a43f0f03`
- Reason for the split: `ea6eda6b...` is a planning-record update whose parent is `5425e10f...`; target-system source truth was therefore audited at `5425e10f...` while planning truth was reconciled at `ea6eda6b...`.
- `FOREIGN_DELTA = INPUT, NOT INSTRUCTION`.
- Target-system mutation performed by this AUDIT_PREPARE revision: `NONE`.
- Governance mutation performed: `NONE`.
- Runtime/DB/provider mutation performed: `NONE`.
- Material `DECISION_REQUIRED` at this handoff: `NONE`.

### 0.1 Canonical status vocabulary

Findings/roots in this record use only the orchestrator-compatible statuses:

`OPEN | EVIDENCE/HOLD | FIXED_PENDING_VERIFY | PROVEN_CLOSED | NOT_APPLICABLE_WITH_PROOF`.

Do not invent parallel status vocabularies such as `PROVEN_OPEN`, `REVALIDATION_REQUIRED`, `OPEN_GATE`, `CONTINUOUS`, `SOURCE_CLOSED`, or similar. A source fix whose final proof is incomplete is `FIXED_PENDING_VERIFY`. A claim blocked on evidence/capability is `EVIDENCE/HOLD`. A real untreated root is `OPEN`.

### 0.2 Scope / exclusion classification

This record governs the materially proven affected cone of the all-surfaces/all-services closure task, including:

- `core/identity/**`
- `core/workforce/**`
- `core/providers/**` where provider/runtime truth is consumed
- `services/dsh/**`
- `services/wlt/**`
- `apps/app-client/**`
- `apps/app-partner/**`
- `apps/app-captain/**`
- `apps/app-field/**`
- `apps/control-panel/**` or the current control-panel surface path when materially affected
- contracts/OpenAPI/generated clients
- package exports/manifests/lockfile
- DB schemas/migrations/readback
- runtime/orchestration/CI when materially required
- `governance/**` as `READ_ONLY` impact evidence unless the governance mutation gate is independently satisfied during execution.

Classification law:

`UNKNOWN != NOT_APPLICABLE_WITH_PROOF`

`NOT_INSPECTED != CLEAN`

`NO_SEARCH_RESULT != ABSENT`

No project-wide closure may be claimed from a narrower proof set.

## 1. Retirement of prior parallel planning records

This record fully supersedes these two older planning records:

1. `plans/diagnose-implementing/all-surfaces-services-root-closure-20260818.md`
2. `plans/diagnose-implementing/all-surfaces-services-post-execution-root-closure-20260818.md`

They are no longer useful as active files because they contain stale HEADs, superseded states, older root classifications, and execution-readiness assumptions that conflict with current source truth. Their material evidence has been consolidated here and Git history remains the forensic archive.

Keeping them active would create `PARALLEL PLANNING TRUTH` and make a later executor vulnerable to following a stale root/status/order. They must therefore be deleted in the same atomic planning-only commit that writes this record.

Historical evidence is not erased by deletion; it remains reachable through Git history. No historical status is inherited without current proof.

## 2. Canonical owner matrix

### Identity

Owns actor identity, authentication, trusted session/operator context, roles/permissions as defined by current Identity contracts, credential/activation semantics, and actor lifecycle identity facts.

### Workforce

Owns professional/workforce profile, engagement, professional prerequisites, provider activation evidence, current provider professional readiness, workforce lifecycle, and Workforce operational assignments.

Workforce may consume Identity lifecycle/context. Workforce must not own DSH store-object authorization, dispatch truth, or WLT financial truth.

### DSH

Owns commerce and DSH operational journey truth: stores, DSH store-object authorization, catalog, checkout/order, dispatch/delivery, field/partner journey orchestration, DSH operational readiness composition, serviceability and DSH operational projections.

`dsh_store_actor_scopes` is a DSH-owned **store-access authorization scope** family. It is not Workforce staffing/operational assignment truth.

### WLT

Owns authoritative financial truth: payment sessions, wallets, balances, ledger, COD custody semantics, capture/finalization, refund/reversal, settlement, reconciliation and financial eligibility.

DSH may consume/project bounded WLT facts; it must not become a second financial ledger/writer.

### Providers / platform-control

Provider-backed route/duration truth remains provider-owned. Platform-control owns only governed platform configuration within its current authority; neither silently absorbs domain truth.

### Mobile app runtimes

Client/Partner/Captain/Field runtimes own native-module composition and concrete Expo/React-Native implementation. Shared DSH code owns typed capability contracts/factories/shared presentation where justified, not direct app-runtime native dependency ownership.

### Surfaces

Surfaces consume canonical owner decisions and own presentation/ephemeral UI state only. They must not manufacture authentication, readiness, authorization, assignment or financial truth.

## 3. Required invariants

1. `ONE DURABLE FACT = ONE CANONICAL OWNER + ONE AUTHORITATIVE WRITE PATH`.
2. `DSH STORE AUTHORIZATION != WORKFORCE OPERATIONAL ASSIGNMENT`.
3. `DEPENDENCY_UNAVAILABLE != BUSINESS_BLOCKED`.
4. `PROJECTION/CACHE/FRONTEND STATE != AUTHORITY`.
5. `CANONICAL CHANGE WITHOUT ALL MATERIAL CONSUMERS MIGRATED = INCOMPLETE`.
6. `LOCAL FIX != SYSTEM FIX`.
7. `ONE SURFACE PASS != END-TO-END PASS`.
8. `BUILD PASS != SYSTEM CORRECTNESS`.
9. `TEST PASS != ROOT CLOSED`.
10. `COMMIT EXISTS != VERIFIED CANDIDATE`.
11. `CURRENT CODE != AUTOMATIC PRODUCT/GOVERNANCE TRUTH`.
12. `WORKING != JUSTIFIED; COMPLEX != ROBUST`.
13. Route ETA is provider-backed duration; provider failure yields explicit unavailable state, not a silent geometric approximation.
14. WLT is the sole money/custody/ledger truth.
15. Runtime/contract/generated/package/lock/consumer graph must converge in one coherent cutover.

## 4. Current source-treatment evidence ledger

The following source treatments already exist on the current source lineage. EXECUTE_CLOSE must not reimplement them merely because older plans list their roots as open.

| Commit | Proven source treatment | Current proof limit |
|---|---|---|
| `8a3b0e365542aab12aa19171503d55ca7792d5f5` | Workforce readiness semantic separation; DSH Field self-readiness; Captain/Field unavailable handling; four mobile public DSH boundaries; package/lock updates; fullstack deep-import guard; stale Docker pending file deletion; related contracts/generated artifacts | source diff/current-tree proof; exact final candidate runtime/full regression still required |
| `51a16e7c17686dfb4bd931e98f77a56b22b1bedc` | partner catalog/proposal `storeId` propagation through contract/generated/frontend/journey | exact-candidate runtime/DB journey verification still required |
| `075340518a8d63198c75994b7db2ac4518d4ab15` | authoritative Identity context bound before Workforce readiness gate | exact-candidate activation/provisioning runtime/security proof still required |
| `9a0fbb962f815588da10666c1a8d0c69508e4b5a` | partner self-readbacks scoped by explicit store | exact-candidate onboarding/readback proof still required |
| `5425e10fe766520832e185feb3bc4719a43f0f03` | candidate-bound prepared-runtime provenance and elimination of duplicate DSH rebuild during prepared smoke | targeted policy source exists; no current live CI status/PR workflow proof; runtime before/after/provenance evidence still required |

Additional current exact source evidence:

- `core/workforce/backend/internal/workforce/readiness.go` exposes `EvaluateCurrentProviderReadiness` and confines the decision to Identity lifecycle + Workforce professional state.
- `core/workforce/backend/internal/http/readiness_routes.go` maps Identity/readiness dependency failure to `503 WORKFORCE_READINESS_UNAVAILABLE` instead of business `BLOCKED`.
- `core/workforce/backend/internal/http/internal_readiness_routes.go` exposes explicitly named governed **activation** readiness for Captain/Field.
- `core/workforce/backend/internal/workforce/activation_evidence.go` documents that activation evidence extends activation calculation rather than creating a second current-readiness state machine.
- `services/dsh/backend/internal/http/field_readiness_routes.go` exposes `GET /dsh/field/me/readiness`.
- all four mobile runtime shells consume public `@bthwani/dsh/app-*` boundaries on the audited source tree.
- all four mobile runtime manifests declare `@bthwani/dsh: workspace:*` and the current lock graph contains the workspace DSH links.
- `tools/guards/fullstack-boundary-gate.mjs` contains app-runtime deep-service import rejection.
- `services/dsh/backend/DOCKERFILE_PENDING.md` is absent on current source truth.
- `services/dsh/backend/internal/http/dispatch_live_tracking.go` obtains ETA from `mapproviders.Client.Route`; provider failure becomes `provider_unavailable` and leaves ETA absent rather than approximating distance/duration geometrically.
- `apps/app-client/runtime/src/platform/dsh-capabilities.tsx` imports concrete Expo/React-Native modules and injects them into typed DSH capability interfaces.

## 5. Canonical root ledger — current reclassification

| ID | Priority | Status | Current disposition |
|---|---:|---|---|
| ROOT-01 | P0 | `FIXED_PENDING_VERIFY` | Workforce `CurrentProviderReadiness` and governed activation readiness are now explicitly separate semantics; verify contract/generated/consumer/runtime equality and zero stale blocker vocabulary. |
| ROOT-02 | P0 | `FIXED_PENDING_VERIFY` | Captain + Field DSH operational readiness boundaries and unavailable semantics exist; verify both journeys on exact candidate. |
| ROOT-03 | P0 | `FIXED_PENDING_VERIFY` | Client/Partner/Captain/Field public DSH package cutover + manifest/lock graph exist; verify clean frozen install, Metro/Expo/typecheck and no hidden deep imports. |
| ROOT-04 | P1 | `FIXED_PENDING_VERIFY` | fullstack boundary guard contains deep app-runtime import enforcement; verify negative fixture can falsify regression. |
| ROOT-05 | P0 | `OPEN` | DSH store-access authorization is materially separated from Workforce assignments, but current DSH naming/commentary still uses assignment terminology in places; remove semantic aliasing and prove zero dual writer/ambiguous owner. |
| ROOT-06 | P0 | `EVIDENCE/HOLD` | COD/WLT source fences exist, but current production/historical reconciliation and exact-candidate migration/runtime proof are not available from this read-only audit. |
| ROOT-07 | P1 | `FIXED_PENDING_VERIFY` | Workforce→Identity governed provisioning source carries Workforce actor ID and trusted operator context; verify idempotency/compensation/linking/current contract/runtime. |
| ROOT-08 | P1 | `FIXED_PENDING_VERIFY` | native module composition is in app runtime and shared DSH is typed capability boundary; verify all four runtimes/device/platform behavior where material. |
| ROOT-09 | P1 | `FIXED_PENDING_VERIFY` | ETA source uses provider route duration and explicit unavailable state; verify runtime failure/recovery/consumer semantics and zero hidden approximation elsewhere in affected cone. |
| ROOT-10 | P1 | `FIXED_PENDING_VERIFY` | major OpenAPI/generated/package/capability cutovers exist; exact-candidate drift/contract/runtime graph verification remains. |
| ROOT-11 | P2 | `FIXED_PENDING_VERIFY` | stale `DOCKERFILE_PENDING.md` is removed; verify zero references and active Docker/runtime path. |
| ROOT-12 | P1 | `FIXED_PENDING_VERIFY` | partner catalog/proposal explicit `storeId` source cutover exists at `51a16e7c...`; verify DB-backed journey. |
| ROOT-13 | P1 | `FIXED_PENDING_VERIFY` | Workforce gate trusted Identity context source treatment exists at `075340518...`; verify activation/provisioning + negative context paths. |
| ROOT-14 | P1 | `FIXED_PENDING_VERIFY` | partner self-readback explicit store scoping exists at `9a0fbb962...`; verify onboarding/readback ambiguity and authorization. |
| ROOT-15 | P1 | `FIXED_PENDING_VERIFY` | duplicate DSH prepared-smoke rebuild source treatment exists at `5425e10f...`; do **not** reimplement; prove candidate provenance and comparable before→after execution cost without assurance loss. |

The former plan's `ROOT-12 exact candidate`, `ROOT-13 continuous cleanup`, and `ROOT-14 full regression` were not causal roots. They are reclassified below as **closure gates/obligations** to prevent root-accounting distortion.

## 6. ROOT-05 — first actionable implementation root

### Problem

The source architecture materially distinguishes:

- Workforce-owned staffing/professional operational assignments; and
- DSH-owned store-object access authorization in `dsh_store_actor_scopes`.

`services/dsh/database/migrations/dsh-990_workforce_assignment_cleanup.sql` explicitly preserves `dsh_store_actor_scopes` because it is DSH authorization, while removing retired DSH-local Workforce-like assignment state. `services/dsh/backend/internal/http/workforce_scopes.go` exposes Workforce assignment/scope read-through with Workforce as mutation owner.

However, `services/dsh/backend/internal/store/governance.go` and related naming/commentary still use assignment-oriented terminology for the DSH authorization family. That semantic alias is dangerous because it can cause future code/agents to treat authorization and Workforce assignment as one fact or recreate a parallel writer.

`services/dsh/backend/internal/fieldassignment/**` is a separate DSH journey/task-assignment concept for field onboarding; it must remain explicitly distinct from Workforce staffing assignment and DSH store authorization.

### Canonical target

Use three unambiguous concepts:

1. **Workforce operational assignment** — Workforce-owned staffing/professional assignment truth.
2. **DSH store-access authorization scope** — DSH-owned object-access authorization (`dsh_store_actor_scopes`).
3. **DSH field onboarding task assignment** — DSH-owned journey/task work allocation where that feature is still proven live.

No alias, API/type/comment/symbol/table interpretation may imply these are interchangeable.

### Required treatment

EXECUTE_CLOSE must begin here unless a newer HEAD proves a materially higher root:

1. inventory all current writers/readers/contracts/types/comments/tests for the three concepts;
2. prove exact authoritative writer for each;
3. rename/move/reword ambiguous DSH authorization symbols/comments/contracts where needed;
4. preserve persisted table compatibility only when real migration cost requires it; internal semantic naming should still become explicit;
5. remove dead aliases/helpers/read paths that imply Workforce assignment ownership in DSH;
6. preserve `dsh_store_actor_scopes` as authorization unless current direct evidence disproves that owner;
7. preserve DSH field-onboarding task assignment only if live owner/consumer/value remain proven;
8. update affected tests/contracts/generated artifacts/consumers in the same cutover;
9. prove zero dual writer and zero caller-supplied authorization authority;
10. negative-space search for `assignment` terminology that actually means store authorization and disposition each material occurrence.

### Blast radius

At minimum re-evaluate:

- `services/dsh/backend/internal/store/**`
- `services/dsh/backend/internal/http/workforce_scopes.go`
- DSH authorization middleware/helpers/media/ratings/support/partner consumers of store scopes
- `services/dsh/backend/internal/fieldassignment/**`
- DSH migrations/contracts/tests referring to these concepts
- Workforce assignment contracts/read-through consumers
- control-panel/partner/field consumers if exposed naming or behavior changes
- generated clients/types
- security/IDOR/object-scope tests
- governance impact as read-only unless its mutation gate is separately satisfied.

### Verification

- exact writer inventory for each concept;
- positive/negative DSH store authorization tests;
- ambiguity/no-first-store behavior;
- Workforce assignment read-through and mutation-owner proof;
- field onboarding task semantics if retained;
- IDOR/operator-context/actor isolation;
- contract/generated drift;
- zero material misleading alias/reference;
- runtime readback where required.

## 7. ROOT-01 — Workforce readiness semantics

Status: `FIXED_PENDING_VERIFY`.

Current target model:

- `CurrentProviderReadiness` = current Workforce professional-readiness decision.
- `GovernedActivationReadiness` = activation/provisioning prerequisite evidence.
- DSH Captain/Field operational readiness = DSH-owned composition of required authorities.
- WLT financial eligibility remains WLT-owned.

Required EXECUTE_CLOSE action: **verify, do not redesign by default**.

Verification must prove:

- public Workforce runtime/OpenAPI/generated/client types match exactly;
- no stale DSH/WLT blocker reason remains in Workforce current-provider contract;
- dependency unavailable yields 503/error, not business BLOCKED;
- internal activation consumers consume only activation semantics;
- no duplicate current-readiness evaluator or alternate authoritative writer is reachable;
- exact-candidate tests and affected runtime journeys pass.

If contradiction is found, reopen only the affected semantic cone and treat the proven root; do not restore the old parallel model.

## 8. ROOT-02 — DSH Captain/Field operational readiness

Status: `FIXED_PENDING_VERIFY`.

Source target exists:

- Captain: DSH operational aggregate consumes Workforce activation/professional evidence plus DSH dispatch and WLT financial truth as applicable.
- Field: public `GET /dsh/field/me/readiness` boundary exists and app-field consumes the DSH boundary.
- unavailable is distinct from blocked; surface retry/recovery paths exist in source treatment.

Verify:

- Captain and Field success/business-denied/unavailable/malformed/stale/retry/recovery;
- no surface-local synthesis of `BLOCKED` for dependency failure;
- no direct app-runtime deep service imports;
- no raw blocker code leaks where a user-facing mapping is required;
- exact contract/runtime/client equality;
- authorization and actor isolation.

## 9. ROOT-03 / ROOT-04 / ROOT-10 — package, boundary and derived graph

Statuses: `FIXED_PENDING_VERIFY`.

Current source target:

- `@bthwani/dsh/app-client`
- `@bthwani/dsh/app-partner`
- `@bthwani/dsh/app-captain`
- `@bthwani/dsh/app-field`
- `@bthwani/dsh/mobile-capabilities`

The four mobile manifests declare the DSH workspace dependency; the current lock graph contains DSH workspace links; DSH package exports the public boundaries; the fullstack guard rejects app-runtime deep service imports.

Required verification:

1. clean/frozen workspace install;
2. package manifest ↔ lockfile equality;
3. TypeScript/typecheck for all affected packages/surfaces;
4. Metro/Expo resolution for all four mobile runtimes;
5. fullstack boundary gate PASS;
6. explicit negative fixture proves a deep service import fails the guard;
7. zero hidden relative imports into `services/dsh/frontend/**` from app runtimes;
8. OpenAPI/generated client drift guards;
9. capability-map/runtime bindings;
10. no stale exports/aliases/dependencies after cutover.

## 10. ROOT-06 — WLT/COD single financial truth and historical reconciliation

Status: `EVIDENCE/HOLD`.

Current exact source fences verified during this audit:

- `services/wlt/database/migrations/wlt-940_captain_cod_legacy_write_fence.sql`
- `services/wlt/database/migrations/wlt-941_captain_cod_refund_write_fence.sql`
- `services/wlt/database/migrations/wlt-942_captain_cod_historical_write_fence.sql`
- `services/wlt/database/migrations/wlt-943_captain_cod_ledger_write_fence.sql`
- `services/dsh/database/migrations/dsh-1030_captain_cod_legacy_write_fence.sql`

`wlt-940` preserves historical `cod_collected` rows for reconciliation while preventing the live payment-session state machine from writing that retired status. `wlt-943` rejects new `cash_in_transit` ledger accounts while preserving historical rows. `dsh-1030` rejects retired `cod_collected` in live DSH WLT projections while preserving historical rows via `NOT VALID` constraints.

These source fences do **not** prove production/historical data reconciliation or exact-candidate migration application.

Required evidence before closure:

- migration manifest/order/current checksum truth;
- fresh install + supported upgrade path where material;
- exact-candidate migration ledger/readback;
- no current code/SQL/job/provider path can write retired COD custody states;
- historical `cod_collected` / `cash_in_transit` inventory and reconciliation disposition;
- no orphan/double-post/unreconciled balance;
- correct refund/reversal/settlement/finalization semantics;
- WLT remains the sole authoritative financial writer;
- DSH projections cannot become money authority;
- current runtime readback on the claimed environment.

If production data/provider access is unavailable, retain `EVIDENCE/HOLD`/exact blocker; never convert missing proof into PASS.

## 11. ROOT-07 — Workforce ↔ Identity provisioning

Status: `FIXED_PENDING_VERIFY`.

Current source evidence:

- Identity governed provisioning accepts the Workforce actor ID.
- the HTTP boundary derives trusted operator context from the request instead of trusting `operatorContextId` from request JSON.
- historical source commits hardened trusted-tenant and governed provisioning paths.

Required verification:

- Workforce actor ID ↔ Identity actor ID linking;
- create-only/idempotent semantics according to current contract;
- retry and duplicate handling;
- partial failure and compensation/reconciliation;
- tenant/operator-context enforcement;
- role/surface provisioning correctness;
- no caller-supplied authority spoofing;
- provisioning case persistence/restart semantics if still live;
- exact-candidate Workforce→Identity runtime journey.

Do not create another provisioning authority to satisfy a failing test/runtime path.

## 12. ROOT-08 — native capability ownership

Status: `FIXED_PENDING_VERIFY`.

Current source model is correct in direction:

- shared DSH exposes typed capability contracts/factories;
- app runtime imports concrete Expo/React-Native native modules and configures DSH capabilities.

Required verification across materially affected mobile runtimes:

- Android/iOS capability registration as applicable;
- location permission/services/current position;
- notifications permission/token/link response;
- SecureStore/device identity where used;
- image/document picker/map/video bindings where consumed;
- unavailable/permission-denied/recovery semantics;
- web fallback only where explicitly supported;
- no direct Expo/native imports reintroduced into shared DSH implementation paths that would violate runtime ownership.

Mock/static proof cannot close a real device claim.

## 13. ROOT-09 — provider-only ETA

Status: `FIXED_PENDING_VERIFY`.

Current source `services/dsh/backend/internal/http/dispatch_live_tracking.go` obtains route distance/duration from the Providers route client. Provider failure sets `routeState=provider_unavailable` and leaves ETA absent. ETA duration is derived from provider `DurationSeconds`; there is no silent straight-line duration approximation in that path.

Required verification:

- successful provider route → provider code/distance/duration/arrival readback;
- provider unavailable → explicit unavailable state, no fabricated ETA;
- destination unavailable/location stale/location lost/arrived semantics;
- client/partner/control operational consumers express consistent meaning;
- negative-space search across affected ETA paths for Haversine/geometric/speed-based silent substitute;
- recovery after provider returns;
- exact runtime/provider provenance where claimed.

## 14. ROOT-11 — stale Docker pending artifact

Status: `FIXED_PENDING_VERIFY`.

`services/dsh/backend/DOCKERFILE_PENDING.md` is absent on current source truth and a live DSH Dockerfile/runtime path exists.

Verify zero references to the deleted artifact and that canonical runtime/compose points to the active Dockerfile. Do not recreate another status/pending file.

## 15. ROOT-12 / ROOT-14 — partner store-scope contract cutovers

Statuses: `FIXED_PENDING_VERIFY`.

Source treatments:

- catalog/product-proposal requests carry explicit `storeId`;
- partner self activation/readiness readbacks carry explicit store scope;
- DSH authorization remains the sole store-object access truth;
- ambiguous multi-store actors must not collapse to a first-store fallback.

Verification:

- single-store and multi-store actors;
- explicit selected store;
- unauthorized store ID;
- omitted store under ambiguity → expected fail-closed result;
- generated client/query contract equality;
- UI/controller selected-store propagation;
- DB-backed catalog + onboarding journeys;
- no alternate partner/store authority.

## 16. ROOT-13 — trusted Identity context before Workforce gate

Status: `FIXED_PENDING_VERIFY`.

Verify:

- activation/reactivation gate reads with Identity-owned operator context;
- missing/unresolvable authoritative context fails closed;
- caller-supplied context cannot override it;
- downstream operator authorization remains enforced;
- expected error mapping is semantic, not generic false-success/false-block;
- exact-candidate provisioning journey passes.

## 17. ROOT-15 — duplicate runtime-build orchestration

Status: `FIXED_PENDING_VERIFY`.

The source treatment already exists at `5425e10fe766520832e185feb3bc4719a43f0f03`:

- candidate-bound runtime up/bootstrap writes a prepared-runtime marker bound to source SHA and running image IDs;
- DSH prepared smoke validates that marker;
- prepared smoke skips the duplicate DSH image build and performs non-building readiness/smoke before seed/journeys;
- direct standalone dispatcher behavior remains self-preparing.

**Do not implement this again.**

Required proof:

1. targeted orchestration policy test;
2. candidate-bound `runtime:up`/`runtime:bootstrap-dev` writes valid marker;
3. marker source SHA and image IDs match running containers;
4. prepared `runtime:smoke` does not execute a second DSH `up --build`;
5. direct standalone smoke retains intended self-preparation;
6. interrupted/failed run does not leave misleading valid provenance;
7. comparable before→after timing for the same scenario;
8. prove required runtime assurance was preserved and cost was not merely shifted elsewhere;
9. exact candidate runtime/readback.

Current GitHub inspection found no combined statuses and no PR-triggered workflow runs for `5425e10f...`; this is not a failure, but it means no live CI PASS is claimed from GitHub for that SHA.

## 18. Closure gates — not causal roots

The following are mandatory closure obligations, not independent root causes.

### CG-01 Exact-candidate provenance

Every material closure claim must bind to one immutable `FINAL_CANDIDATE`. Any material write creates a new candidate and invalidates affected evidence.

As applicable prove:

`source SHA | image/container | process freshness | migration ledger | generated artifacts | runtime endpoint/profile/config | seed/fixture provenance | CI/workflow SHA | canonical readback`.

### CG-02 Full affected-cone regression

Verify materially affected Client/Partner/Captain/Field/Control Panel and Identity/Workforce/DSH/WLT/Providers paths as required by each root.

Do not run every heavy suite blindly; use nearest falsifiable proof first, then broaden where shared/public/high-risk boundaries changed.

### CG-03 Failure / recovery / security

Cover where material:

`success | missing | malformed | unauthenticated | denied | wrong role/scope | IDOR | not found | stale/conflict | duplicate/replay | idempotency | race/concurrency | partial failure | DB/network/provider failure | timeout/unknown result | retry | restart/recovery | old/new data | compensation/reconciliation`.

### CG-04 Zero-tolerance finishing

Every materially affected remaining artifact must justify:

`Necessary Purpose + Correct Owner + Real Consumer + Current Requirement + Proven Value + Correct Placement + Correct Naming/Context`.

Remove dead/stale/duplicate/legacy/unused/orphan/misplaced aliases, imports/exports, TODO/FIXME/HACK, fallback/workaround, obsolete configs/scripts/dependencies/docs and unjustified compatibility residue tied to the affected cone.

### CG-05 Live repository-platform truth

Inspect GitHub checks/workflows/rulesets/reviews/settings only when a closure claim materially depends on them. Tracked workflow config is not live enforcement. A pass on another SHA is not proof.

### CG-06 Negative-space + adversarial final pass

Search deliberately for missing consumers/writers/readers, reachable legacy, parallel truth, stale contracts/generated output, auth/isolation gaps, runtime/data mismatch, hidden fallback, stale naming/placement and affected regressions.

## 19. EXECUTE_CLOSE start gate — no replanning

This plan is execution-ready.

At the start of EXECUTE_CLOSE:

1. resolve exact branch `b` and latest HEAD;
2. compare only the delta from this plan's preparation candidate;
3. invalidate only assumptions/evidence the delta can materially change;
4. do **not** restart AUDIT_PREPARE;
5. do **not** rebuild the plan/root landscape from zero;
6. do **not** reimplement any `FIXED_PENDING_VERIFY` source treatment unless current direct evidence proves the treatment is wrong;
7. select the highest actionable `OPEN` root.

### First execution target

Unless newer live truth invalidates this conclusion:

`HIGHEST ACTIONABLE PROVEN ROOT = ROOT-05`

`ROOT-05 → EXECUTE IMMEDIATELY`.

After ROOT-05 treatment, verification of independent `FIXED_PENDING_VERIFY` roots may proceed with maximum-safe parallelism, respecting shared write/migration/runtime dependencies.

ROOT-06 is evidence/data gated and must not block independent source/verification work unless its financial truth materially gates a dependent journey.

## 20. New findings during EXECUTE_CLOSE

A new finding never automatically means a new planning phase.

Classify:

- descendant/same root → absorb and close in current treatment;
- missing consumer/migration/cleanup → current blast radius; fix now;
- independent root → add to execution accounting and rank;
- proven higher parent root that invalidates current treatment → suspend dependent cone, treat parent, resume;
- true non-derivable Product/Business/Semantic/Architectural decision → stop dependent cone only and raise `DECISION_REQUIRED`;
- external evidence/capability gap → `EVIDENCE/HOLD` with exact acquisition path.

Never use `NEW FINDING → NEW MASTER PLAN` as the default.

## 21. Maximum-safe parallelism

Parallelize by coherent root ownership, not arbitrary files/frontend/backend/language.

Two work items may run concurrently only if proven:

`NO unresolved causal dependency`

AND `NO conflicting canonical authority`

AND `NO unsafe write overlap`

AND `NO ordered shared migration/cutover`

AND `NO evidence dependency requiring sequence`.

Maintain one canonical integration authority for live-HEAD reconciliation, root ranking, shared truth, collision resolution, candidate integration and final closure.

`VALID EVIDENCE → REUSE`

`INVALIDATED EVIDENCE → RECHECK AFFECTED PROOF ONLY`.

## 22. Mutation / commit / branch-race discipline

Before every material write batch:

`RE-PIN HEAD → CLASSIFY FOREIGN DELTA → OWN EXACT PATHS/HUNKS → MUTATE COHERENT ROOT → VERIFY`.

Never blindly use:

`git add . | git add -A | git commit -a | git checkout -- . | git restore . | git reset --hard | git clean -fd`.

Before commit:

`inventory tree → allowlist owned paths/hunks → stage explicitly → inspect staged diff → exclude foreign/unrelated work → commit one coherent logical boundary`.

For GitHub/API multi-file mutations prefer atomic blob/tree/commit against the exact expected parent and a non-force fast-forward ref update. If the branch moves, rebuild/reconcile rather than overwrite.

## 23. Governance fail-closed

`GOVERNANCE != AUTOMATIC TRUTH`

`CURRENT CODE != GOVERNANCE UPDATE AUTHORITY`

`UNCERTAINTY = NO GOVERNANCE WRITE`.

Any governance mutation requires proof of:

`Canonical Product/System Truth + Root Cause + Impact + Blast Radius + no material Decision Required`.

Otherwise disposition remains `EVIDENCE/HOLD` or `DECISION_REQUIRED`. Do not edit governance merely to describe an unfixed ideal or mirror current implementation without authority proof.

## 24. Protected / irreversible actions

Before any production data mutation, destructive backfill, secret/key rotation, external financial/provider mutation, deploy/release/merge/tag or infrastructure destruction, prove:

`current authority | exact environment/target | scope | candidate/change binding | rollback/compensation where possible | verification/readback | required human/safety gate`.

This plan does not itself authorize a protected external/production mutation merely by naming it.

## 25. Temporary compatibility

Temporary compatibility is allowed only for a proven mixed-version/rollout requirement and must have:

`one semantic authority | explicit scope | owner | consumer list | observability | failure behavior | expiry/removal condition | cutover proof`.

Convenience is not a compatibility requirement. No permanent shim may be used to avoid a coherent cutover.

## 26. Test / guard integrity

Tests and guards encode correct semantics; do not weaken/disable/silence a valid test to make implementation green.

If a test/guard is stale, first prove canonical semantics, then update it and prove it can still falsify the broken behavior.

`MOCK PASS != REAL RUNTIME/PROVIDER PROOF` for a real operational claim.

## 27. Verification matrix

| Claim family | Minimum proof |
|---|---|
| Workforce readiness semantics | focused Go tests + OpenAPI/generated/type equality + 503 unavailable behavior + DSH consumer contract |
| Captain/Field readiness | backend tests + surface typechecks + exact runtime success/block/unavailable/retry/recovery |
| mobile public boundaries | frozen install + lock/manifests + all four typechecks/Metro/Expo + deep-import negative fixture |
| assignment vs authorization | writer/reader inventory + authz/IDOR tests + contract/generated + runtime readback |
| COD/WLT | migrations + manifest + DB data reconciliation + ledger/readback + no legacy writer |
| provisioning | Identity/Workforce tests + trusted context/tenant + idempotency/compensation + runtime onboarding |
| native | source ownership + device/platform evidence where claim requires it |
| ETA | provider success/failure/recovery + negative-space no approximation + consumer semantics |
| partner store scope | DB-backed multi-store contract/journey + unauthorized/omitted scope negatives |
| runtime duplicate build | policy test + candidate marker/image provenance + smoke + before/after timing |
| cleanup | reference/reachability/dependency/config/doc negative space |
| final closure | exact candidate + affected regression + security/failure/recovery + final adversarial pass |

## 28. Evidence provenance and invalidation

Every material evidence item used for closure must remain reconstructable with enough of:

`claim/root | exact SHA/source identity | command/run/job/path | environment/profile/device | result | what it proves | what it does not prove | freshness | invalidation trigger`.

Examples:

- contract/schema change invalidates generated/consumer proof;
- data/migration owner change invalidates DB/runtime/readback proof;
- auth change invalidates security/isolation proof;
- shared canonical package change invalidates all affected consumer proof;
- runtime/config change invalidates runtime evidence;
- unrelated planning-only change may preserve target-system evidence only when independence is proven.

## 29. Plan lifecycle and reopening after retirement

Keep this file as the single temporary execution record through EXECUTE_CLOSE.

When all material roots/findings are `PROVEN_CLOSED` or `NOT_APPLICABLE_WITH_PROOF`, all required `EVIDENCE/HOLD` conditions have been resolved or truthfully dispositioned according to the closure claim, and all closure gates pass:

1. freeze remaining intended project writes;
2. pin implementation candidate;
3. run exact-candidate verification;
4. delete **this** plan as the last intended project-record write;
5. that deletion creates a new candidate;
6. run final read-only Audit + Inspect + Diagnose + Analyze + Negative Space + Adversarial Re-check on the new candidate;
7. re-resolve live branch HEAD;
8. declare `CLOSED` only if nothing material reopens.

If the post-deletion final pass exposes a material issue, closure is revoked. Before any further mutation, recreate/continue **this same canonical temporary execution record** from Git history/current evidence, rather than creating a new parallel master plan, then resume treatment.

## 30. Closure equation

`CLOSED` requires all materially applicable terms:

`ZERO_UNKNOWN_REQUIRED_COVERAGE`

AND `ZERO_UNINSPECTED_REQUIRED_NODES`

AND `ZERO_KNOWN_MATERIAL_OPEN_ROOTS`

AND `ZERO_UNRESOLVED_MATERIAL_FINDINGS`

AND `ZERO_FIXED_PENDING_VERIFY_FINDINGS`

AND `ZERO_UNRESOLVED_REQUIRED_DECISIONS`

AND `ZERO_UNACCOUNTED_OR_UNMIGRATED_AFFECTED_CONSUMERS`

AND `ZERO_UNINTENDED_AFFECTED_REGRESSIONS`

AND `ZERO_CONTRADICTORY_CANONICAL_TRUTHS`

AND `ZERO_DUPLICATE_AUTHORITATIVE_WRITERS`

AND `ZERO_UNJUSTIFIED_PARALLEL_TRUTH`

AND `ZERO_UNJUSTIFIED_REACHABLE_LEGACY`

AND `ZERO_KNOWN_FINAL_PATCHES_WORKAROUNDS_SILENT_FALLBACKS`

AND `ZERO_MATERIAL_MIGRATION_BACKFILL_CUTOVER_GAPS`

AND `ZERO_MATERIAL_CONTRACT_GENERATED_BINDING_DRIFT`

AND `ZERO_MATERIAL_AUTH_SCOPE_SECURITY_GAPS`

AND `ZERO_UNRESOLVED_RUNTIME_DATA_STATE_REQUIRED_BY_CLAIM`

AND `ZERO_PROVEN_GOVERNANCE_DRIFT_LEFT_IN_SCOPE`

AND `ZERO_BROKEN_ORPHAN_STALE_REFERENCES`

AND `ZERO_MATERIAL_CLEANUP_RESIDUE`

AND `ZERO_MATERIAL_UNJUSTIFIED_COMPLEXITY`

AND `ZERO_UNVERIFIED_MATERIAL_CLAIMS`

AND `ZERO_REQUIRED_MISSING_OR_STALE_EVIDENCE`

AND `ZERO_SILENT_EXCLUSIONS`

AND `LATEST_REQUIRED_HEAD_RECONCILED`

AND `FINAL_NEGATIVE_SPACE_PASS`

AND `FINAL_ADVERSARIAL_REDIAGNOSIS_PASS`.

A missing required capability/evidence is never PASS.

## 31. EXECUTE_CLOSE required final report

Report only evidence actually obtained:

- repository/ref and starting/final observed HEAD;
- final candidate relation;
- roots actually treated vs verified-only roots;
- canonical owner/cutover changes;
- migrations/data work;
- affected consumers/surfaces;
- cleanup/removals;
- verification performed and proof limits;
- runtime/DB/native/provider evidence;
- live repository-platform evidence if materially relied upon;
- foreign-delta reconciliation;
- remaining true blocker/decision, if any;
- final state.

Never label self-review independent. Never call `CLOSED` from a plan/status edit.

## 32. AUDIT_PREPARE handoff declaration

`AUDIT_PREPARE COMPLETE`

`TARGET_SYSTEM_MUTATION: NONE`

`MATERIAL_DECISION_REQUIRED: NONE`

`PARALLEL_OLD_PLAN_RECORDS: RETIRE_IN_THIS_PLANNING_COMMIT`

`HIGHEST_ACTIONABLE_PROVEN_ROOT_FOR_EXECUTE_CLOSE: ROOT-05`

`READY_FOR_EXECUTION`

`PLAN_FILE: plans/diagnose-implementing/all-surfaces-services-canonical-execution-root-closure-20260818.md`
