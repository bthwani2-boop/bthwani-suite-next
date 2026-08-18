# AUDIT_PREPARE — All Surfaces / Services Root Closure — 2026-08-18

> Temporary diagnosis / accounting / execution-preparation record only. This file is **not** Product/System Truth and must never substitute for treatment in the real source/runtime. During `AUDIT_PREPARE` this file is the **only permitted write** for this task. No target-system mutation, cleanup, migration, governance mutation, or implementation is authorized by this phase.

## 0. Phase, repository and immutable audit baseline

- Repository: `bthwani2-boop/bthwani-suite-next`
- Branch: `b`
- Phase: `AUDIT_PREPARE`
- State: `AUDIT_PREPARE_ACTIVE — MATERIAL ROOTS OPEN — NO TARGET EXECUTION IN THIS PHASE`
- Audit authority entrypoint: `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`
- Audited repository HEAD: `749a7c54f9c1552284a659dd180ef647cdc271b5`
- Audited tree: `a208fafa1b325ee5a82101586363181edaea0005`
- HEAD commit: `captain: remove obsolete local readiness policy`
- Previous plan narrative that referred to `EXECUTE_CLOSE`, `0c03ebcbecc06c779281fd34b64eb973d382645b`, or an “uncommitted treatment” is **historical evidence only and is superseded for current-state claims**.
- `CURRENT CODE ≠ GOVERNANCE UPDATE AUTHORITY`.
- `UNCERTAINTY = NO GOVERNANCE WRITE`.
- `TARGET_SYSTEM_MUTATION = NONE` for this phase.
- No source, runtime, DB, contract, package, lockfile, app, service, migration, governance, or generated-artifact treatment may be performed while this record remains in `AUDIT_PREPARE`.

### Phase law

Audit proceeds as:

`AUDIT + INSPECT + DIAGNOSE + ANALYZE → HIGHEST PROVEN ROOT → CANONICAL TARGET → ROOT-CORRECT TREATMENT DESIGN → BLAST RADIUS → MIGRATION/CUTOVER/CLEANUP PLAN → VERIFY PLAN → RE-AUDIT/RE-RANK`

Execution is explicitly deferred. Build/test success, disappearance of an error, or a prior commit does not constitute closure.

---

## 1. Canonical owner matrix used by this audit

The current audit preserves the already-resolved separation of sovereign truth and rejects shared writable ownership:

1. **Identity**
   - actor identity, authentication, activation, roles/surfaces, sessions and identity lifecycle.

2. **Workforce**
   - provider professional profile, engagement, professional/readiness prerequisites, workforce work scopes/operational assignments and other Workforce-owned eligibility facts.
   - Workforce readiness may consume Identity lifecycle as a sovereign dependency, but must not manufacture DSH or WLT truth.

3. **DSH**
   - store/business object authorization and store access, including the currently proven canonical DSH store-object scope path through `dsh_store_actor_scopes` / `store.ActorCanAccessStore`.
   - store/visit/order/dispatch/fleet/presence/capacity/delivery operational context and state.
   - journey-level operational aggregation where a DSH journey needs facts from multiple sovereign owners.

4. **WLT**
   - wallet, ledger, balance, settlement, commission and financial eligibility/mutation truth.

5. **Surfaces / app runtimes**
   - consumers/composers only. They must not invent a local eligibility state or duplicate a domain decision.

### Mandatory separation invariant

A Workforce operational/work-scope fact must not become a second DSH store-object authorization table, and a DSH store-object scope must not be presented as Workforce professional/readiness truth. Cross-domain readiness is composed at the owning journey boundary, not copied into each owner.

---

## 2. Current exact-HEAD audit — readiness / ownership / package-boundary cone

This section records evidence inspected directly on `749a7c54f9c1552284a659dd180ef647cdc271b5`.

### 2.1 Workforce readiness implementation — direction corrected, closure not yet proven

Inspected:

- `core/workforce/backend/internal/workforce/readiness.go`
- `core/workforce/backend/internal/http/readiness_routes.go`
- `core/workforce/backend/internal/workforce/readiness_identity_policy_test.go`

