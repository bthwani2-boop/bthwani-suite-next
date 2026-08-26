# BThwani Objectives Playbook
## Discovery, Selection, Decomposition, Declaration and Cross-Window Coordination

Status: ACTIVE_CANONICAL_ORCHESTRATOR_OWNER  
Owner: Objective discovery / decomposition / portable declaration / active-work collision selection  
Execution authority: `00-ORCHESTRATOR.md` through `04-VERIFY-REDIAGNOSE-CLOSE.md`  
Delivery authority: `governance/policies/delivery.md`

## 0. Purpose and authority boundary

This owner answers one question:

> **What is the next materially correct Closure Unit, at the right causal altitude and execution size, that can be declared clearly and executed safely against the current live state and all known concurrent work?**

It owns objective discovery, selection, decomposition, portable declaration and cross-window collision selection. It does **not** own Product/System truth, root-cause proof, mutation law, closure law, governance policy, repository status or evidence.

```text
OBJECTIVE = current priority / intended closure outcome
OBJECTIVE != AUTHORITY
OBJECTIVE != PROJECT TRUTH
OBJECTIVE != CLOSURE EVIDENCE
ACTIVE_WORKSET = coordination input
ACTIVE_WORKSET != PROJECT TRUTH
WORKTREE/EXECUTOR/MODEL != AUTHORITY
PLAN != AUTHORITY
```

Historical objective catalogs, prior prompts, old PR bodies, plans, examples and branch/SHA-specific text are discovery support only. Current truth is always re-resolved under the orchestrator.

## 1. Operating model

> **WIDE DISCOVERY; NARROW COMPLETE EXECUTION.**

Maintain a project-wide orientation so a narrow task cannot create a narrow worldview. Execute the smallest complete root-correct cone that can reach honest exact-candidate closure without exporting material obligations to another objective.

Do not optimize for the smallest diff, easiest file, first failing check, highest finding count, latest symptom, arbitrary catalog rank, arbitrary token/file budget or impressive rewrite.

Optimize for:

`highest proven systemic leverage + smallest complete canonical cutover + safe concurrency + shortest honest path to CLOSED`.

## 2. Objective levels

### 2.1 Project Frame

Project-wide orientation needed to understand relationships between Product/System meaning, actors, domains, surfaces, contracts, data, runtime, security, delivery and governance.

A broad Project Frame never authorizes repository-wide mutation by itself.

### 2.2 Macro Objective

A broad outcome family that may require multiple windows, for example Product/System truth, architecture/ownership, security/trust, runtime/configuration or release/promotion.

A Macro Objective is orientation, not automatically one execution window.

### 2.3 Closure Unit

The preferred unit for one execution window:

> **the smallest complete root or causally cohesive root cluster that can be treated End-to-End and reach exact-candidate closure without half migration, dual authority, deferred cleanup, deferred governance reconciliation or knowingly missing verification.**

A Closure Unit may span many files, packages, domains and surfaces when one causal root requires them.

### 2.4 Treatment Steps

Rewrite, move, rename, split, merge, migrate, backfill, regenerate, cut over, delete, harden, verify and reconcile governance are treatment actions under `03`; they are not separate objectives when required by one root.

## 3. Provider-neutral ACTIVE_WORKSET coordination

Concurrent execution may occur across ChatGPT, Claude, Manus, Codex, other agents, IDEs or human-managed worktrees. Provider identity has no semantic authority.

When concurrent execution is known or declared, the complete **human-known** active-work snapshot is REQUIRED before a new independent concurrent mutation may be selected or started:

```text
ACTIVE_WORKSET:
- ID: <portable coordination id>
  OBJECTIVE: <one concise self-contained objective sentence>
  EXECUTOR: <optional provider/agent/human label>
  WORKSPACE: <optional worktree/branch/ref>
  STARTING_SHA: <optional immutable source identity>
  STATUS: ACTIVE
```

When no concurrent work is known, use `ACTIVE_WORKSET: NONE` conceptually; do not manufacture a registry.

