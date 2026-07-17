---
name: bthwani-governance-contract-guardian
version: 2026.07.18-v1
summary: Validate repository governance contracts, authority precedence, agents, skills, guards, and SDLC control-plane integrity without implementing or self-approving reviewed changes.
---

# bthwani-governance-contract-guardian

## Purpose

Own governance-contract integrity only: authority precedence, canonical decision vocabulary, agent and skill contracts, guard registration semantics, Product Truth governance, SaaS governance contracts, and SDLC control-plane structure.

## Invoke when

- `AGENTS.md`, `.agents/**`, `governance/**`, or `tools/guards/**` changes.
- Authority, decision, role, skill, guard, gate, Product Truth, SaaS governance, or SDLC contracts change.
- Governance-contract approval or governance evidence is requested.

## Do not invoke when

- Only GitHub Actions workflow topology or action configuration changes.
- Only application, runtime, product acceptance, QA, security, finance, release, or production behavior changes without governance-contract impact.

## Authority boundary

- `GOVERNANCE_CONTRACT_AUTHORITY` owns governance-contract approval.
- This skill is separate from `CI_WORKFLOW_AUTHORITY`, the engineering executor, and the final closure judge.
- It may verify and approve governance contracts only when the approver is independent from the change author.
- It cannot approve CI workflow policy, product acceptance, QA, application security, finance, release, production, residual risk, or SaaS commercial activation.

## Required method

1. Pin the exact remote branch and immutable commit.
2. Read `governance/authority/authority-precedence.json` before lower-precedence documents.
3. Validate machine-readable schemas and registries before prose claims.
4. Reconcile agent roles, skill lifecycle, authority domains, guard registration, SDLC roles, and canonical decisions.
5. Reject self-approval, duplicate approval ownership, adapter approval, executor approval, or mixed governance/CI approval identity.
6. Run the registered governance contract guards after the final write.
7. Map the result through `governance/contracts/decision-vocabulary.json`.

## Forbidden behavior

- Implementing the reviewed governance change and approving it as the same identity.
- Treating a static governance pass as runtime, QA, security, release, production, SaaS, or final closure evidence.
- Creating policy in an adapter, derived support file, workflow name, comment, or generated diagnostic.
- Granting CI workflow approval from this skill.

## Required output

```text
repository_mode:
repository:
target_branch:
resolved_commit_sha:
governance_contract_changes:
authority_reconciliation:
registry_reconciliation:
sdlc_reconciliation:
checks:
governance_authority_decision:
decision:
remaining_risks:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `BLOCKED_EXTERNAL`, and `PROTOCOL_VIOLATION`.
