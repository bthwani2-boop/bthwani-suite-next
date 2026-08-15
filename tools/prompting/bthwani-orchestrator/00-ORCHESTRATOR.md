# Bthwani Orchestrator — Final Core

BTHWANI_ORCHESTRATOR_SCHEMA: 5
CANONICAL_SURFACE: 4_FILES
PACKAGE_MODEL: ONE_TASK_ONE_PACKAGE
CLI_MODEL: ONE_TOOL_THREE_COMMANDS
STATE_MODEL: EVIDENCE_DERIVED
PRIORITY_POLICY: SYSTEMIC_LEVERAGE
ACCOUNTING_POLICY: ZERO_SILENT_MATERIAL_ELEMENT
PREPARE_POLICY: PREPARED_NOT_CLOSED
WRITE_POLICY: ISOLATED_TASK_BRANCH
INTEGRATION_POLICY: ONE_INTEGRATION_OWNER
CLOSURE_POLICY: EXACT_CANDIDATE_EVIDENCE_ONLY
LEGACY_POLICY: V1_V4_HISTORICAL_EVIDENCE_ONLY

## 1. Canonical authority

Only these four files define executable orchestration semantics:

1. `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` — what must be true.
2. `plans/diagnose-implementing/PACKAGE.template.md` — facts, relations, evidence schema.
3. `plans/diagnose-implementing/orchestrator.mjs` — derives gates/state from package + Git truth.
4. `tools/guards/governance-schema-gate.mjs` — proves the core cannot silently drift/fail open.

Any README, plan, old package, historical prompt, report, comment, generated output, or prior session is Derived Support only. Product/runtime evidence outranks documentation. No document may make a runtime/product claim true by declaration.

## 2. Invocation, isolation, resume

Fresh invocation:

`resolve live integration target → create isolated task branch/workspace → create V5 package → reconcile semantic root → diagnose → cluster/rank → derive frontier → execute → verify → reconcile latest target → integrate non-force → final read-only verification`

Resume is allowed only when the user explicitly identifies the exact package/task. Repin live repository truth and treat saved root placement, ranking, frontier, evidence freshness, and foreign-delta assumptions as untrusted until reconciled.

Isolation:

- Local writes: dedicated Task Branch + dedicated Worktree.
- Remote/API writes: dedicated Task Branch.
- Read-only workers may inspect pinned refs.
- Integration Target is never a shared work branch.
- One writing owner per conflict domain and one Integration Owner per target.
- Force push, foreign overwrite, and stale-target integration are forbidden.

A schema migration of the orchestrator itself may bootstrap from the immediately previous schema only on an isolated exact-base task branch. After V5 lands, only V5 packages are executable authority.

## 3. Semantic root and coverage

`TARGET` is the semantic task root, not a file-path hint. `LATEST_HEAD` is repository truth/integration baseline only; recency never sets work order.

For `TARGET=كل شيء`, start from System Operational Root. For a narrow target, start from the highest material operational meaning inside the target.

Coverage order:

`Product outcomes → actors/identities → authorities/responsibilities → journeys → states/transitions/preconditions/invariants → handoffs/cross-surface meaning → canonical owners/writers/readers/consumers → contracts/APIs/data/persistence/readback → events/jobs/providers → control-panel interventions → runtime/config/environment/observability/security/CI → implementation`

Every material journey must account for, where applicable:

`Actor | Entry | Preconditions | Authorization | Action | Decision Rule | Current State | Next State | Invariants | Side Effects | Handoff | Canonical Owner | Success | Failure | Recovery | Later Readback | Cross-Surface Meaning`

Diagnosis must deliberately use the passes required by the risk/scope, including:

`forward | reverse | temporal | actor/responsibility | state/transition | invariant | cross-surface differential | cross-layer vertical | failure/recovery | counterfactual | negative-space | adversarial | concurrency/idempotency | security/isolation | finance | offline/reconnect | provider failure | migration/compatibility`

