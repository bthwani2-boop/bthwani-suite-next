---
name: bthwani-governance-ci-guardian
version: 2026.07.17-v1
summary: Govern repository authority contracts, agents, skills, guards, stage gates, and verification-only GitHub Actions without owning implementation or final release approval.
---

# bthwani-governance-ci-guardian

## Purpose

Own the integrity of the repository governance control plane: authority precedence, decision vocabulary, logical-agent contracts, skill contracts, guard registration, SDLC gate wiring, and GitHub Actions policy. Keep CI verification-only, least-privileged, immutable-ref aware, fail-late, and free from source mutation or self-approval.

## Invoke when

- `AGENTS.md`, `GEMINI.md`, `.agents/**`, `governance/**`, `tools/guards/**`, `.github/actions/**`, or `.github/workflows/**` changes.
- A guard, gate, agent role, skill contract, decision term, workflow permission, trigger, action reference, or final aggregator changes.
- Governance closure or GitHub Actions correctness is claimed.

## Do not invoke when

- The task changes only application behavior and does not affect governance, guards, gates, agents, skills, or CI.
- A runtime, product, security, financial, or release decision is requested without governance-control-plane changes.

## Authority boundary

- `GOVERNANCE_CONTRACT_AUTHORITY` owns authority classification, agent/skill contracts, guard registration, decision vocabulary, and SDLC control-plane integrity.
- `CI_WORKFLOW_AUTHORITY` owns workflow triggers, permissions, immutable action pinning, checkout credential policy, verification-only behavior, fail-late topology, and final aggregation.
- These authorities must remain distinct from the engineering executor and from each other for final approval.
- This skill cannot approve product scope, application architecture, QA, security findings, release, production, finance, or SaaS activation.

## Required method

1. Pin the exact remote branch and commit SHA.
2. Read the authority registry before lower-precedence documents.
3. Classify the change as governance contract, agent/skill contract, guard/gate, workflow policy, or mixed.
4. Verify schemas and registries before prose claims.
5. Require every top-level guard source and package guard script to be registered exactly once.
6. Require critical workflows to cover the active remote branch, declare explicit least privileges, pin external actions to immutable SHAs, disable persisted checkout credentials, avoid source writes, and end in an `if: always()` aggregator.
7. Require fail-late reporting so independent failures are surfaced in one run without suppressing the final failure.
8. Require separate governance-contract and CI-workflow approvals when both domains change.
9. Run the targeted governance and workflow gates after the final write.
10. Map the result through the canonical decision vocabulary without claiming runtime or release closure.

## Forbidden behavior

- CI committing, pushing, merging, formatting, rewriting, or force-moving source.
- Mutable action tags, `@latest`, undocumented write permissions, or persisted checkout credentials in critical workflows.
- A tool adapter or executor granting itself governance, CI, QA, security, release, or final closure approval.
- A registered guard that is not executable, a guard script without a registry entry, or a critical workflow that omits the active branch.
- Treating workflow names, comments, generated reports, or prior-run evidence as proof for a newer commit.
- Activating or implementing SaaS from this skill.

## Required output

```text
repository_mode:
repository:
target_branch:
resolved_commit_sha:
governance_contract_changes:
ci_workflow_changes:
registered_guards:
workflow_policy_checks:
governance_authority_decision:
ci_authority_decision:
checks:
decision:
remaining_risks:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `BLOCKED_EXTERNAL`, and `PROTOCOL_VIOLATION`, interpreted through `governance/contracts/decision-vocabulary.json`.
