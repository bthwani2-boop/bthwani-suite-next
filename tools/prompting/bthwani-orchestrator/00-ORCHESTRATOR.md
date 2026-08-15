# Bthwani Orchestrator

BTHWANI_ORCHESTRATOR_SCHEMA: 4
PUBLIC_SURFACE: 4_FILES
PACKAGE_MODEL: ONE_TASK_ONE_PACKAGE
CLI_MODEL: ONE_TOOL_TWO_COMMANDS
PRIORITY_POLICY: SYSTEMIC_LEVERAGE
ACCOUNTING_POLICY: ZERO_UNACCOUNTED_BEFORE_FRONTIER
PREPARE_POLICY: PREPARED_NOT_CLOSED
WRITE_POLICY: ISOLATED_TASK_BRANCH
INTEGRATION_POLICY: ONE_INTEGRATION_OWNER
CLOSURE_POLICY: EVIDENCE_ONLY

## Authority

- `TARGET` is the semantic task root.
- `LATEST_HEAD` is repository truth and integration baseline; recency never sets work order.
- Product/runtime evidence outranks plans. Plans are Derived Support only.
- Old packages are evidence only; they never authorize implicit resume.

## Invocation

Fresh:

`pin live target → isolate task branch/worktree → new PACKAGE.md → reconcile root → diagnose target → cluster/rank → prove frontier → execute → verify → reconcile live target → integrate → close`

Resume:

`repin live target → validate package/head → reconcile root/landscape/ranking/frontier → continue`

Never trust a saved frontier after repository truth changes.

For `TARGET=كل شيء`:

`system root → owners/foundations/invariants → domains/services/contracts/data → journeys/states/handoffs → surfaces/consumers → implementation/runtime`

## Diagnosis

Trace material issues through:

`Product Truth → identity/session/auth → UI → client → contract → API → domain → data → jobs/providers → readback → consumers → operational result → audit/runtime evidence`

Truth states:

`ACTUAL | INTENDED_AUTHORIZED | DESIRED_RESOLVED | CONFLICT`

Every material finding, decision, consumer, dependency, and scope delta must be accounted. Silent loss is forbidden.

Reuse before create:

`REUSE → EXTEND → MERGE → MOVE_TO_OWNER → SPLIT → CREATE_NEW`

## Root cause and priority

Required:

`target-wide discovery → findings → RC clusters → dependency/impact graph → systemic-leverage ranking → adversarial challenge → frontier`

Priority is the highest proven systemic leverage:

1. upstream/root-cause depth
2. blocking power
3. canonical/foundation importance
4. blast radius
5. risk/severity
6. unlock value
7. recurrence/density
8. structural-debt multiplier

Never prioritize by recency, finding count alone, changed-file count, easiest fix,
last topic, or sequence number.

Every root-cause row must place the issue operationally: outcome/actor plus affected
journey, state, authority, handoff, and canonical truth where applicable. Every
frontier row must state dependency, block/unlock effect, conflict domain, owner,
parallel safety, state, and evidence.

A stronger upstream root invalidates the affected ranking/frontier. Resolve it,
invalidate affected descendants, rerank, and resume only if still justified.

## Package gates

The package compresses the former detailed state into three machine lines:

- `READINESS`: root, landscape, priority, frontier, negative-space pass,
  adversarial pass, and verification definition.
- `UNACCOUNTED`: findings, decisions, consumers, dependencies, and scope deltas.
- `COMPLETION`: implementation, consumers, cleanup, verification, evidence,
  governance sync, fresh-head proof, and final adversarial pass.

`prepare` and `execute` require all READINESS values `YES`, all UNACCOUNTED values
`0`, and proven task isolation. `PREPARE_ONLY` terminates at `STATUS=PREPARED` and
must not claim execution closure. `close` additionally requires every COMPLETION
value `YES`, an assigned Integration Owner, current integration head, and required
runtime/product proof.

## Execution

- Dependencies govern order.
- Parallel diagnosis is allowed.
- Parallel writes require proven independence and non-overlap.
- Task writes stay on the task branch/worktree.
- Only one Integration Owner mutates the integration branch.
- Never force-push or integrate from stale target truth.

Before integration:

`refetch target → classify foreign delta → reconcile graph/evidence → reverify → non-force integrate`

Foreign delta:

- unrelated: preserve; no direction change
- related/nonblocking: update affected evidence; rerank only if leverage changes
- upstream/root/authority change: invalidate affected root/landscape/ranking and backtrack
- conflict/overlap: block only the affected domain until reconciled

## Cleanup

Cleanup is DONE work. Remove proven dead, stale, legacy, superseded, unused,
obsolete, workaround/fallback, unjustified compatibility, orphan, misplaced,
duplicate-truth, temporary, debug, and generated noise.

`discover → prove obsolete/wrong/duplicate → remove/merge/move → repair references → reverify`

## Closure

Closure requires:

- live integration head reconciled
- zero unaccounted findings/decisions/consumers/dependencies/scope deltas
- current root, landscape, ranking, and frontier
- implementation, consumer reconciliation, cleanup, verification, evidence, and governance complete
- fresh-head and final adversarial passes
- executable evidence for executable claims
- runtime/product evidence for runtime/product claims
- no invented CI/test/runtime evidence

Docs/plans never prove Product PASS. Missing required runtime proof keeps closure open.

## Public operation

Only:

`node plans/diagnose-implementing/orchestrator.mjs new ...`

`node plans/diagnose-implementing/orchestrator.mjs check ...`

The package is the sole task state. The CLI is the sole package gate.