Current implementation has materially improved ownership:

- Workforce evaluates Workforce-owned provider prerequisites and Identity lifecycle.
- DSH dispatch blockers and WLT financial blockers are no longer fabricated inside Workforce readiness.
- a sovereign dependency outage is represented as `ErrReadinessDependencyUnavailable` and exposed as HTTP `503 WORKFORCE_READINESS_UNAVAILABLE`, rather than converted into a normal business `BLOCKED` decision.

**Audit disposition:** implementation direction is canonical, but the contract and every consumer must still match it before this root can be considered cut over.

### 2.2 Workforce OpenAPI contract drift — PROVEN OPEN

Inspected:

- `core/workforce/contracts/workforce.openapi.yaml`

Current contract is stale relative to the implementation:

- `/workforce/readiness/{actorId}` does **not** declare the new `503` readiness-dependency-unavailable response.
- `ReadinessBlockerReason` still contains cross-domain/obsolete reasons including:
  - `NO_ACTIVE_ASSIGNMENT`
  - `SHIFT_INACTIVE`
  - `OUTSIDE_ACTIVE_AREA`
  - `FINANCIAL_ELIGIBILITY_BLOCKED`
  - `ELIGIBILITY_UNAVAILABLE`
- the implementation no longer owns the DSH/WLT meanings represented by those values.

**Finding:** `IMPLEMENTATION ↔ CONTRACT PARALLEL TRUTH`.

**Root-correct later treatment:** contract schema must be rebuilt from the sovereign Workforce semantics, response behavior aligned to implementation, generated/bound clients regenerated, and every consumer migrated before obsolete reasons are deleted.

### 2.3 DSH captain aggregate readiness — canonical journey owner is present

Inspected:

- `services/dsh/backend/internal/http/server.go`
- `services/dsh/backend/internal/http/captain_readiness_closure.go`

Current DSH route:

- `GET /dsh/captain/me/readiness`

Current aggregate composes:

1. Workforce activation/readiness dependency.
2. DSH dispatch profile/accreditation/suspension state.
3. WLT-backed financial eligibility snapshot/refresh.

Dependency failure is surfaced as `503 CAPTAIN_READINESS_UNAVAILABLE`; it is not converted to a normal “not eligible” business answer.

**Audit disposition:** this is the correct semantic owner for captain start-work readiness. The remaining work is cutover completeness, contracts, consumers, package graph, negative space and verification.

### 2.4 Captain frontend cutover — PARTIALLY IMPLEMENTED, HALF-CUTOVER STILL PROVEN

Inspected current source:

- `services/dsh/frontend/app-captain/captain-readiness.api.ts`
- `services/dsh/frontend/app-captain/index.ts`
- `services/dsh/package.json`
- `apps/app-captain/runtime/package.json`
- `apps/app-captain/runtime/src/App.tsx`
- `apps/app-captain/runtime/src/features/readiness/ReadinessGateScreen.tsx`
- deleted former `apps/app-captain/runtime/src/features/readiness/captain-readiness.policy.ts`
- `pnpm-lock.yaml`

Proven positive state:

- app-captain now consumes `@bthwani/dsh/app-captain` rather than directly importing the readiness implementation by filesystem path.
- the public DSH package exports `./app-captain`.
- captain readiness frontend calls `/dsh/captain/me/readiness`.
- the local captain readiness policy shadow was removed.
- an unavailable aggregate is not synthesized into a business blocker in `App.tsx`.

Proven incomplete state:

- `apps/app-captain/runtime/package.json` declares `@bthwani/dsh: workspace:*`.
- the corresponding `apps/app-captain/runtime` importer in `pnpm-lock.yaml` does **not** contain `@bthwani/dsh`.

**Finding:** deterministic clean-checkout dependency graph is stale. The cutover cannot be called complete while package manifest and lockfile disagree.

### 2.5 Field frontend readiness — PROVEN OPEN SHADOW/FALLBACK PATH

Inspected:

