# 08 — Cleanup and Deprecation

Status: ACTIVE_CANONICAL

## Cleanup rules

- No global delete, blind replace, donor folder dump, or unbounded generated cleanup.
- Inspect imports, exports, routes, navigation, registries, scripts, workflows, tests, runtime references, and owner contracts before deleting, moving, merging, or retiring an item.
- Apply the smallest safe ownership correction and preserve history through Git rather than tracked transient evidence.
- A historical extraction ledger may explain previous work but cannot prove the current commit is safe.

## Disposition labels

These labels classify cleanup targets; they are not lifecycle or closure decisions:

- `KEEP_ACTIVE`
- `REFACTOR_SPLIT`
- `MERGE_DUPLICATE`
- `MOVE_TO_OWNER`
- `RETIRE_DEAD`
- `ADOPT_AS_IS`
- `ADOPT_AFTER_REWRITE`
- `DESIGN_REFERENCE_ONLY`
- `DOMAIN_REFERENCE_ONLY`
- `API_REFERENCE_ONLY`
- `REJECT_NOISE`
- `REJECT_DEMO_PREVIEW`
- `REJECT_DUPLICATE`
- `REJECT_BROKEN`
- `OUT_OF_SCOPE_FOR_THIS_JOURNEY`

The result of a cleanup operation still maps through the canonical decision vocabulary.

## Artifact and test lifecycle cleanup

Cleanup applies to source, supporting files, tests, fixtures, snapshots, scripts, runbooks, and tracked governance artifacts. Age alone is never a deletion criterion; current function, ownership, consumption, accuracy, duplication, and evidence value decide disposition.

Tests must be retained when they are active behavior regressions, security invariants, tenant-isolation checks, financial-integrity checks, database-integrity checks, contract-binding checks, runtime smokes, migration-safety checks, negative-behavior checks, or recovery and idempotency checks.

Tests must be retired or rebuilt when they are exact-SHA gates, branch-specific checks, journey-closure checks, evidence-file checks, wording-only document checks, duplicate checks with no additional protection, removed-feature checks, uninvoked checks, obsolete fixture checks, mock-only success checks, stale snapshots, or implementation-detail checks no longer owned by a public contract.

When a historical test mixes useful behavior assertions with closure, journey, branch, SHA, or evidence assertions, extract the useful invariant into a durable capability test first. Then remove the historical test and any exact-head or evidence dependency.

Security, financial, tenant-isolation, migration, and real regression tests must not be deleted until equal or stronger current-commit coverage is proven. Missing proof is `NEEDS_EVIDENCE`; broken or contradictory coverage is `FIX_REQUIRED`.

## Runtime truth forbidden

- preview or demo data in live behavior;
- mock, fixture, or in-memory success presented as persisted execution;
- fake actor or object identifiers presented as authenticated truth;
- local fallback that hides an unavailable contract, backend, provider, or database;
- tracked diagnostics, generated reports, screenshots, recordings, or evidence outputs unless explicitly governed as durable source.

## Deletion proof

A deletion, merge, or move is accepted only after proving the target has no required live linkage, or after updating every required consumer in the same bounded change. Missing evidence results in `NEEDS_EVIDENCE`; a proven broken linkage results in `FIX_REQUIRED`.

## Acceptance condition

Accepted only when each affected target has a disposition, current-commit linkage checks support the action, consumers and registries remain coherent, transient outputs are untracked, no historical document is used as current proof, and the final result uses the canonical decision vocabulary.