The requirement is deliberately limited to work the human/coordinator actually knows is active. It does not demand impossible discovery of hidden external sessions. However, if concurrent work is known to exist and the available snapshot is materially incomplete, the coordinator MUST NOT claim a new mutation is `PARALLEL_SAFE` against the missing work.

In that case:

```text
READ-ONLY AUDIT / ROOT DISCOVERY -> MAY CONTINUE
NEW PARALLEL MUTATION -> NOT AUTHORIZED AS PARALLEL_SAFE
COLLISION STATUS -> UNKNOWN_COLLISION for the missing coordination cone
IF HUMAN REQUESTS PARALLEL EXECUTION -> HUMAN_ACTION_REQUIRED for the missing known active-objective snapshot
```

Objective IDs are ephemeral coordination labels only. Do not create a repository registry merely to persist them.

The coordinator MUST treat the human-declared `ACTIVE_WORKSET` as a collision constraint and then revalidate all visible repository/ref evidence. An active objective may contain work not yet visible on the target branch; absence from the current tree is therefore not proof of independence.

For every active objective, reconstruct enough of its expected exclusion cone as materially possible:

`root/root-family | canonical authority | likely Source-of-Fix | domains/surfaces | writers/readers/consumers | expected write cone | contracts | data/schema/migrations | runtime/config | governance impact | cutover/integration ordering | verification dependencies`.

Do not require the human to provide these derived fields when they can be inferred from the objective and live evidence.

## 4. Live-state selection protocol

Before selecting a Closure Unit:

1. **Resolve live target identity** — repository, exact branch/ref or PR, current HEAD, base/trunk, PR identity and visible concurrent delta when material.
2. **Resolve delivery position** — use live `governance/policies/delivery.md`; environment/delivery state sharpens the claim but never creates alternate Product Truth.
3. **Orient at mandatory diagnostic altitude** — apply `02`: `Product/Operational Outcome -> Actor/Authority/Responsibility -> Capability/Journey -> State/Transition/Invariant/Handoff -> Canonical Ownership -> Contract/Data -> Service/Surface -> Runtime/Implementation/Test/Tool`.
4. **Evaluate materially applicable focus families** — starting focus is never a closure ceiling.
5. **Search positive and negative space** — classify materially relevant reality as `WRONG | MISSING | INCOMPLETE | CONFLICTING | DUPLICATED | MISOWNED | MISPLACED | OBSOLETE | UNPROVEN`.
6. **Build the Root Graph** — cluster symptoms under causal parents; never create one objective per tool finding/file/screen.
7. **Rank roots by the current `02` leverage law** — upstream depth, blocking power, canonical importance, blast radius, user/operational/security/data/finance risk, recurrence, structural multiplier, cosmetic impact.
8. **Prove Source-of-Fix frontier** — enough actual Source-of-Defect, required Source-of-Fix, owner/write path, affected consumers, migration/cutover, obsolete implementation and proof must be known to execute safely.
9. **Apply the Window-Fit Gate** — split only causally independent roots; keep together what one canonical cutover requires.
10. **Apply ACTIVE_WORKSET collision analysis** — candidate must be safe against **every** active objective, not merely the most recent one. When known concurrency exists, §3 must be satisfied first.
11. **Select the highest proven executable parallel-safe root** — if the highest root collides, do not distort it for concurrency; classify it and select the next highest genuinely parallel-safe root.
12. **Declare the selected Closure Unit before mutation** under §5.
13. **Execute under `00`–`04`** without waiting for confirmation unless a legitimate human decision/authority/safety stop exists or the human asked only for objective extraction.
14. **After closure** — `RE-RESOLVE LIVE TRUTH -> RE-DIAGNOSE AFFECTED PROJECT FRAME -> INVALIDATE STALE ROOTS -> RE-RANK -> REFILL SAFE CAPACITY`.

A previous queue is a hypothesis, never a schedule authority.

## 5. Mandatory pre-execution objective declaration

No material mutation for a newly selected Closure Unit begins before the coordinator emits one concise, self-contained, copyable objective sentence.

This is a coordination checkpoint, **not** an approval gate. If the human already authorized execution, declare and continue immediately.

