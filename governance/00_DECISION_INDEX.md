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
10. 09_JOURNEY_OPERATING_MODEL.md
11. 10_TOOLCHAIN_VERSION_LOCK.md
12. 11_INTERFACE_BLUEPRINTS.md
13. 13_DSH_SERVICE_ACTIVATION.md
14. 14_EXTRACTION_AND_SCREEN_INVENTORY.md
15. 14_MASTER_EXTRACTION_LOGIC_UX_COVERAGE.md
16. 15_MATRIX_NORMALIZATION_RULES.md
17. 16_MASTER_MATRIX_V3_BUSINESS_RULES.md
18. 17_PERFORMANCE_AND_RUNTIME_BASELINE.md
19. 99_LEGACY_EXTRACTION_LEDGER.md
20. 26_SDLC_TEAM_AND_STAGE_GATES.md

## Conditional protocol annexes

These files are canonical only when their `applies_when` conditions match the journey:

1. operational_journey_protocol_package/annexes/SAAS_READINESS_AND_TENANCY_GATES.md

## Allowed unresolved states

- NOT_APPROVED_YET
- BLOCKED_NEEDS_BLUEPRINT
- BLOCKED_NEEDS_API_CONTRACT
- BLOCKED_NEEDS_RUNTIME_EVIDENCE
- OUT_OF_SCOPE_FOR_THIS_JOURNEY

## Acceptance condition

Accepted only when all listed files exist, every listed file has an `Acceptance condition`, every applicable conditional annex is applied, and no operational journey starts before `foundation:gate` passes.
