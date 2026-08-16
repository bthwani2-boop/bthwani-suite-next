# DIAGNOSIS — BTHWANI SYSTEM-WIDE ROOT LANDSCAPE

Status: `PREPARE / EVIDENCE-BOUND`
Repository: `bthwani2-boop/bthwani-suite-next`
Branch: `b`
Evidence HEAD before documentation writes: `7f053af499891b6bb6ae9281c658f7eeedd35eb7`

## 0. Diagnosis law

This file records proven structure, systemic root hypotheses backed by current repository evidence, and explicit `MUST_PROVE` obligations. It does **not** convert unexecuted checks into PASS.

A technical smell is not execution authority until its operational parent and highest provable root are known. A plan/doc is not evidence that code/runtime is correct. A passing leaf test is not closure of its parent journey.

## 1. Current repository shape that materially affects closure

### Core authorities

Current branch contains explicit core roots for:

- `core/identity`
- `core/workforce`
- `core/platform-control`
- `core/providers`

Root tooling composes OpenAPI and generated clients for these roots. Therefore identity, workforce, operator configuration and provider semantics cannot be treated as incidental helpers of DSH/WLT; they are first-class authority boundaries.

### Services

Current `services/**` includes at least:

- `dsh`
- `wlt`
- `fin`
- `pymt`
- `order`
- `wallet`
- `ledger`
- `stl`
- `ops`
- `mkt`
- `support`

Any apparent older service that remains reachable, imported, deployed, migrated or queried is part of the blast radius until proven retired.

### Active surfaces/hosts

Root scripts explicitly launch:

- `apps/app-client/runtime`
- `apps/app-partner/runtime`
- `apps/app-captain/runtime`
- `apps/app-field/runtime`
- `apps/control-panel/runtime`

The repository also contains other app roots. Their status must be classified `ACTIVE | HOST_ONLY | LEGACY_REACHABLE | DEAD_PROVEN | OUT_OF_SCOPE_WITH_PROOF`; directory naming alone is insufficient.

### Contract/runtime/tooling

The root package exposes:

- canonical contract composition and generated client commands;
- service/database/runtime migration and smoke commands;
- boundary, contract drift, generated-client provenance, migration manifest, API/binding and runtime-config guards;
- Graphify/Nx diagnostics;
- security/CodeQL/Sonar/observability diagnostics.

This is evidence that the intended platform already recognizes cross-layer governance. The defect class is therefore not “missing tools” in general; it is whether all live paths are actually governed by one consistent authority model and whether the guards prove the complete set rather than a subset.

## 2. Attached blueprint diagnosis

### Strong parts to adopt

The blueprint correctly demands:

1. explicit actors, authorities, journeys, states, transitions and invariants;
2. a single declared source of truth rather than infer-by-convention behavior;
3. restart-safe authoritative state and horizontally safe/idempotent writers/readers;
4. explicit semantics for retries, callbacks, duplicates, restarts and concurrency;
5. explicit provider degraded/failure behavior;
6. authenticated/authorized internal/control-plane operations;
7. fail-closed runtime configuration;
8. a complete traceability chain from business flow through surface/API/domain/data/integration/verification;
9. a Decision Registry and Invariants Registry;
10. Negative Architecture prohibiting parallel truth, fake success, silent fallback, hidden workarounds and duplicated policy;
11. canonical ubiquitous language to prevent cross-surface semantic drift.

### Parts that must be refined

- The human blueprint must **not** own machine runtime/product truth. Product rules that can be machine-enforced belong in `governance/product/contracts/**` or the canonical runtime/domain owner.
- “One owner” means one authority for a fact/mutation, not one monolith for every concern. Read models/projections may exist if their source/version/staleness semantics are explicit and they cannot mutate authority.
- “No fallback” means no silent/authority-bypassing fallback. Explicit degraded behavior may be correct when it fails safely and is part of the product contract.
- Policy values must be separated into hard invariants, versioned policy, runtime config and operator-configurable values. Do not hardcode mutable product policy into the blueprint.
- The blueprint’s generation baseline is older than the current evidence HEAD, so every code/path claim from it is `MUST_PROVE` until reconciled.

### Parts rejected as authority

- Any prose that attempts to override current canonical Product Truth without an explicit user decision.
- Any generated path inventory treated as current merely because it existed at blueprint generation.
- Any “complete/ready/closed” implication without same-candidate runtime evidence.

## 3. Root-cause graph

### SYS-RC-00 — System meaning-to-runtime closure is not yet proven

**Symptom:** multiple strong governance/runtime artifacts exist, but there is no current same-SHA proof that every active capability/journey follows one complete authority chain.

**Root:** no final repository-wide traceability/evidence closure has yet been demonstrated for the current branch candidate.

**Blast radius:** every service/surface because lower roots can hide under local PASS results.

**Required closure:** one complete operational inventory + traceability matrix + root graph + same-candidate verification bundle, with every active item classified.

---

### SYS-RC-01 — Authority and writer ownership fragmentation