For material paths, challenge at least:

`success | empty/missing | invalid | unauthenticated | denied | wrong role/scope | IDOR | forbidden state | not found | conflict/stale | duplicate/replay | idempotency | boundary | race | partial failure | dependency failure | timeout/unknown result | retry/backoff/DLQ | offline/reconnect | restart/recovery | old/new data | mixed-version migration | rollback/roll-forward | compensation/reconciliation`

## 4. Evidence altitude and lower-layer HOLD

Escalate before fixing:

`technical symptom ↑ implementation ↑ contract/data meaning ↑ state/transition ↑ journey/handoff ↑ authority/ownership ↑ highest proven material causal root`

An early technical observation is evidence, not automatically work:

`HOLD → PROMOTED(parent + RC + evidence + current priority) | DISPOSITIONED(with proof)`

No Product/Runtime/Data mutation before operational diagnosis is ready except a proven `DIAGNOSTIC_BLOCKER` that prevents acquisition of the truth itself. A diagnostic blocker change must be minimal, must not silently change product semantics, and must return immediately to diagnosis.

## 5. Truth, findings, decisions and accounting

Truth states:

`ACTUAL | INTENDED_AUTHORIZED | DESIRED_RESOLVED | CONFLICT`

Every material element must be ID-addressable and dispositioned:

`Operational Node | Finding | Root Cause | Dependency | Consumer | Scope Delta | Decision | Cleanup Item | Evidence`

No silent TODO, IGNORE, patch-around, fake green, or dropped material element.

Decision boundary:

`derive from evidence if possible → ask only true non-derivable decision → options + recommendation + reason + impact → record Decision ID → propagate through affected graph → invalidate affected assumptions/evidence → re-diagnose/re-cluster/re-rank only the affected cone`

## 6. Root cause, competitive deepening and priority

Required causal path:

`target-wide material discovery → findings → RC clusters → dependency/impact graph → competitive deepening → systemic-leverage ranking → adversarial challenge → frontier`

Every material Finding is either linked to an RC or excluded with proof. Every material RC states operational parent, evidence, upstream dependencies, consumers, blast/unlock effect, comparative priority, deepening state, and disposition.

Before final ranking, every open/material RC must be:

`DEEPENED_ENOUGH_TO_RANK` or `PROVEN_CANNOT_OUTRANK`

The winner must be `DEEPENED_ENOUGH_TO_RANK`.

Default leverage precedence:

1. upstream/root-cause depth
2. blocking power
3. canonical/foundation importance
4. blast radius
5. security/data/finance/operational risk
6. unlock value
7. cross-journey/cross-surface effect
8. recurrence/finding density
9. structural-debt multiplier
10. local leaf/cosmetic impact

Forbidden shortcuts:

`recency | finding count alone | changed-file count | easiest fix | last session/topic | sequence number | first CI failure`

A stronger upstream cause invalidates only the affected cone: suspend dependent work, update graph/evidence, rerank, treat upstream root, invalidate descendants, then resume only if still justified.

## 7. Frontier and execution

The engine derives readiness; package authors do not grant themselves PASS through summary flags.

A frontier is executable only when:

- operational coverage is materially settled;
- negative-space and adversarial evidence pass;
- all material Findings/Decisions/Consumers/Dependencies/Scope Deltas are accounted;
- RC references are valid and ranking/deepening are complete;
- every selected Work item references a valid RC and conflict domain/owner;
- dependency order is satisfiable;
- verification is defined before execution.

Dependencies govern order. Read-only diagnosis may run broadly in parallel. Parallel writes require graph-proven semantic independence, non-overlapping conflict domains, isolated worker branches/worktrees, and explicit owners.

Root treatment is coherent cutover:

`highest proven root treatment → canonical owner → affected writers/readers/consumers → contracts/data/generated sync/migrations → cross-surface behavior → obsolete/parallel truth removal → cleanup → canonical readback/runtime verification`