Minimum declaration:

```text
SELECTED CLOSURE OBJECTIVE

OBJECTIVE_ID: <ephemeral id when useful>
OBJECTIVE: <one concise portable sentence>
WHY_SELECTED: <brief root-leverage reason>
ACTIVE_WORKSET_CHECK:
  <active-id> -> <collision disposition>
OVERALL_PARALLEL_STATUS: PARALLEL_SAFE
PRIMARY_ROOT: <brief>
PRIMARY_AUTHORITY_OR_SOURCE_OF_FIX: <brief if proven>
EXPECTED_CLOSURE_CONE: <brief>
EXECUTION: READY
```

The `OBJECTIVE` sentence must be sufficient to paste into another provider/session without relying on hidden chat history.

The declaration fixes the intended root/closure outcome; it does not become a checklist ceiling. Descendant/exposed findings causally tied to the root remain inside the same closure. Independent roots discovered during execution are candidates for re-ranking unless a higher root invalidates the current treatment and triggers preemption under `02`/`04`.

When the human requests **selection only**, emit the declaration and stop without mutation. When execution is authorized, emit it and proceed in the same invocation.

## 6. Window-Fit Gate

A strong one-window Closure Unit normally has:

- one primary root or tightly coupled root cluster;
- sufficiently defined Canonical Target;
- sufficiently proven Source-of-Fix;
- known authoritative owner/write path;
- bounded material writers/readers/consumers;
- migration/cutover completable without exporting dual authority;
- related deletion/finishing completable in the same closure;
- materially required governance reconciliation completable in the same closure;
- obtainable exact-candidate proof;
- no unresolved higher semantic decision capable of invalidating treatment;
- no independent root bundled only for comprehensiveness.

> **Split by causal independence, never by arbitrary file count, line count, language, frontend/backend boundary, token count, model context or perceived visual size.**

Do not split when pieces share the same canonical authority, one required migration/cutover, one state-machine transition, one persisted truth, one writer/reader migration or evidence dependency that prevents honest closure of the first half.

If one indivisible root is large, preserve root correctness rather than manufacture a partial objective.

## 7. Objective discovery families

These are discovery axes, not execution order. Any family may yield the highest root.

1. **Product/System/Operational Semantics + UX** — outcomes, actors, responsibilities, journeys, decisions, states, invariants, handoffs, success/failure/recovery/readback, missing semantics.
2. **Security/Authorization/Trust/Financial Safety** — identity, sessions, object scope, operator/delegation context, service trust, privileged actions, secrets, replay, financial mutations.
3. **Architecture/Ownership/Dependency Graph** — canonical owners, boundaries, dependency direction, shared ownership, cycles, deep/internal bypasses, package/export truth, unjustified abstraction.
4. **Contracts/APIs/Events/Generated Bindings** — contract authority, runtime alignment, generated provenance, compatibility, shadow endpoints, consumer drift.
5. **Data/Database/Migration/Reconciliation** — ownership, writers/readers, schemas, constraints, transactions, idempotency/concurrency, migration/backfill, projections/caches, historical repair.
6. **Runtime/Infrastructure/Configuration/Observability** — startup, topology, service dependencies, environment/config authority, secrets, containers, providers, readiness, jobs/queues, failure/recovery.
7. **UI/Design System/Accessibility/Rendering** — presentation implementation against proven Product/UX semantics, state binding, responsive/RTL/accessibility/rendered evidence.
8. **Verification/Tests/Invariants/Evidence** — evidence able to falsify material claims across positive/negative, contracts, DB, runtime, security, journey, concurrency and recovery.
9. **CI/Quality/Security Analysis/Review Control Paths** — workflow authority, exact-candidate identity, event ownership, permissions, analyzer/review provenance, duplicate assurance paths and cost.
10. **Reliability/Failure/Concurrency/Recovery** — retry, timeout, unknown results, races, ordering, restart, compensation, reconciliation and recoverability.
11. **Performance/Scalability/Resource Efficiency** — query plans, N+1, payload/pagination, pools, CPU/memory, backpressure, rendering, assets/bundles, build/test control-path cost.
12. **Privacy/Data Lifecycle/Backup/Restore/DR** — collection, access, minimization, retention, deletion, logs/evidence exposure, backups, restore proof and recovery objectives.
13. **Supply Chain/Build/Artifact Provenance** — locked dependencies/actions, generated outputs, build inputs, artifact identity, reproducibility and attestations where governed.
14. **Release/Deployment/Promotion/Rollback/Stores** — source-to-artifact lineage, staging, migrations, readiness, rollout, rollback/forward-fix, store distribution.
15. **Developer Toolchain/Local Feedback Loop** — canonical tools, clean install/startup, device/mobile transport, bootstrap/reset, generation, hidden machine prerequisites.
16. **External Providers/Boundary Integrations** — provider ownership, credentials, callbacks/webhooks, timeout/retry/idempotency, quotas, reconciliation and domain leakage.
17. **Governance/Durable Project Memory** — governance impact is always assessed; durable truth is reconciled only after underlying truth is proven under the governance write gate.
18. **Structural Finishing/Repository Hygiene** — normally a closure obligation, independent only when structure itself is a material root capable of causing misownership, wrong future writes or operational/developer harm.