- `apps/app-field/runtime/src/App.tsx`
- `apps/app-field/runtime/package.json`
- `services/dsh/frontend/app-field/index.ts`
- `services/dsh/package.json`

Current Field runtime still:

- imports DSH app-field and shared Workforce/session modules by deep relative filesystem paths such as `../../../../services/dsh/...`.
- directly calls `fetchWorkforceReadiness(actorId)` from DSH shared Workforce client.
- locally validates returned identity/kind and, on mismatch, synthesizes a normal `BLOCKED` response with `ELIGIBILITY_UNAVAILABLE`.
- on request failure/outage, also synthesizes `BLOCKED + ELIGIBILITY_UNAVAILABLE`.
- uses the stale Workforce `ReadinessGate` model that still exposes the obsolete cross-domain blocker vocabulary.
- has no declared `@bthwani/dsh` dependency.
- cannot consume a package-level `@bthwani/dsh/app-field` boundary because `services/dsh/package.json` currently exports `./app-captain` but not `./app-field`, even though `services/dsh/frontend/app-field/index.ts` already exists.

**Findings:**

- `SILENT FAILURE → BUSINESS BLOCKED` semantic corruption.
- `DEEP FILESYSTEM COUPLING` across package boundary.
- `CONSUMER STILL BOUND TO STALE CONTRACT`.
- `PARTIAL MULTI-SURFACE CUTOVER` because Captain and Field follow different composition rules.

**Canonical target:** Field must consume an explicit stable public owner boundary. A dependency outage must stay an unavailable/degraded technical state, never become a fabricated business ineligibility. Any DSH-specific Field operational gate must be owned/composed in DSH; Workforce-only readiness remains Workforce-only.

### 2.6 Field backend authorization semantics — canonical implementation plus stale narrative

Inspected:

- `services/dsh/backend/internal/http/field_readiness_gate.go`
- `services/dsh/backend/internal/fieldreadiness/authz.go`
- `services/dsh/backend/internal/fieldreadiness/fieldreadiness.go`

Proven implementation:

- `fieldreadiness.AuthorizeStore` explicitly requires canonical DSH store access via `store.ActorCanAccessStore`.
- field visit operations continue to validate DSH store-object scope; active visit stale detection references `dsh_store_actor_scopes`.

Proven stale narrative:

- `field_readiness_gate.go` says store access resolves through “Workforce-backed authorization primitives”. That statement conflicts with the actual DSH authorization path and with the owner split.
- `enforceFieldReadinessGate` currently performs only `requireActor(..., "field")`; it is not itself a full readiness evaluator. The name/comment therefore overstate what the wrapper does.

**Finding:** misleading semantic naming/commentary can reintroduce ownership drift even though the active authorization function is currently canonical.

**Later treatment:** rename/flatten/remove the wrapper if it has no independent responsibility, or make its name/comment reflect its exact role; do not create a second readiness policy merely to justify the existing name.

---

## 3. Re-ranked root-cause landscape for AUDIT_PREPARE

Priority is based on highest proven systemic leverage, not easiest file fix.

### ROOT-A — P0 — Readiness semantic ownership still has contract + consumer parallel truth — OPEN

**Evidence cone:** Workforce implementation, Workforce OpenAPI, DSH Captain aggregate, Captain runtime, Field runtime.

**Highest proven root:** the source-level ownership correction was only partially propagated across contracts and consumers. Multiple layers still encode the former meaning of “readiness”.

**Canonical target:**

- Workforce = Workforce-owned readiness + explicit dependency-unavailable error.
- DSH journey aggregate = DSH operational composition when DSH + Workforce + WLT facts are needed.
- surfaces = consumers only; no locally invented blocker.
- generated contract/client vocabulary = identical to the sovereign owner.

**Required later cutover order:** owner implementation → owner contract → generated/bound clients → DSH journey aggregate contracts → public frontend boundary → Captain/Field consumers → negative-space deletion.

### ROOT-B — P0 — Package/public-boundary migration is not deterministic — OPEN

**Evidence:** Captain package manifest changed but lockfile did not; Field still uses deep relative imports and has no exported app-field package boundary.

