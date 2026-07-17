---
name: bthwani-final-journey-closure-judge
version: 2026.07.17-v2
summary: Judge final closure only from same-commit, multi-scope, independently approved evidence.
---

# bthwani-final-journey-closure-judge

## Purpose

Own the final evidence reconciliation that decides whether a governed journey may be classified as `CLOSED_WITH_EVIDENCE`.

## Invoke when

- The user explicitly requests final closure, merge readiness, release readiness, production readiness, or a complete no-gap judgment.
- All applicable implementation and verification work is complete and evidence must be reconciled.

## Do not invoke when

- Work is still in discovery, implementation, or partial verification.
- The request asks only for a code check, diagnostic, draft, or one evidence scope.

## Authority boundary

This skill may reconcile independently produced evidence and issue the final canonical decision. It may not create missing proof, approve its own implementation, replace Product Manager or Product Owner approval, replace governance/CI/QA/security/release authorities, accept residual risk, or infer runtime truth from declarations.

## Read before

- `governance/contracts/decision-vocabulary.json`
- `governance/26_SDLC_TEAM_AND_STAGE_GATES.md`
- `governance/github/repository-enforcement.json`
- the applicable Product Truth contract;
- the applicable SDLC artifact and change-impact document;
- same-commit guard, test, runtime, QA, security, release, and production results.

## Required evidence model

Evaluate only applicable scopes:

1. Product Truth and functional acceptance.
2. Contract and architecture integrity.
3. Backend, data, generated-client, adapter/controller, and surface binding.
4. Governance-contract approval when governance is affected.
5. CI-workflow approval and immutable workflow checks when CI is affected.
6. Negative and cross-surface tests.
7. Runtime smoke tied to the same commit when runtime is claimed.
8. Visual flow evidence only when UI closure, release, store, or explicit visual acceptance applies.
9. Independent QA, security, release, and risk acceptance where required.
10. GitHub enforcement evidence, including distinct approver identities, required checks, and branch protection when high-risk closure is requested.

A pass in one scope never upgrades another scope. Prior evidence does not override a newer failure or a newer commit.

## GitHub enforcement rule

- Read `governance/github/repository-enforcement.json` as a conservative evidence snapshot, then verify it against live GitHub state when issuing closure.
- If `claims.highRiskClosureAllowed` is `false`, a high-risk journey cannot be `CLOSED_WITH_EVIDENCE`.
- If `claims.separationOfDutiesProven` is `false`, any journey requiring independent approval must return `NEEDS_EVIDENCE` or the applicable block decision.
- A single `CODEOWNERS` identity proves routing only; it never proves separation of duties.
- Unproven branch protection or required checks cannot be silently treated as pass.

## Forbidden

- `implemented` or `code check passed` as a synonym for closure.
- Closure with failed gates, missing evidence, open blockers, unresolved residual risk, or self-approval.
- Closure based on a merge ref, stale branch SHA, runtime map declaration, seed data, or documentation-only claim.
- Closure that contradicts the GitHub enforcement evidence state.
- Inventing collaborators, teams, branch protection, required checks, approvals, or workflow success.

## Required output

```text
resolved_commit_sha:
applicable_scopes:
passed_scopes:
failed_scopes:
missing_evidence:
required_approvals:
github_enforcement_state:
separation_of_duties:
open_blockers:
residual_risks:
decision:
```

Allowed decisions: `CLOSED_WITH_EVIDENCE`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `QA_BLOCK`, `SECURITY_BLOCK`, `RELEASE_BLOCK`, and `BLOCKED_EXTERNAL`.
