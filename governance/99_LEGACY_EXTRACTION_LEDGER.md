# 99 — Legacy Extraction Ledger

Status: CANONICAL

## Purpose

Record donor extraction decisions without importing old governance history.

## Donor

- Donor repo: C:\bthwani-suite
- Donor role: DONOR_REFERENCE_ONLY
- New repo: C:\bthwani-suite-next
- New role: CANONICAL_IMPLEMENTATION_TARGET

## Session

- Session: FOUNDATION-001-MINI-GOVERNANCE-FAST-20260618-180017
- Mode: APPLY
- Evidence: tools/registry/runs/FOUNDATION-001-MINI-GOVERNANCE-FAST-20260618-180017

## Decisions applied

| Target | Decision |
|---|---|
| governance/00_DECISION_INDEX.md | ADOPT_AFTER_REWRITE |
| governance/01_REPO_BOUNDARIES.md | ADOPT_AFTER_REWRITE |
| governance/02_SERVICES_AND_SURFACES.md | ADOPT_AFTER_REWRITE |
| governance/03_UI_KIT_AND_BRAND_LOCK.md | ADOPT_AFTER_REWRITE |
| governance/04_API_RUNTIME_BINDING.md | ADOPT_AFTER_REWRITE |
| governance/05_DOCKER_AND_DATA_PLANE.md | ADOPT_AFTER_REWRITE |
| governance/06_EVIDENCE_AND_GATES.md | ADOPT_AFTER_REWRITE |
| governance/07_SECURITY_AND_SECRETS.md | ADOPT_AFTER_REWRITE |
| governance/08_CLEANUP_AND_DEPRECATION.md | ADOPT_AFTER_REWRITE |
| governance/09_JOURNEY_OPERATING_MODEL.md | ADOPT_AFTER_REWRITE |
| governance/10_TOOLCHAIN_VERSION_LOCK.md | ADOPT_AFTER_REWRITE |
| governance/10_DSH_WLT_FINANCIAL_BOUNDARY.md | MOVE_TO_NONCANONICAL |
| governance/14_TOOLCHAIN_VERSION_LOCK.md | MOVE_TO_NONCANONICAL |
| contracts/master.openapi.yaml | ADOPT_AFTER_REWRITE |
| core/identity/contracts/auth.openapi.yaml | ADOPT_AFTER_REWRITE |
| core/providers/contracts/providers.openapi.yaml | ADOPT_AFTER_REWRITE |

## Acceptance condition

Accepted only when every donor-derived target has a decision and no old history is copied wholesale.