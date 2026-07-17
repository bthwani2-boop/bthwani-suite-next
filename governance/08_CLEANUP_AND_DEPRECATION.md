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
