# Operational Journey Factory Checklist

This checklist tracks the factory implementation only. Items must be checked only after the corresponding implementation and verification step is actually complete.

## Context And Sources

- [ ] Read active AGENTS and LeanCTX rules.
- [ ] Confirm target branch and repository state.
- [ ] Confirm `governance/operational_journey_protocol_package/` state.
- [ ] Confirm `tools/checklist/` state.
- [ ] Confirm package scripts and guard registry patterns.

## Factory Templates

- [ ] Create `governance/operational_journey_factory/`.
- [ ] Add `00_FACTORY_INDEX.md`.
- [ ] Add `01_TOTAL_DISCOVERY_PROTOCOL.md`.
- [ ] Add `02_ATOMIC_SCOPE_TEMPLATE.md`.
- [ ] Add `03_ATOMIC_FILE_DECISION_TEMPLATE.md`.
- [ ] Add `04_SURFACE_TEMPLATE.md`.
- [ ] Add `05_FEATURE_TEMPLATE.md`.
- [ ] Add `06_BACKEND_API_DATABASE_TEMPLATE.md`.
- [ ] Add `07_FRONTEND_BINDING_TEMPLATE.md`.
- [ ] Add `08_UI_ICON_COMPONENT_TEMPLATE.md`.
- [ ] Add `09_PERMISSION_STATE_AUDIT_TEMPLATE.md`.
- [ ] Add `10_RUNTIME_DOCKER_ENV_TEMPLATE.md`.
- [ ] Add `11_TOOLCHAIN_EXECUTION_TEMPLATE.md`.
- [ ] Add `12_CLEANUP_MOVE_MERGE_DELETE_TEMPLATE.md`.
- [ ] Add `13_EVIDENCE_AND_CLOSURE_TEMPLATE.md`.
- [ ] Add `14_JOURNEY_TEMPLATE_MASTER.md`.
- [ ] Add `15_GAP_LEDGER_TEMPLATE.md`.
- [ ] Add `16_TEMPLATE_FILLING_RULES.md`.
- [ ] Add `17_GENERATOR_OUTPUT_POLICY.md`.
- [ ] Add `generated/.gitkeep`.

## Mandatory Completeness Rules

- [ ] Multi-surface full-stack completeness rule is present.
- [ ] Smart business-outcome journey segmentation rule is present.
- [ ] Frontend/backend/API/database binding rule is present.
- [ ] UI button, icon, state, permission, tab, and section coverage is present.
- [ ] Cleanup, move, merge, delete, export, helper, and file decision rules are present.
- [ ] Control Panel Platform sovereignty rule is present.
- [ ] WLT financial truth boundary is present.
- [ ] No journey execution or behavior change is introduced.

## Scripts And Guard

- [ ] Add `tools/scripts/generate-operational-toolchain-inventory.mjs`.
- [ ] Add `tools/scripts/generate-operational-surface-inventory.mjs`.
- [ ] Add `tools/scripts/generate-operational-journey-inventory.mjs`.
- [ ] Add `tools/scripts/generate-operational-gap-ledger.mjs`.
- [ ] Add `tools/guards/operational-journey-template-factory-gate.mjs`.
- [ ] Ensure generator outputs target `.diagnostics/operational-journey-factory/`.
- [ ] Ensure generator outputs include `head_sha`.
- [ ] Ensure generated outputs never claim journey readiness.

## Package And Registry

- [ ] Add package script `diagnostics:operational:toolchain`.
- [ ] Add package script `diagnostics:operational:surfaces`.
- [ ] Add package script `diagnostics:operational:inventory`.
- [ ] Add package script `diagnostics:operational:gaps`.
- [ ] Add package script `guard:operational-journey-factory`.
- [ ] Register the new guard in `governance/guards/guard-registry.json`.

## Verification Results

- [ ] Run `pnpm run diagnostics:operational:toolchain`.
- [ ] Run `pnpm run diagnostics:operational:surfaces`.
- [ ] Run `pnpm run diagnostics:operational:inventory`.
- [ ] Run `pnpm run diagnostics:operational:gaps`.
- [ ] Run `pnpm run guard:operational-journey-factory`.
- [ ] Run `git --no-pager diff --check`.
- [ ] Run `pnpm run guard:governance-schema`.
- [ ] Run `pnpm run guard:guard-registry`.
- [ ] Run `pnpm run guard:markdown-governance`.
- [ ] Run `pnpm run typecheck`.
- [ ] Run `git status --short`.

## Explicit Non-Claims

- [ ] Do not claim a journey is ready for live testing.
- [ ] Do not claim runtime readiness without runtime smoke.
- [ ] Do not claim final closure.
- [ ] Do not commit raw diagnostics.
- [ ] Document any remaining blocker or failing check.