**Evidence direction:** the repository includes both modern `core/**`/DSH/WLT authority roots and multiple finance/order/wallet/ledger-style service roots. Existing finance diagnosis already proved overlapping financial/order responsibilities and direct dependency patterns. This does not make every older root wrong, but it makes writer ownership a mandatory proof target.

**Findings to prove/close:**

- every authoritative state field/table/topic must name one writer authority;
- every mutation endpoint/worker/callback must map to that authority;
- read models must carry source/version/freshness semantics when materially stale;
- no UI/shared consumer may become an alternate writer through direct transport/storage;
- no service-local lifecycle may shadow a canonical lifecycle.

**Closure test:** writer inventory is complete and duplicates are either removed or proved non-authoritative projections.

---

### SYS-RC-02 — Journey/state semantics are not uniformly represented as one graph

**Risk:** state meaning can drift among frontend labels, OpenAPI enums, backend states, DB values, event states and operator screens.

**Must prove for every material journey:**

`actor -> entry condition -> command -> validation/authority read -> legal transition -> authoritative write -> event/handoff -> downstream state -> success/failure/recovery -> terminal outcome`.

High-risk journey families:

- identity activation/session/recovery;
- workforce creation/readiness/suspension/scopes;
- partner onboarding/store publication/catalog/serviceability;
- customer discovery/cart/checkout/order lifecycle;
- payment/wallet funding/financial allocation/refund/settlement;
- dispatch/assignment/accept/reassign/delivery/COD custody;
- support/incident/escalation/recovery;
- control-panel approval/change-set/audit;
- provider callbacks/degraded/reconciliation;
- notifications/jobs/outbox and delayed effects.

---

### SYS-RC-03 — Contract/API/generated-client/binding drift

**Evidence:** root scripts contain explicit OpenAPI composition/generation for identity/workforce/platform-control/providers/DSH/WLT and guards for contract drift, generated-client provenance and binding. Presence of these mechanisms is positive, but closure requires proving all active paths use them.

**Failure patterns to eliminate:**

- raw/manual DTO duplication that diverges from canonical contract;
- direct fetch/axios/process-env URL construction in UI surfaces;
- business/error/state mapping invented per screen;
- endpoint exists but no client binding or no UI state coverage;
- UI exists but backend/API/database chain is missing;
- generated client is stale or bypassed;
- event schema version is implicit.

---

### SYS-RC-04 — Persistence/migration/source-lineage fragmentation

**Must prove:**

- authoritative table/column owner and legal writer;
- constraints for invariants that belong in persistence;
- fresh install and every supported upgrade path;
- forward migration/backfill/cutover semantics;
- no old column/table remains authoritative after cutover;
- seeds are clearly dev/test and cannot masquerade as live truth;
- projections/read models reconcile and can be rebuilt where required;
- deletion/retention/privacy semantics are explicit.

A migration compiling is insufficient if old writers/readers survive.

---

### SYS-RC-05 — Distributed failure/idempotency/reconciliation semantics need complete proof

Every external or cross-process mutation must answer:

- What is the idempotency key and scope?
- What happens on duplicate command/callback?
- What happens after write-before-response timeout?
- What happens on process restart?
- What happens if messages reorder?
- What happens if dependency is unavailable?
- Which state is `pending/unknown/retryable/failed/reconciled`?
- Which component owns reconciliation?
- How is double-post/double-fulfillment prevented?

Financial and order/provider paths are P0 because silent divergence is materially harmful.

---

### SYS-RC-06 — Trust boundaries must be unified and adversarially proven

Coverage includes:

- authentication/session validity;
- authorization/RBAC;
- actor, tenant, partner, store and scope isolation;
- IDOR protection;
- service-to-service auth and identity propagation;
- privileged financial/state mutations;
- operator approvals/maker-checker where policy requires it;
- step-up auth for sensitive operations where required;
- audit actor/source/correlation provenance;
- sensitive-data minimization/redaction;
- secrets and provider credentials;
- production rejection of debug/test identity shortcuts.

The execution phase must use the Codex Security deep repository scan when available, then centralized validation + attack-path analysis; targeted security tests remain required even if the scanner returns no candidates.

---

### SYS-RC-07 — Runtime/config/deployment authority drift

**Evidence:** root scripts distinguish DSH, Identity, WLT, Workforce and full-runtime profiles and expose runtime-config guards. This means runtime wiring is part of governed behavior.

**Must prove:**

- canonical port/service-address registry;
- startup fails on invalid/ambiguous critical config;
- no hidden localhost/legacy URL fallback in production paths;
- readiness means dependencies needed for claimed functionality are usable;
- migrations/bootstrap are deterministic and bounded;
- environment/profile differences do not change product authority silently;
- CI tests the same required contracts/guards as local closure;
- deploy/rollback preserves schema and event compatibility within the supported window.

---

### SYS-RC-08 — Observability, audit and explainability need end-to-end traceability

For material transitions, prove correlation/trace identity, actor provenance, source version, idempotency identity and enough structured audit to explain “why is the system in this state?”. Financial reconciliation, dispatch decisions, operator approvals and security denials are priority paths.