**Canonical target:**

- every app runtime declares the workspace packages it consumes.
- lockfile is regenerated from manifests and exact workspace graph.
- `@bthwani/dsh/app-captain` and the justified equivalent Field boundary are explicit package exports.
- no app runtime reaches into `services/dsh` by filesystem traversal.
- Metro/TypeScript/Expo resolution is proven from a clean checkout, not inferred from an existing workspace.

### ROOT-C — P1 — Field outage handling fabricates business ineligibility — OPEN

**Evidence:** `apps/app-field/runtime/src/App.tsx` catches readiness failure and creates `BLOCKED/ELIGIBILITY_UNAVAILABLE`.

**Canonical target:** unavailability is a distinct technical state. It may fail closed for starting work, but it must remain semantically `UNAVAILABLE`, not claim the provider is business-ineligible.

### ROOT-D — P1 — Store authorization vs Workforce operational scope language is drifting — OPEN CLEANUP ROOT

**Evidence:** actual Field authorization uses DSH store-object scope, while router commentary claims Workforce-backed authorization.

**Canonical target:** one owner per fact; comments, names, contracts, tables and APIs must describe the same owner split. No misleading aliasing or dual-write path.

### ROOT-E — P1 — Prior large root treatments require exact-current-HEAD revalidation — OPEN AUDIT GATE

The previous version of this plan recorded substantial treatment for:

- parallel COD financial truth.
- Workforce↔Identity provisioning.
- mobile native capability ownership.
- silent ETA approximation fallback.
- derived contract/capability drift.
- exact-candidate evidence.
- governance disposition.

Those records are retained as **historical execution evidence**, but the old plan used earlier baselines and described an uncommitted working tree. Under FAIL-CLOSED they cannot be promoted automatically to current closure claims.

**Required AUDIT_PREPARE revalidation:** exact current `HEAD` must be inspected for the surviving writers/readers/contracts/data states/dependencies and negative space of each prior root. Any drift or regression becomes a current finding and is re-ranked by leverage.

---

## 4. Historical roots retained for current-head revalidation

### HIST-01 — COD financial single truth

Historical treatment claimed removal of active collect/remit financial paths, write fences for legacy custody semantics, contract regeneration and reconciliation evidence.

**Current phase disposition:** `REVALIDATION_REQUIRED`. Do not reintroduce a collect/remit liability. WLT remains sole financial truth; DSH may retain operational delivery actor evidence only where it is not a second financial liability.

### HIST-02 — Workforce ↔ Identity provisioning

Historical treatment claimed canonical Workforce→Identity provisioning and successful tests.

**Current phase disposition:** `REVALIDATION_REQUIRED`, including creation inputs, role/surface derivation, idempotency, existing-actor linkage, activation, stale provisioning-case APIs and contract/runtime equality.

### HIST-03 — Mobile native capability ownership

Historical treatment claimed runtime-owned typed adapters and successful Android exports, with Windows wrapper/iOS evidence gaps.

**Current phase disposition:** `REVALIDATION_REQUIRED`. The current package-boundary findings prove that mobile composition cleanup is not globally finished even if individual capability adapters were previously improved.

### HIST-04 — ETA fallback

Historical treatment claimed removal of distance-based ETA approximation and explicit unavailable behavior.

**Current phase disposition:** `REVALIDATION_REQUIRED`, including provider error/no-duration/recovery and all consumer rendering.

### HIST-05 — Derived contracts/capabilities and candidate evidence

Historical treatment claimed regeneration and guard success.

**Current phase disposition:** `REOPENED_BY_EVIDENCE` for at least Workforce readiness contract drift and Captain lockfile drift. A previous green contract/guard run does not cover later source changes.

---

## 5. Blast radius that must be included before EXECUTE_CLOSE

The current readiness/package-boundary roots affect at minimum:

