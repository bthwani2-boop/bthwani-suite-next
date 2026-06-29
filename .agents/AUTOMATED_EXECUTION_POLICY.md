# BThwani Automated Execution Policy

Status: mandatory.
Scope: all implementation, remediation, cleanup, refactor, migration, agent-file changes, and closure claims in this repository.

## Core rule

Automation is mandatory. Agents must use scripts, codemods, guards, package scripts, Nx, Graphify, typecheck, lint, test, build, or other repository automation as the primary path for diagnosis, remediation, and verification.

Manual file-by-file chasing is prohibited as the primary execution method.

Manual edits are allowed only as narrow justified exceptions, and must be verified by scripts or automated checks afterward.

## Required sequence

1. Define scope, ref, owner paths, affected surfaces, and risk.
2. Run or create one or more diagnostic scripts or commands.
3. Group findings by root cause, repeated pattern, affected layer, owner path, affected surface, and risk.
4. Apply fixes through scripted or bulk remediation where possible.
5. Run verification scripts or commands covering the full affected pattern.
6. Provide concise evidence from the automation before claiming closure.

## Bulk remediation rule

Problems must be corrected collectively and pattern-first where possible. Do not fix only isolated samples when the same issue may exist elsewhere.

Use codemods, targeted scripts, existing guards, repository search, dependency graph tools, or package scripts to cover the whole pattern.

## Closure rule

Do not report CLOSED, READY, READY_FOR_PR, PASS, or 100% unless automation-backed diagnosis, remediation, and verification support the claim.

## Relationship to CODE_BASED_LEAN

Lean execution does not mean manual execution. Lean means using the smallest sufficient automation, avoiding unnecessary broad scans, and avoiding evidence bloat while still proving the work through scripts or automated checks.
