# 06 — Evidence and Gates

Status: CANONICAL

## Default rule

Normal implementation uses CODE_BASED_LEAN.

The agent should inspect relevant live code, make the smallest correct change, and run only the most targeted useful code-based check.

Evidence files are not required for normal implementation.

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

## Normal output

For regular implementation, report only:
- changed paths
- targeted code-based check used, if any
- remaining risk or blocker, if any

Do not create command logs, handoff ZIPs, screenshot sets, repeated git status files, diff-check artifacts, or long closure reports unless escalation applies.

## Closure claims

Do not claim CLOSED, READY, FINAL, DONE, or 100% unless the chosen check level matches the task risk and required escalated evidence exists.

## Acceptance condition

Accepted when the implementation is correct in live code and the check level is proportional to the real task risk.