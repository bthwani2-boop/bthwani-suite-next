# 00 — Decision Index

Status: CANONICAL_MINI_GOVERNANCE_INDEX
Stage: FOUNDATION-001

## Purpose

This is the only canonical governance index for `bthwani-suite-next`.

No governance file is canonical unless listed here.

## Canonical governance files

1. 00_DECISION_INDEX.md
2. 01_REPO_BOUNDARIES.md
3. 02_SERVICES_AND_SURFACES.md
4. 03_UI_KIT_AND_BRAND_LOCK.md
5. 04_API_RUNTIME_BINDING.md
6. 05_DOCKER_AND_DATA_PLANE.md
7. 06_EVIDENCE_AND_GATES.md
8. 07_SECURITY_AND_SECRETS.md
9. 08_CLEANUP_AND_DEPRECATION.md
10. 09_SLICE_OPERATING_MODEL.md
11. 10_TOOLCHAIN_VERSION_LOCK.md
12. 11_INTERFACE_BLUEPRINTS.md
13. 13_DSH_SERVICE_ACTIVATION.md
14. 14_MASTER_EXTRACTION_LOGIC_UX_COVERAGE.md
15. 99_LEGACY_EXTRACTION_LEDGER.md

## Allowed unresolved states

- NOT_APPROVED_YET
- BLOCKED_NEEDS_BLUEPRINT
- BLOCKED_NEEDS_API_CONTRACT
- BLOCKED_NEEDS_RUNTIME_EVIDENCE
- OUT_OF_SCOPE_FOR_THIS_SLICE

## Acceptance condition

Accepted only when all listed files exist, every listed file has an `Acceptance condition`, and no product slice starts before `foundation:gate` passes.
