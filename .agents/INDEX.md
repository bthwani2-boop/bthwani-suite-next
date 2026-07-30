# BThwani Agent Routing Index

Status: DERIVED_SUPPORT

Canonical source: `governance/skills/skills-registry.json`.

Use this index only when the task requires a governed skill. Normal focused code work does not require loading the whole skill layer.

## Always active for repository claims

- `bthwani-current-workspace-authority` — pin repository, branch, and commit.
- `bthwani-universal-task-router` — classify mode and risk when scope is not already obvious.
- `bthwani-evidence-gate-router` — select evidence only when a verification or closure claim is requested.

## Conditional skills

Load only the skill whose trigger matches the changed scope:

- `bthwani-agent-skill-integrity` — agents, adapters, skills, or routing contracts.
- `bthwani-api-runtime-binding` — OpenAPI, route, generated client, or API consumer.
- `bthwani-cost-aware-subagent-orchestrator` — two or more independent bounded work units.
- `bthwani-docker-journey-runtime` — Docker, persistence, startup, or live runtime proof.
- `bthwani-dsh-wlt-finance-boundary` — payment, wallet, ledger, settlement, payout, refund, or commission.
- `bthwani-final-journey-closure-judge` — explicitly requested final multi-scope closure.
- `bthwani-governance-contract-guardian` — governance contracts, authorities, registries, guards, or SDLC control plane.
- `bthwani-ci-workflow-guardian` — GitHub Actions, workflow permissions, action pins, or CI aggregation.
- `bthwani-guard-command-router` — resolving a required registered guard or canonical command.
- `bthwani-independent-implementation-reviewer` — protected independent implementation review.
- `bthwani-platform-runtime-config` — environment, provider, URL, port, CORS, or sensitive runtime configuration.
- `bthwani-product-truth-governor` — user-visible, role-sensitive, cross-surface, commercial, or workflow behavior.
- `bthwani-screen-flow-binding` — route, screen, state, action, or controller binding.
- `bthwani-security-secrets-privacy` — auth, authorization, sessions, secrets, PII, privacy, or isolation.
- `bthwani-service-fullstack-journey` — capability crossing contract, backend, data, shared state, and surfaces.
- `bthwani-sdlc-stage-gate-orchestrator` — formal G0-G10, release, production, or risk-acceptance routing.

## Routing constraints

- Load no more than the smallest sufficient set of skills.
- Tools and adapters own no approval.
- Governance and CI approvals remain separate.
- The independent reviewer must not author, execute, or coordinate the reviewed change.
- Retired skills are never routed; Git history is the archive.
- Graphify, LeanCTX, Nx, and runtime tooling are optional and evidence-driven.
