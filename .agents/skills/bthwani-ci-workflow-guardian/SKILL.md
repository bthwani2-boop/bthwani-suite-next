---
name: bthwani-ci-workflow-guardian
version: 2026.08.18-v2
summary: Verify executable GitHub Actions and CI code for syntax, security, immutable references, least privilege, routing, and fail-closed results.
---

# bthwani-ci-workflow-guardian

## Purpose

Review executable CI code only: triggers, path routing, permissions, immutable external action references, checkout credentials, concurrency, source immutability, failure propagation, and final result aggregation.

## Invoke when

- `.github/actions/**`, `.github/workflows/**`, or executable CI scripts change.
- Workflow syntax, security, pinning, permissions, triggers, source mutation, duplicate work, or aggregation is affected.

## Do not invoke when

- No executable CI code is affected.
- A change touches only governance prose, agent instructions, or documentation.

## Required method

1. Pin the exact branch and candidate SHA.
2. Inspect only affected workflows/actions plus shared dependencies they actually use.
3. Require least privilege, immutable action SHAs, and `persist-credentials: false` where checkout credentials are unnecessary.
4. Reject hidden source mutation, failure swallowing, redundant duplicate jobs, and unconditional expensive work without material scope.
5. Use `guard:workflow-lint`, `guard:workflow-security`, and `guard:actions-pin` when applicable.
6. For behavior claims, use actual same-candidate workflow results rather than configuration alone.
7. Report the smallest evidence-backed result; do not invent approval or closure semantics.

## Forbidden

- Creating a governance-validation workflow.
- Reintroducing guard/workflow registries or SDLC stage machinery.
- Treating static workflow lint as proof that jobs executed successfully.
- CI committing, pushing, merging, formatting, or rewriting repository source.

## Required output

```text
resolved_commit_sha:
affected_ci_code:
checks:
same_candidate_runs:
findings:
decision:
remaining_risks:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, and `BLOCKED_EXTERNAL`.