## 8. Delivery-stage selection map

Use the current delivery position as an evidence/risk lens:

| Position | Common objective roots worth testing |
| --- | --- |
| Requirement / Change Intent | Product outcome, actors/authority, missing decisions, acceptance semantics, blast radius |
| Local Development | root-correct implementation, architecture, contracts, data, security, UI, providers, cleanup |
| Local Verification | clean-state reproducibility, invariants, failure paths, migration/runtime/journey proof |
| Remote CI / Security / Quality | independent exact-candidate analysis, trust, execution effectiveness, finding lifecycle |
| PR / Review | candidate identity, consumer completeness, semantic/security/architecture review, stale evidence |
| Exact Candidate Closure | affected-cone proof, negative space, no half cutover or residue |
| Protected Integration | base movement, merge-candidate integrity, integration conflicts, post-merge invariants |
| Release Build / Provenance | reproducibility, immutable artifact identity, supply-chain provenance, environment inputs |
| Staging / Pre-Production | production-relevant runtime, providers, migrations, journeys, failure/recovery, observability |
| Release Readiness | unresolved risk, security/privacy/finance, rollback/forward-fix, capacity/operations |
| Production Deployment | approved lineage, config/secrets, migration/deploy ordering, protected operations |
| Post-Deployment Verification | production health, journey/readback, reconciliation, regressions, observability |
| Store Release / Rollout | production binary qualification, signing/entitlements, staged rollout, store policy |
| Post-Release Observation | SLO/user impact, latent failure, incident signals, reconciliation and durable lessons |

Exact promotion law remains owned by `delivery.md`.

## 9. Material-harm overlay

Catastrophic harm is a ranking overlay after semantic/root discovery, not the first diagnostic altitude.

Elevate proven roots capable of unauthorized privileged action, financial corruption/loss, durable data loss/corruption, privacy/credential exposure, irreversible migration damage, false success that drives harmful action, unsafe production startup/deployment, unrecoverable material journey state or promotion of a different artifact from the one qualified.

A catastrophic symptom still yields to a proven higher causal parent when the parent is the real Source-of-Defect.

## 10. Collision dispositions

Compare every candidate against every active objective. Use:

```text
PARALLEL_SAFE
DEPENDENT
OVERLAPPING_AUTHORITY
OVERLAPPING_WRITE_SET
SHARED_CUTOVER
EVIDENCE_DEPENDENT
DIRECT_CONFLICT
UNKNOWN_COLLISION
```

Only `PARALLEL_SAFE` is sufficient for independent concurrent mutation.

`UNKNOWN_COLLISION` means serialize mutation until independence is proven; it is not permission to guess.

A candidate colliding with even one active objective is not parallel-safe overall.

Do not use separate worktrees as proof of semantic independence. Filesystem separation prevents some mechanical conflicts; it does not prevent two agents from redefining the same authority or producing incompatible cutovers.

