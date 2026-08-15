# Diagnose / Implement

Status: DERIVED_SUPPORT / NAVIGATION_ONLY

Executable orchestration authority is defined only by the V5 canonical core:
`tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md`,
`PACKAGE.template.md`, `orchestrator.mjs`, and
`tools/guards/governance-schema-gate.mjs`.

One task = one `<task>/PACKAGE.md`.

Create a package after the isolated task branch exists:

`node plans/diagnose-implementing/orchestrator.mjs new --name <task> --target "<target>" --mode <PREPARE_ONLY|EXECUTE_END_TO_END> --integration-branch A --task-branch <branch>`

Run a derived gate:

`node plans/diagnose-implementing/orchestrator.mjs check --package <PACKAGE.md> --phase <diagnose|prepare|execute|verify|close>`

Inspect the derived lifecycle state:

`node plans/diagnose-implementing/orchestrator.mjs state --package <PACKAGE.md>`

V5 does not trust package-authored READINESS/UNACCOUNTED/COMPLETION/STATUS summaries. The engine derives gates from the operational graph, causal graph, ledger, frontier, evidence records, and live Git truth.

`PREPARE_ONLY` may reach a proven prepared frontier but never execution closure.

Only `SCHEMA: BTHWANI_PACKAGE_V5` is executable package authority. V1-V4 packages are historical evidence only and require fresh V5 reconciliation before reuse.
