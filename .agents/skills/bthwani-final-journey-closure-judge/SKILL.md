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

This skill may reconcile independently produced evidence and issue the final canonical decision. It may not create missing proof, approve its own implementation, replace Product Manager or Product Owner approval, replace QA/security/release authorities, accept residual risk, or infer runtime truth from declarations.

## Required evidence model

Evaluate only applicable scopes:

1. Product Truth and functional acceptance.
2. Contract and architecture integrity.
3. Backend, data, generated-client, adapter/controller, and surface binding.
4. Negative and cross-surface tests.
5. Runtime smoke tied to the same commit when runtime is claimed.
6. Visual flow evidence only when UI closure, release, store, or explicit visual acceptance applies.
7. Independent QA, security, release, and risk acceptance where required.
8. CI results for the same immutable commit when CI is configured and applicable.

A pass in one scope never upgrades another scope. Prior evidence does not override a newer failure or a newer commit.

## Forbidden

- `implemented` or `code check passed` as a synonym for closure.
- Closure with failed gates, missing evidence, open blockers, unresolved residual risk, or self-approval.
- Closure based on a merge ref, stale branch SHA, runtime map declaration, seed data, or documentation-only claim.

## Required output

```text
resolved_commit_sha:
applicable_scopes:
passed_scopes:
failed_scopes:
missing_evidence:
required_approvals:
separation_of_duties:
open_blockers:
residual_risks:
decision:
```

Allowed decisions: `CLOSED_WITH_EVIDENCE`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `QA_BLOCK`, `SECURITY_BLOCK`, `RELEASE_BLOCK`, and `BLOCKED_EXTERNAL`.