## 11. Governance impact in objective synthesis

Every selected objective assesses whether treatment may alter durable Product/System meaning, ownership, boundaries, policy or delivery semantics.

Do not create governance because a task happened. Do not leave materially touched governance stale when the completed root proves it wrong, conflicting, incomplete or durably missing. Detailed mutation rules remain owned by `focus/governance-product-design.md`.

## 12. Objective synthesis grammar

A strong portable objective contains only what is unique to the selected closure:

1. material outcome;
2. selected root/root family;
3. target context with mandatory live re-resolution;
4. canonical authority expectation if already proven;
5. affected-cone intent including all causally required consumers;
6. delivery-stage relevance only when material;
7. explicit non-overlap with active independent work when relevant;
8. inheritance of `00`–`04` for diagnosis, execution, cleanup, verification and closure.

Avoid copying generic execution/security/cleanup/verification law into every objective.

### Portable objective template

```text
OBJECTIVE: On the current live <target>, close <selected root/outcome> from its proven canonical
owner/Source-of-Fix across the complete causally affected cone, including every required consumer,
contract, data, runtime, surface and governance consequence, without colliding with <ACTIVE_WORKSET>,
and reach exact-candidate closure under the current BThwani orchestrator with no half cutover,
parallel authority or root-related residue.
```

## 13. Selection output contract

When asked to select/recommend the next objective, return:

```text
LIVE_TARGET
DELIVERY_POSITION
MACRO_FAMILY
SELECTED_CLOSURE_UNIT
ROOT_LEVERAGE_REASON
SOURCE_OF_FIX_STATUS
ACTIVE_WORKSET_COLLISION_MATRIX
OVERALL_PARALLEL_STATUS
SESSION_FIT = HIGH | MEDIUM | LOW
OBJECTIVE_TEXT
```

`SESSION_FIT` is a qualitative complexity judgment, not a time/token promise.

When the human requests only the objective sentence, return only `OBJECTIVE_TEXT`.

## 14. Fast invocation patterns

### Select only

```text
Use the canonical BThwani orchestrator including `05-OBJECTIVES-PLAYBOOK.md`.
Re-resolve the live target, ingest the complete human-declared ACTIVE_WORKSET, audit deeply enough
to rebuild/rerank the material Root Graph, select the highest executable Session-Sized Closure Unit
that is PARALLEL_SAFE against every active objective, and emit its portable objective declaration.
Do not mutate.
```

### Select and execute

```text
Use the canonical BThwani orchestrator including `05-OBJECTIVES-PLAYBOOK.md`.
Re-resolve the live target and ACTIVE_WORKSET, audit/model/rank roots, select the highest executable
parallel-safe Session-Sized Closure Unit, emit the portable objective declaration before mutation,
then immediately execute it through exact-candidate closure under `00`–`04` unless a legitimate stop exists.
```

### Continue after another agent finishes

```text
Re-resolve live truth, remove only genuinely finished objectives from ACTIVE_WORKSET, reconcile any
visible integrated delta, invalidate stale root assumptions, rerank and refill the highest safe closure capacity.
```

## 15. Anti-patterns

Do not select:

- `make CI green`, `fix these files`, `remove warnings`, `increase coverage` as outcomes;
- repository cleanup as a parking lot for debt that belongs to earlier roots;
- rewrite-everything mega objectives;
- one objective per tool finding/file/screen;
- arbitrary frontend/backend/language partitions of one root;
- partial objectives that defer rename/import/delete/migration/verification obligations of one cutover;
- a historically ranked catalog item without live proof;
- a colliding objective merely because another worktree exists;
- a lower-value root while a higher parallel-safe root is already proven executable.

## 16. Final selection principle

> **Do not ask which catalog item comes next. Ask: what is the highest materially proven way the current system can still be wrong, what is its highest causal root, and what is the smallest complete root-correct Closure Unit that can be closed now without colliding with active work or transferring its obligations elsewhere?**

That is the objective to declare and, when authorized, execute immediately.