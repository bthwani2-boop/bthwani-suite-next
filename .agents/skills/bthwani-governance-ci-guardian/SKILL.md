---
name: bthwani-governance-ci-guardian
summary: Retired mixed-authority skill retained only as a migration reference.
---

# bthwani-governance-ci-guardian

Status: RETIRED

This mixed governance-and-CI owner contract is retired because governance-contract approval and CI-workflow approval must remain separate authorities, separate skills, and separate approving identities.

Use:

- `bthwani-governance-contract-guardian` for governance contracts, agents, skills, guards, SaaS governance, and SDLC control-plane integrity.
- `bthwani-ci-workflow-guardian` for GitHub Actions triggers, permissions, immutable pins, verification-only behavior, fail-late topology, and result aggregation.

This file owns no authority, approval, routing, dependency, or closure decision.
