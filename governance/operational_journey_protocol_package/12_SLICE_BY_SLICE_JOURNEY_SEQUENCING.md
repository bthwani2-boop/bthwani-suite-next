# 12 — Multi-Journey Selection & Slice-by-Slice Sequencing

Status: DERIVED_SUPPORT
Authority: `governance/authority/authority-precedence.json`

This file provides sequencing guidance only. It does not create journey authority, write authorization, approval or closure.

## Scope

Use this file when a current task explicitly covers multiple journeys or when one journey must be decomposed into vertical slices. The current derived journey index is:

`tools/plans/journeys/FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md`

The registry is planning support, not Product Truth or implementation evidence. Journey names/scopes must be reconciled against the current Product Truth, contracts, service manifests, source, migrations and runtime state on the pinned commit.

## Journey selection

Before opening a journey:

1. Pin the exact repository, named branch/ref and current SHA.
2. Resolve the requested outcome, actor, canonical truth owner, required consumer surfaces and hard dependencies.
3. Read the derived registry only as an index/discovery aid; never accept a historical status or recalled scope as current truth.
4. Determine order from operational dependencies and foundation prerequisites, not numeric ID alone.
5. Work on one writable journey/slice at a time where shared truth/contracts/schema would conflict; independent read/analysis/check work may run in parallel.
6. A newly discovered journey/capability gap updates planning support only after it is proven by current implementation/product evidence.
7. Final decisions use `governance/contracts/decision-vocabulary.json` only.

A current user instruction may authorize a range or set of journeys, but this file never grants Git write, PR, merge, release or production authority.

## Full-stack slice lenses

Use the coverage lenses defined by the derived registry and task/package. Do not treat FS-01..FS-18, SMSM slices, or any historical count as a mandatory universal schema. A lens is required only when the current journey/change impact makes it applicable.

Every executable slice must be vertical:

```text
one use case/outcome
→ affected UI/surfaces
→ trusted auth/scope
→ contract/client
→ backend/domain state
→ persistence/events/integrations
→ persisted readback
→ affected verification
```

Do not group work horizontally as “all frontend, then backend, then database” when that prevents one use case from being proven end-to-end.

## Sequential closure discipline

Recommended sequence:

```text
pin scope/SHA
→ resolve foundation dependencies
→ enumerate applicable vertical slices
→ order by hard dependency/critical path
→ open one writable slice
→ diagnose root cause + truth owner
→ implement centrally
→ migrate affected consumers
→ remove obsolete/parallel path when safe
→ run smallest sufficient affected verification
→ fix failures
→ re-verify after final edit
→ record same-commit result
→ move to next ready slice
→ run journey-level integration/readback evidence
→ issue canonical decision
```

Do not open downstream work while an unresolved shared/foundation defect invalidates its evidence.

## Per-slice zero conditions

A slice cannot be represented as complete while an applicable condition remains unresolved, including:

```text
unbound required control/consumer
frontend/backend/contract mismatch
permission/object-scope mismatch
parallel truth/write owner
runtime-facing mock/fake success
required migration/backfill gap
missing persisted readback
retry/recovery/idempotency gap
failed required check
stale evidence after later mutation
```

A failed internal check is `FIX_REQUIRED` work, not a future-improvement note. A genuinely external dependency is recorded using the canonical vocabulary without hiding independent work that can still proceed.

## Journey-level close gate

A journey is not complete because most slices passed or a generic build succeeded. The claimed outcome requires every applicable slice/dependency, cross-surface readback, negative/recovery behavior and evidence scope on the candidate commit. Protected approvals remain separate.

`CLOSED_WITH_EVIDENCE` can be issued only under the current decision contract and authority requirements; this derived package cannot issue it by itself.

## Multi-journey report

Report only current verified facts:

```yaml
repository:
target_ref:
reviewed_commit_sha:
authorized_journeys:
completed_or_reviewed_journeys:
open_internal_failures:
open_external_blockers:
missing_evidence:
required_independent_reviews:
final_decision:
```

Do not store workflow-run history, old SHAs or implementation PASS snapshots in the journey registry itself. Git history and the task/evidence system remain the record for those facts.
