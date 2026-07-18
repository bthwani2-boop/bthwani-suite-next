# Lian Full-Stack Implementation Control

This directory contains the minimal mutable control state explicitly requested for the `lian` DSH/WLT full-stack execution journey.

## Authority and scope

- Repository: `bthwani2-boop/bthwani-suite-next`
- Target branch: `lian` only
- Repository mode: `REMOTE_ONLY`
- Default execution mode: `CODE_BASED_LEAN`
- Decision vocabulary: `governance/contracts/decision-vocabulary.json`
- Authority precedence: `governance/authority/authority-precedence.json`
- Operational protocol package: derived support only

These files coordinate implementation; they never override live code, service manifests, OpenAPI, migrations, current runtime evidence, GitHub state, Product Truth, or formal independent approvals.

## Files

- `lian-execution-state.json`: historical mutable execution state, active phase, loops, and declared evidence limits.
- `lian-gap-ledger.json`: historical prioritized gap ledger; entries must be reconciled against the current branch before execution.
- `lian-closure-diagnosis-2026-07-19.md`: current remote diagnosis pinned from the live `lian` branch, correcting stale claims and defining the remaining closure gates.

## Update rules

1. Re-pin the current `lian` commit before each write batch.
2. Update control state only after inspecting or changing live implementation.
3. Never mark runtime, finance, QA, security, release, or production as passed from static declarations.
4. Keep fixable repository gaps as `FIX_REQUIRED` until corrected and verified.
5. Use `NEEDS_EVIDENCE` only when implementation may exist but current proof is missing.
6. Use `BLOCKED_EXTERNAL` only for a real external access, environment, provider, approval, or infrastructure blocker.
7. Final closure is only `CLOSED_WITH_EVIDENCE`, subject to every applicable same-commit evidence scope and independent approval.
8. When historical control files contradict live contracts, migrations, handlers, consumers, or tests, live implementation wins and the control files must be corrected before further execution.

## Execution order

1. Reconcile authority, service truth, CI triggers, guard integrity, and evidence claims.
2. Reconcile active contracts, generated clients, routes, handlers, migrations, and consumers.
3. Close DSH/WLT ownership and financial handoff gaps.
4. Close shared-brain and surface bindings.
5. Close actor journeys and negative paths.
6. Run targeted verification, then broaden only when impact requires it.
7. Re-pin the final commit and issue only the canonical decision supported by evidence.
