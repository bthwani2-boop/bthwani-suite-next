# Operational Journey Template Factory Index

## Repository Truth

- repo: `bthwani2-boop/bthwani-suite-next`
- ref: `implementing`
- head_sha: generated inventories must record the current HEAD SHA.
- status: `TEMPLATE_FACTORY_ONLY`
- implementation_started: `false`

## Purpose

This factory exists before journey execution. It forces every future journey to be discovered from live repository evidence before implementation starts.

## Required Before Any Journey Execution

- Run the toolchain, surface, journey, and gap ledger generators.
- Fill every applicable template from generated inventory, direct source evidence, or a justified exclusion.
- Classify every app, surface, section, tab, screen, page, route, backend route, API operation, database truth, generated client, shared controller, view model, adapter, permission, state, icon, label, action, test, guard, workflow, export, helper, runtime binding, and cleanup candidate.
- Block journey start when any required item lacks owner, path, classification, required action, proof source, verification command, decision, status, or blocker type.

## Template List

1. `01_TOTAL_DISCOVERY_PROTOCOL.md`
2. `02_ATOMIC_SCOPE_TEMPLATE.md`
3. `03_ATOMIC_FILE_DECISION_TEMPLATE.md`
4. `04_SURFACE_TEMPLATE.md`
5. `05_FEATURE_TEMPLATE.md`
6. `06_BACKEND_API_DATABASE_TEMPLATE.md`
7. `07_FRONTEND_BINDING_TEMPLATE.md`
8. `08_UI_ICON_COMPONENT_TEMPLATE.md`
9. `09_PERMISSION_STATE_AUDIT_TEMPLATE.md`
10. `10_RUNTIME_DOCKER_ENV_TEMPLATE.md`
11. `11_TOOLCHAIN_EXECUTION_TEMPLATE.md`
12. `12_CLEANUP_MOVE_MERGE_DELETE_TEMPLATE.md`
13. `13_EVIDENCE_AND_CLOSURE_TEMPLATE.md`
14. `14_JOURNEY_TEMPLATE_MASTER.md`
15. `15_GAP_LEDGER_TEMPLATE.md`
16. `16_TEMPLATE_FILLING_RULES.md`
17. `17_GENERATOR_OUTPUT_POLICY.md`

## Generator List

- `tools/scripts/generate-operational-toolchain-inventory.mjs`
- `tools/scripts/generate-operational-surface-inventory.mjs`
- `tools/scripts/generate-operational-journey-inventory.mjs`
- `tools/scripts/generate-operational-gap-ledger.mjs`

## Guard List

- `tools/guards/operational-journey-template-factory-gate.mjs`

## Factory Rules

- No journey starts until `pnpm run guard:operational-journey-factory` succeeds.
- No manually invented pass state is allowed.
- No route, tab, button, icon, state, permission, export, helper, API, database item, runtime item, or CI item may be skipped by opinion.
- Every item must be classified by generated inventory, direct source proof, or justified exclusion with verification.
- Control Panel Platform owns platform vars, providers, integrations, feature flags, policies, service areas, zones, SLA, capacity rules, and runtime configuration references.
- App surfaces are consumers of platform configuration only.
- WLT remains the financial truth boundary.
