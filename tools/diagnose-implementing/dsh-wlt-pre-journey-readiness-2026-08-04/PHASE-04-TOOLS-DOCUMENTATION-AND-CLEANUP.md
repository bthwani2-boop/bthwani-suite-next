# PHASE 04: Tools, Documentation, and Final Cleanup

## Scope
CI Workflows, Governance Tools, Test Suites, Runbooks, Residual Garbage Collection.

## Inputs
- Finalized Phase 01, 02, 03.

## Outputs
- Clean repository with 0 obsolete files.
- Accurate documentation reflecting the radical changes.
- Stable CI/CD pipeline.

## Dependencies
- `PHASE-03-MULTI-SURFACE-EXPERIENCE`

## Tasks
1. **Garbage Collection:** [CLOSED_WITH_EVIDENCE] Final pass to delete any file renamed as `_legacy`, `_old`, or unused utility scripts. (No residual files found).
2. **CI Pipeline Repair:** [CLOSED_WITH_EVIDENCE] Ensure GitHub Actions and static checks strictly enforce new boundaries.
3. **Documentation Sync:** [CLOSED_WITH_EVIDENCE] Update architecture diagrams, registries, and dossiers.
4. **Final Same-SHA Verification:** [BLOCKED] Execute all validation steps on the final commit. (Blocked by B-011: Missing Closure Commands. Executing `verify:full` as fallback).

## Acceptance Criteria
- Repository has no dead code or unreferenced modules.
- CI is green across all stages.
- No untested or unverified components remain.

## Independent Closure Checks
- `madge` or similar dependency tracer shows 0 circular dependencies and 0 unreferenced files.
- Full E2E suite PASS.
- Final `git diff --check` PASS.
