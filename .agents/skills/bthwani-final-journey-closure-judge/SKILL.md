---
name: bthwani-final-journey-closure-judge
version: 2026.07.17-v3
summary: Judge final closure only from same-commit, all-applicable-scope, independently approved evidence within registered assurance boundaries.
---

# bthwani-final-journey-closure-judge

## Purpose

Own final evidence reconciliation for deciding whether a governed journey may be classified as `CLOSED_WITH_EVIDENCE`.

## Invoke when

- The user explicitly requests final closure, merge readiness, release readiness, production readiness, or a complete no-gap judgment.
- All applicable implementation and verification work is complete and evidence must be reconciled.

## Do not invoke when

- Work is still in discovery, implementation, or partial verification.
- The request asks only for a code check, diagnostic, draft, or one evidence scope.

## Authority boundary

This skill reconciles independently produced evidence and issues the canonical final decision. It may not create missing proof, approve its own implementation, replace Product Manager, Product Owner, governance, CI, financial, QA, security, release, production, or residual-risk authorities, infer runtime truth from declarations, or expand a guard beyond its assurance class.

## Read before

- `governance/contracts/decision-vocabulary.json`
- `governance/26_SDLC_TEAM_AND_STAGE_GATES.md`
- `governance/github/repository-enforcement.json`
- `governance/guards/guard-assurance.json`
- applicable Product Truth, SDLC artifact, and change-impact documents;
- same-commit evidence and approvals for every applicable scope.

## Required evidence model

Reconcile the exact `applicableEvidenceScopes` declared by impact:

1. `static`: contracts, architecture, code, data ownership, generated clients, bindings, and targeted checks.
2. `product`: Product Manager model and Product Owner acceptance.
3. `runtime`: startup, health, actor request/response, failure path, and persistence readback.
4. `visual`: rendered flow, state, RTL, and visual acceptance when applicable.
5. `qa`: independent QA, negative tests, cross-surface consistency, and accessibility acceptance.
6. `security`: independent security, privacy, authorization, vulnerability, and secret evidence.
7. `finance`: independent Financial Control approval for WLT financial truth and DSH/WLT handoffs.
8. `isolation`: independent isolation-security evidence when tenant or isolation impact applies.
9. `governance`: Governance Contract approval for control-plane changes.
10. `ci`: CI Workflow approval, immutable action checks, syntax/security analysis, and actual same-commit results.
11. `release`: release readiness, rollback, monitoring, support ownership, and residual-risk decision.
12. `production`: deployment, production smoke/readback, telemetry review, and rollback readiness.

Every skipped stage must appear in `notApplicableStages` with matching `stageExclusions` evidence. A scope-specific pass never upgrades another scope, and prior evidence never overrides a newer failure or commit.

## Guard assurance rule

- Resolve every guard result through `governance/guards/guard-assurance.json`.
- `proves` is the maximum positive claim supported by that guard.
- Every `doesNotProve` item remains unresolved without separate same-commit evidence.
- A guard with `closureEligible: false` cannot independently support closure.
- Static, configuration, schema, regression, syntax, pinning, and bounded runtime checks remain only their declared scope evidence.

## GitHub enforcement rule

- Verify `governance/github/repository-enforcement.json` against live GitHub state before protected closure.
- If `highRiskClosureAllowed` is false, a high-risk journey cannot close.
- If `separationOfDutiesProven` is false, a journey requiring independent approval returns `NEEDS_EVIDENCE` or the applicable block decision.
- A single CODEOWNERS identity proves routing only.
- Unproven branch protection, required checks, stale-approval dismissal, or workflow success cannot be treated as pass.

## Forbidden

- Using implemented, code checked, guard passed, or workflow configured as a synonym for closure.
- Closure with failed gates, missing scopes, stage exclusions without evidence, open blockers, unresolved risk, stale evidence, or self-approval.
- Closure based on a merge ref, another branch, seed, fixture, mock, declaration, or documentation-only claim.
- Promoting static/configuration/regression evidence into runtime, finance, isolation, QA, security, release, production, or SaaS proof.
- Inventing collaborators, teams, approvals, GitHub rules, checks, runtime, or production evidence.

## Required output

```text
resolved_commit_sha:
applicable_scopes:
passed_scopes:
failed_scopes:
not_applicable_stages:
stage_exclusion_evidence:
missing_evidence:
required_approvals:
guard_assurance_reconciliation:
github_enforcement_state:
separation_of_duties:
open_blockers:
residual_risks:
decision:
```

Allowed decisions: `CLOSED_WITH_EVIDENCE`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `QA_BLOCK`, `SECURITY_BLOCK`, `RELEASE_BLOCK`, `BLOCKED_EXTERNAL`, and `PROTOCOL_VIOLATION`.
