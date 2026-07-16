# 06 — Evidence and Gates

Status: CANONICAL

## Default rule

Normal implementation uses CODE_BASED_LEAN, in accordance with the canonical policy in [LEAN_CODE_BASED_CHECK.md](LEAN_CODE_BASED_CHECK.md).

The agent should inspect relevant live code, make the smallest correct change, and run only the most targeted useful code-based check.

Evidence files and screenshots are not required for normal implementation. All file operations and scans must obey the token-drain exclusions specified in the canonical policy.

## Evidence escalation

Create evidence files only for:
- explicit final closure / CLOSED / READY request
- PR readiness
- merge readiness
- release readiness
- finance/WLT
- security/auth/privacy/secrets
- database mutation or migrations
- runtime/docker/live API behavior
- public OpenAPI/contract change
- dependency upgrades
- broad ownership refactor
- explicit user request

## Stage-gate escalation

Governed SDLC stage gates are defined in [26_SDLC_TEAM_AND_STAGE_GATES.md](26_SDLC_TEAM_AND_STAGE_GATES.md).

Use the stage-gate model when the change affects release approval, security authority, independent QA, cross-surface runtime readiness, tenant isolation, production rollback, or formal risk acceptance.

Lean code-based changes still use the smallest targeted check unless a stage gate applies.

## Normal output

For regular implementation, report only:
- changed paths
- targeted code-based check used, if any
- remaining risk or blocker, if any

Do not create command logs, handoff ZIPs, screenshot sets, repeated git status files, diff-check artifacts, or long closure reports unless escalation applies.

## Closure claims

Do not claim CLOSED, READY, FINAL, DONE, or 100% unless the chosen check level matches the task risk and required escalated evidence exists.

## Acceptance condition

Accepted when the implementation is correct in live code, the check level is proportional to the real task risk, and any applicable SDLC or SaaS/Tenancy gate has not been bypassed.
