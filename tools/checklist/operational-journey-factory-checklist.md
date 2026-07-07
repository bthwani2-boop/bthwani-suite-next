# Operational Journey Factory Checklist

This checklist tracks the factory implementation only. Items must be checked only after the corresponding implementation and verification step is actually complete.

## Context And Sources

- [x] Read active AGENTS and LeanCTX rules.
- [x] Confirm target branch and repository state.
- [x] Confirm `governance/operational_journey_protocol_package/` state.
- [x] Confirm `tools/checklist/` state.
- [x] Confirm package scripts and guard registry patterns.

## Factory Templates

- [x] Create `governance/operational_journey_factory/`.
- [x] Add `00_FACTORY_INDEX.md`.
- [x] Add `01_TOTAL_DISCOVERY_PROTOCOL.md`.
- [x] Add `02_ATOMIC_SCOPE_TEMPLATE.md`.
- [x] Add `03_ATOMIC_FILE_DECISION_TEMPLATE.md`.
- [x] Add `04_SURFACE_TEMPLATE.md`.
- [x] Add `05_FEATURE_TEMPLATE.md`.
- [x] Add `06_BACKEND_API_DATABASE_TEMPLATE.md`.
- [x] Add `07_FRONTEND_BINDING_TEMPLATE.md`.
- [x] Add `08_UI_ICON_COMPONENT_TEMPLATE.md`.
- [x] Add `09_PERMISSION_STATE_AUDIT_TEMPLATE.md`.
- [x] Add `10_RUNTIME_DOCKER_ENV_TEMPLATE.md`.
- [x] Add `11_TOOLCHAIN_EXECUTION_TEMPLATE.md`.
- [x] Add `12_CLEANUP_MOVE_MERGE_DELETE_TEMPLATE.md`.
- [x] Add `13_EVIDENCE_AND_CLOSURE_TEMPLATE.md`.
- [x] Add `14_JOURNEY_TEMPLATE_MASTER.md`.
- [x] Add `15_GAP_LEDGER_TEMPLATE.md`.
- [x] Add `16_TEMPLATE_FILLING_RULES.md`.
- [x] Add `17_GENERATOR_OUTPUT_POLICY.md`.
- [x] Add `generated/.gitkeep`.

## Mandatory Completeness Rules

- [x] Multi-surface full-stack completeness rule is present.
- [x] Smart business-outcome journey segmentation rule is present.
- [x] Frontend/backend/API/database binding rule is present.
- [x] UI button, icon, state, permission, tab, and section coverage is present.
- [x] Cleanup, move, merge, delete, export, helper, and file decision rules are present.
- [x] Control Panel Platform sovereignty rule is present.
- [x] WLT financial truth boundary is present.
- [x] No journey execution or behavior change is introduced.

## Scripts And Guard

- [x] Add `tools/scripts/generate-operational-toolchain-inventory.mjs`.
- [x] Add `tools/scripts/generate-operational-surface-inventory.mjs`.
- [x] Add `tools/scripts/generate-operational-journey-inventory.mjs`.
- [x] Add `tools/scripts/generate-operational-gap-ledger.mjs`.
- [x] Add `tools/guards/operational-journey-template-factory-gate.mjs`.
- [x] Ensure generator outputs target `.diagnostics/operational-journey-factory/`.
- [x] Ensure generator outputs include `head_sha`.
- [x] Ensure generated outputs never claim journey readiness.

## Package And Registry

- [x] Add package script `diagnostics:operational:toolchain`.
- [x] Add package script `diagnostics:operational:surfaces`.
- [x] Add package script `diagnostics:operational:inventory`.
- [x] Add package script `diagnostics:operational:gaps`.
- [x] Add package script `guard:operational-journey-factory`.
- [x] Register the new guard in `governance/guards/guard-registry.json`.

## Verification Results

- [x] Run `pnpm run diagnostics:operational:toolchain`.
- [x] Run `pnpm run diagnostics:operational:surfaces`.
- [x] Run `pnpm run diagnostics:operational:inventory`.
- [x] Run `pnpm run diagnostics:operational:gaps`.
- [x] Run `pnpm run guard:operational-journey-factory`.
- [x] Run `git --no-pager diff --check`.
- [x] Run `pnpm run guard:governance-schema`.
- [x] Run `pnpm run guard:guard-registry`.
- [x] Run `pnpm run guard:markdown-governance`.
- [x] Run `pnpm run typecheck`.
- [x] Run `git status --short`.

## Explicit Non-Claims

- [x] Do not claim a journey is ready for live testing.
- [x] Do not claim runtime readiness without runtime smoke.
- [x] Do not claim final closure.
- [x] Do not commit raw diagnostics.
- [x] Document any remaining blocker or failing check.
