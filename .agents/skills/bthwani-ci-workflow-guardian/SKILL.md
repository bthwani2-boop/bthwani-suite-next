---
name: bthwani-ci-workflow-guardian
version: 2026.07.18-v1
summary: Validate GitHub Actions workflow policy, immutable references, least privilege, verification-only behavior, fail-late topology, and final aggregation without owning governance-contract approval.
---

# bthwani-ci-workflow-guardian

## Purpose

Own CI workflow policy only: triggers, branch and path coverage, permissions, immutable external action references, checkout credential policy, verification-only behavior, concurrency, fail-late reporting, and final result aggregation.

## Invoke when

- `.github/actions/**`, `.github/workflows/**`, workflow-related scripts, or CI policy changes.
- Workflow syntax, security, pinning, permissions, triggers, source mutation, or required aggregation is reviewed.
- CI workflow approval or same-commit workflow evidence is requested.

## Do not invoke when

- Only governance contracts, agents, skills, guards, or SDLC schemas change without CI impact.
- Only application runtime, product acceptance, QA, application security, finance, release, or production behavior changes without workflow-policy impact.

## Authority boundary

- `CI_WORKFLOW_AUTHORITY` owns CI workflow approval.
- This skill is separate from `GOVERNANCE_CONTRACT_AUTHORITY`, the engineering executor, and the final closure judge.
- It may verify and approve CI workflow policy only when the approver is independent from the change author and from the governance approver when both domains change.
- It cannot approve governance contracts, product acceptance, QA, application security, finance, release, production, residual risk, or SaaS commercial activation.

## Required method

1. Pin the exact remote branch and immutable commit.
2. Inventory every in-scope workflow and local action.
3. Require explicit least privilege, immutable external action SHAs, `persist-credentials: false`, and verification-only jobs.
4. Reject `git push`, `git commit`, source rewriting, auto-fix, write permissions, mutable action tags, or hidden failure swallowing.
5. Require critical workflows to cover the active branch and end in an `if: always()` result aggregator.
6. Run workflow syntax, workflow security, immutable pinning, and policy guards after the final write.
7. Treat configured workflows and passing static analyzers as CI-scope evidence only; actual same-commit workflow completion remains separate evidence.
8. Map the result through `governance/contracts/decision-vocabulary.json`.

## Forbidden behavior

- Implementing the reviewed workflow and approving it as the same identity.
- Granting governance-contract approval from this skill.
- Treating a workflow definition, prior run, stale SHA, or static analyzer pass as current workflow success.
- CI committing, pushing, merging, formatting, or modifying repository source.

## Required output

```text
repository_mode:
repository:
target_branch:
resolved_commit_sha:
ci_workflow_changes:
workflow_inventory:
workflow_policy_checks:
same_commit_runs:
checks:
ci_authority_decision:
decision:
remaining_risks:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `BLOCKED_EXTERNAL`, and `PROTOCOL_VIOLATION`.