- `core/workforce/backend/**`
- `core/workforce/contracts/**`
- Workforce generated clients/bindings and contract guards.
- `services/dsh/backend/internal/http/**` readiness composition.
- `services/dsh/backend/internal/fieldreadiness/**` authorization/readiness semantics.
- `services/dsh/contracts/**` and generated DSH API artifacts for Captain/Field readiness endpoints.
- `services/dsh/frontend/app-captain/**`
- `services/dsh/frontend/app-field/**`
- `services/dsh/frontend/shared/workforce/**`
- `services/dsh/frontend/shared/session/**` only where package exposure/composition is involved.
- `services/dsh/package.json` and TypeScript package graph.
- `apps/app-captain/runtime/**`
- `apps/app-field/runtime/**`
- `pnpm-lock.yaml`
- Metro/TypeScript/Expo workspace resolution and mobile source guards.
- store-scope DB/access path (`dsh_store_actor_scopes`) only as required to prove no duplicate authorization truth is introduced.
- Workforce operational assignment/work-scope persistence/contracts only as required to prove separation from DSH store-object authorization.
- `governance/**` impact analysis only; no governance write in this phase.

The blast radius remains open-ended: any consumer/dependency discovered by exact-ref inspection is added before execution.

---

## 6. Root-correct treatment design for later EXECUTE_CLOSE — NOT AUTHORIZED YET

This is treatment design only.

### Wave 1 — contracts and semantics at sovereign owners

1. Re-audit Workforce readiness implementation and contract together.
2. reduce Workforce blocker vocabulary to facts Workforce actually owns.
3. expose dependency-unavailable response in OpenAPI exactly as runtime behaves.
4. regenerate/bind clients and prove no consumer depends on deleted obsolete reasons.
5. audit DSH Captain readiness OpenAPI against `captain_readiness_closure.go` including `503 CAPTAIN_READINESS_UNAVAILABLE`.

### Wave 2 — stable package/composition boundaries

1. make the DSH Captain public package boundary complete and clean-checkout reproducible.
2. create/export only the minimum justified Field public boundary from the existing DSH Field owner; do not create a parallel wrapper stack.
3. move app-field imports from deep filesystem paths to package exports.
4. declare exact workspace dependencies in app package manifests.
5. regenerate `pnpm-lock.yaml`; no manual stale importer editing.
6. prove Metro/TypeScript/Expo resolution from a clean dependency graph.

### Wave 3 — Field fail-closed semantics without false truth

1. remove local synthesis of `BLOCKED + ELIGIBILITY_UNAVAILABLE`.
2. model loading / sovereign business decision / technical-unavailable distinctly.
3. if Field requires DSH journey-level readiness beyond Workforce readiness, expose one DSH-owned aggregate; otherwise consume Workforce-only readiness without adding DSH/WLT meanings.
4. preserve start-work fail-closed behavior while keeping the reason truthful.
5. remove obsolete local readiness types/policies after all consumers migrate.

### Wave 4 — authority cleanup / minimum necessary complexity

1. prove DSH store-object authorization writers/readers and Workforce work-scope/assignment writers/readers.
2. delete any duplicate/legacy mutation path that writes the same fact in both domains.
3. correct or remove `enforceFieldReadinessGate` if it is only a role-gate naming layer.
4. remove stale comments/names/aliases that imply a wrong owner.
5. remove dead imports/exports/files/folders generated by the cutover.

### Wave 5 — revalidate historical roots on the new exact candidate

Re-run deep evidence for COD, provisioning, native capability ownership, ETA, contracts/capabilities, and governance impact. Any discovered regression is treated as a root/finding, not deferred.

---

## 7. Verification matrix required before any future closure claim

### Semantic / contract

- Workforce readiness implementation equals OpenAPI schema and error model.
- DSH Captain readiness implementation equals DSH contract.
- Field/Captain surfaces render business blockers versus technical unavailability distinctly.
- no deleted blocker reason survives in generated clients, UI policies, tests or docs as an active canonical value.

### Dependency / package boundary

- package manifests and `pnpm-lock.yaml` agree.
- clean install/frozen lockfile succeeds.
- TypeScript resolution succeeds without deep `services/dsh` relative imports from app runtime.
- Metro/Expo app builds resolve the public package boundary.
- no app runtime depends on undeclared workspace modules.

