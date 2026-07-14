# Operational Journey Template Factory Index

## Repository Truth

- repo: `bthwani2-boop/bthwani-suite-next`
- ref: current Git branch at generation time; branch names must not be hardcoded in factory files.
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

## Schema List

1. `01_TOTAL_DISCOVERY_PROTOCOL.md`
2. `01_EXECUTION_LEDGER_SCHEMA.md`
3. `02_VERIFICATION_CLOSURE_SCHEMA.md`
4. `03_RUNTIME_EVIDENCE_INDEX_SCHEMA.md`
5. `14_JOURNEY_TEMPLATE_MASTER.md`
6. `17_GENERATOR_OUTPUT_POLICY.md`

> **Note:** The old 17 templates have been moved to `legacy_templates/` and are no longer required.

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