Observability must not log secrets or sensitive raw data merely to improve diagnosis.

---

### SYS-RC-09 — Legacy/duplicate/fallback/dead-code residue

Potential residue is not deleted by pattern matching alone. Each candidate must have:

`path/symbol -> current references -> runtime reachability -> authority role -> replacement -> migration status -> delete/keep decision -> verification`.

Delete only after replacement/cutover proof. Keep only when there is a current justified owner and consumer. Compatibility paths require explicit expiry/removal criteria; indefinite compatibility is an open architecture defect.

---

### SYS-RC-10 — Verification/release proof is fragmented until same-candidate closure

Required hierarchy:

1. targeted static/unit/contract tests for root fix;
2. DB migration/invariant proof where touched;
3. integration/failure/idempotency/security negatives;
4. surface binding and UI state proof;
5. runtime smoke and critical E2E journeys;
6. global governing guards;
7. CodeRabbit review of the resulting committed/uncommitted diff when available;
8. Deep Codex Security scan for repository-wide security closure when security closure is claimed;
9. cleanup/zero-residue scan;
10. re-pin HEAD and adversarial re-diagnosis.

No evidence from an older SHA closes a newer candidate automatically.

## 4. Finance subgraph — retained, not discarded

The previous package diagnosed finance in depth. Those findings remain active children unless later evidence closes/supersedes them:

- ambiguous distinction among execution order, control order and economic/financial order;
- fragmented financial method/provider/instrument/rail semantics;
- fragmented payment/order/financial lifecycle ownership among WLT/PYMT/ORDER/FIN and adapters;
- absence or incompleteness of one canonical financial intent/checkout allocation model across all consumers;
- cyclic/direct legacy dependencies and service-local adapters that can preserve parallel truth;
- local seed/fake payment/order state and service-local read models that must be classified as test-only, projection or defect;
- generated/client/surface consumers that must converge on the canonical model.

The current head changes `services/wlt/backend/internal/reference/payment_session.go` so checkout rejects missing method and rejects `official_wallet` as checkout tender while still allowing it in a non-checkout funding context. Correct interpretation: **official wallet is a funding rail, not a fourth checkout method**. This commit closes one semantic leaf only; it does not prove all callers/contracts/UI/data/legacy paths migrated.

## 5. Global finding taxonomy for execution

Every discovered item gets exactly one primary classification plus root parent:

- `MISSING_PRODUCT_TRUTH`
- `AUTHORITY_CONFLICT`
- `DUPLICATED_TRUTH`
- `WRONG_OWNER`
- `MISSING_STATE_MACHINE`
- `ILLEGAL_OR_UNPROVEN_TRANSITION`
- `MISSING_API_CONTRACT`
- `CONTRACT_DRIFT`
- `MISSING_GENERATED_CLIENT`
- `DIRECT_API_IN_SURFACE`
- `BUSINESS_LOGIC_IN_SURFACE`
- `MISSING_BINDING`
- `UNBOUND_UI_ACTION`
- `MISSING_PERMISSION`
- `TRUST_BOUNDARY_GAP`
- `MISSING_AUDIT`
- `MISSING_DATABASE_TRUTH`
- `STALE_MIGRATION`
- `PROJECTION_DRIFT`
- `IDEMPOTENCY_GAP`
- `RECONCILIATION_GAP`
- `PROVIDER_FAILURE_GAP`
- `RUNTIME_CONFIG_GAP`
- `OBSERVABILITY_GAP`
- `TEST_GAP`
- `SECURITY_GAP`
- `LEGACY_REACHABLE`
- `DEAD_CODE_PROVEN`
- `WORKAROUND_OR_FALLBACK`
- `CLEANUP_REQUIRED`
- `BLOCKED_EXTERNAL`
- `DECISION_REQUIRED`

No `UNKNOWN` item may disappear from the ledger; unresolved ownership itself is a finding.

## 6. Priority frontier

Execution priority is graph-driven, not file-count-driven:

1. `SYS-RC-00/01/02`: establish product/authority/journey truth for the current root being executed;
2. `SYS-RC-03/04`: align contract, binding and persistence to that truth;
3. `SYS-RC-05/06`: failure semantics and trust boundaries before declaring real-world safety;
4. `SYS-RC-07/08`: runtime and explainability;
5. `SYS-RC-09`: destructive cleanup only after canonical cutover proof;
6. `SYS-RC-10`: same-candidate final verification and adversarial re-diagnosis.

Within a root, immediately fix the highest proven executable cause instead of expanding diagnosis sideways without a closure need.

## 7. Decision status

No new product decision is being guessed in this document. Any unresolved product rule discovered during execution becomes `DECISION_REQUIRED` only after repository/Product Truth evidence cannot resolve it. Each such question must include options, recommendation, reason and blast radius.

## 8. Diagnosis verdict

The platform is **not eligible for a “100%/FINAL/CLOSED” claim in this PREPARE invocation**. The package now contains a system-wide root model and execution obligations. Runtime/code closure starts only under an execution mode and finishes only under the same-candidate closure law.