### Authorization / ownership

- DSH store-object authorization remains single-owner and cannot be bypassed by role labels.
- Workforce operational work-scope/assignment truth does not become a second store-object authorization path.
- no dual writer exists for the same canonical fact.

### Runtime fail-closed

- Workforce dependency outage => 503/unavailable, never a fabricated business blocker.
- DSH Captain aggregate dependency outage => 503/unavailable.
- Captain surface => unavailable state on outage.
- Field surface => unavailable state on outage after future treatment.
- mismatch/corrupt response => rejected/unavailable, not converted to a false eligibility reason.

### Cleanup / negative space

Search exact candidate for:

- direct app-runtime `../../../../services/dsh` imports.
- direct Captain call to `/workforce/readiness/{actorId}`.
- obsolete `captain-readiness.policy` references.
- `ELIGIBILITY_UNAVAILABLE` as a business blocker after Workforce schema cleanup.
- obsolete cross-domain Workforce blockers.
- stale package imports/exports.
- duplicate readiness wrappers/policies.
- TODO/FIXME/HACK/workaround/fallback tied to the affected cone.
- misleading comments that state the wrong sovereign owner.

### Exact candidate

Final verification must bind to one exact candidate SHA after the last source/config/contract/lockfile write. If the branch moves, re-pin and reconcile before using any earlier evidence.

---

## 8. Governance impact and mutation gate

`governance/**` remains inside Impact Analysis but is not automatically trusted and is not writable in this phase.

Current disposition:

- `GOVERNANCE_WRITE = HOLD`.
- current code changes are not sufficient authority to rewrite governance.
- if exact source/runtime audit proves governance drift later, the proposed governance change must be traced to canonical Product/System truth and the proven root before any mutation.
- no approval metadata may be self-created merely to make a gate pass.

---

## 9. Decision gate

### Existing decisions sufficient for current audit

No new Product/Business/Semantic decision is required to classify the readiness/package-boundary findings above. The existing owner split is sufficient to determine the canonical direction.

### Decision-required policy

If later AUDIT_PREPARE work exposes a genuinely non-derivable Product/Business/Semantic/Architectural choice, execution remains prohibited and the issue must be recorded as:

`problem + required decision + options + recommendation/reason + impact/risk`

No technical convenience may silently resolve such a decision.

---

## 10. AUDIT_PREPARE continuation queue

Continue read-only audit in this order, re-ranking if a higher systemic root appears:

1. **Workforce readiness contract cone:** overlays/modules/generated clients/tests and every current consumer.
2. **DSH Captain readiness contract cone:** OpenAPI/generated client/operator readiness consumer and negative-space search.
3. **Field readiness cone:** app runtime, DSH field APIs, field visit/start-work operations, every readiness/authorization consumer.
4. **Package graph:** app-captain/app-field package manifests, lockfile importers, DSH exports, tsconfig/Metro/mobile guards.
5. **Assignment/scope authority:** all DSH store-object scope writers/readers versus Workforce work-scope/assignment writers/readers; prove no dual-writer/dual-authority.
6. **Historical ROOT revalidation:** COD → Workforce/Identity provisioning → native capability ownership → ETA → derived contracts/capabilities.
7. **Governance impact read-only pass.**
8. **Negative-space/adversarial pass** over all newly exposed roots.

### Current phase exit condition

Do **not** switch to `EXECUTE_CLOSE` until:

- current-head audit has covered every root above and its consumers/dependencies.
- all material `DECISION_REQUIRED` items are zero or resolved.
- canonical target and root-correct treatment are explicit for every open root.
- migration/cutover and cleanup order prevents half migration and parallel truth.
- verification matrix is sufficient to prove the exact candidate later.

Current status after this update:

`AUDIT_PREPARE_ACTIVE`

`TARGET_SYSTEM_WRITES_THIS_PHASE: 0`

`PLAN_RECORD_WRITE_ONLY: YES`

`READY_FOR_EXECUTION: NO — AUDIT CONTINUATION REQUIRED`