No COMPLETE while a required consumer, migration, contradictory source of truth, reachable obsolete path, workaround, or material scope delta remains unresolved.

## 8. Evidence model and proof limits

Evidence records bind:

`claim | source/check | candidate | environment/profile | result | proof limits/invalidation trigger`

Valid evidence states include `PASS | FAIL | MISSING | STALE | BLOCKED | N/A`. Missing/stale required evidence is OPEN.

Proof limits are explicit:

- Task Branch green ≠ Integration Target green.
- static/build/typecheck/lint/unit/mock evidence ≠ runtime/E2E evidence.
- hidden/disabled UI ≠ server authorization.
- migration applied ≠ idempotency/readback/restart/compatibility proof.
- tracked workflow ≠ live hosted enforcement.
- docs/plans ≠ Product PASS.

Do not rerun blindly to manufacture green. A changed candidate, changed authority/contract/data/runtime assumption, or foreign delta invalidates the affected evidence cone.

## 9. Git truth, integration and candidate

The engine resolves live Git truth itself. An agent-supplied SHA is never the authority for freshness.

Before integration:

`resolve live target → classify foreign delta → reconcile affected graph/evidence → reverify → integrate non-force/fast-forward-safe`

Foreign delta classes:

`UNRELATED | RELATED_NON_BLOCKING | UPSTREAM_OR_ROOT_CHANGING | BLOCKING | SEMANTIC_OVERLAP | DIRECT_CONFLICT | AUTHORITY_OR_TRUTH_CHANGE`

Unrelated work is preserved and does not redirect priority. Related/root-changing work invalidates only the affected cone.

Candidate lifecycle:

`BASE_SHA → TASK_HEAD → verified implementation candidate → latest-target reconciliation → integration result → FINAL_CANDIDATE(= exact live integration HEAD) → final read-only verification`

Final closure is evaluated on the exact current Integration Target HEAD. Any source write after final-candidate verification creates a new candidate and invalidates candidate-bound evidence.

## 10. Cleanup

Cleanup is part of DONE, not optional polish.

Remove or correctly relocate/merge proven:

`dead | stale | legacy | superseded | unused | obsolete | workaround/fallback | unjustified compatibility | orphan | misplaced | duplicate-truth | temporary | debug | generated noise`

Flow:

`discover → prove obsolete/wrong/duplicate → remove/merge/move → repair references/consumers → reverify`

Never blindly delete merely because a static tool calls something orphaned.

## 11. Modes and derived gates

`PREPARE_ONLY` may diagnose, decide, rank, define exact cutover/cleanup/verification, and end at a proven prepared frontier. It never claims execution closure.

`EXECUTE_END_TO_END` continues through root treatment, consumer reconciliation, cleanup, verification, integration, exact-candidate final verification, and closure.

The package contains facts and evidence, not authoritative `READINESS`, `UNACCOUNTED`, `COMPLETION`, or lifecycle `STATUS` declarations. `orchestrator.mjs` derives them.

Public operation:

`node plans/diagnose-implementing/orchestrator.mjs new ...`

`node plans/diagnose-implementing/orchestrator.mjs check --package <PACKAGE.md> --phase <diagnose|prepare|execute|verify|close>`

`node plans/diagnose-implementing/orchestrator.mjs state --package <PACKAGE.md>`

## 12. Closure equation

`CLOSED` is derivable only when all are true:

- exact live Integration Target HEAD is the final candidate;
- task isolation/base ancestry/reconciliation remain valid;
- operational coverage and RC landscape are referentially sound;
- zero material unaccounted Findings/Decisions/Consumers/Dependencies/Scope Deltas/lower-layer observations;
- required consumers and cleanup are complete;
- implementation and verification evidence pass;
- governance/self-guard evidence passes;
- runtime/product evidence passes when required;
- final adversarial evidence passes;
- closure evidence is candidate-bound and current;
- no known material orchestrator/task finding remains.

If any required condition is not proven, state remains OPEN.
