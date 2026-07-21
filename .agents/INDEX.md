# BThwani Agent Routing Index

Status: DERIVED_SUPPORT
Authority: `AGENTS.md`, `governance/authority/authority-precedence.json`, and `governance/skills/skills-registry.json`

## Purpose

Route repository work to the smallest sufficient set of active or conditional governed skills without duplicating policy, treating tools as authorities, or reviving retired legacy skills.

## Execution tiers

| Tier | Use when | Default routing |
|---|---|---|
| Instant | isolated wording, explanation, or one-line safe fix | no owner skill unless repository truth is claimed |
| Focused | one module or one owner boundary | workspace authority plus one applicable owner skill |
| Standard | multi-file or cross-layer work | workspace authority, task router, applicable owner skills, targeted evidence |
| Escalated | product, finance, security, tenant isolation, governance, CI, SaaS activation, migration, release, or formal closure | formal authorities, SDLC routing, independent evidence |

LeanCTX, Graphify, and Nx are optional tools. They are never mandatory first steps and never own approval.

## Mandatory routing

- Repository, branch, commit, PR, remote state, or write → `bthwani-current-workspace-authority`.
- Task mode, risk, ownership, or scope ambiguity → `bthwani-universal-task-router`.
- Evidence-scope selection → `bthwani-evidence-gate-router`.
- Agent, skill, adapter, registry, or routing changes → `bthwani-agent-skill-integrity`.
- Guard selection or command resolution → `bthwani-guard-command-router`.
- Governance contracts, authority, agents, skills, guards, SaaS governance, or SDLC control-plane changes → `bthwani-governance-contract-guardian`.
- GitHub Actions workflows, local actions, workflow permissions, immutable pins, or CI aggregation changes → `bthwani-ci-workflow-guardian`.
- Protected G4 implementation verification → `bthwani-independent-implementation-reviewer`.
- User-visible, role-sensitive, cross-surface, commercial, or workflow changes → `bthwani-product-truth-governor`.
- API, route, generated client, or consumer binding → `bthwani-api-runtime-binding`.
- Route, screen, state, action, or controller binding → `bthwani-screen-flow-binding`.
- Cross-layer service capability → `bthwani-service-fullstack-journey`.
- DSH/WLT financial truth or handoff → `bthwani-dsh-wlt-finance-boundary`.
- Runtime configuration or provider posture → `bthwani-platform-runtime-config`.
- Docker, data-plane, persistence, or live behavior evidence → `bthwani-docker-journey-runtime`.
- Auth, authorization, sessions, secrets, PII, privacy, tenant isolation, CORS, or sensitive configuration → `bthwani-security-secrets-privacy`.
- Formal G0–G10 lifecycle control → `bthwani-sdlc-stage-gate-orchestrator`.
- Final multi-scope closure → `bthwani-final-journey-closure-judge`.
- Two or more independent bounded work units with real subagent capability → `bthwani-cost-aware-subagent-orchestrator`.

Governance-contract and CI-workflow approvals are separate. When both domains change, both skills apply and the approving identities must differ. Independent implementation review must also remain separate from the author, executor, and coordinator.

## Product routing order

```text
Problem and evidence
→ actors and role boundaries
→ required and excluded surfaces
→ observable outcome and acceptance
→ Product Manager approval
→ Product Owner implementation-readiness approval
→ architecture and contracts
→ implementation and developer verification
→ independent G4 implementation review
→ product acceptance
→ independent governance, CI, QA, security, finance, isolation, release, risk, and production evidence as applicable
```

Implementation skills may not bypass Product Truth, independent review, or formal authorities.

## Governed skills

### Always active

- `bthwani-current-workspace-authority`
- `bthwani-universal-task-router`
- `bthwani-evidence-gate-router`

### Conditional owner and routing skills

- `bthwani-agent-skill-integrity`
- `bthwani-guard-command-router`
- `bthwani-governance-contract-guardian`
- `bthwani-ci-workflow-guardian`
- `bthwani-independent-implementation-reviewer`
- `bthwani-product-truth-governor`
- `bthwani-api-runtime-binding`
- `bthwani-screen-flow-binding`
- `bthwani-service-fullstack-journey`
- `bthwani-dsh-wlt-finance-boundary`
- `bthwani-platform-runtime-config`
- `bthwani-docker-journey-runtime`
- `bthwani-security-secrets-privacy`
- `bthwani-sdlc-stage-gate-orchestrator`
- `bthwani-final-journey-closure-judge`
- `bthwani-cost-aware-subagent-orchestrator`

## Retired skills

The canonical retired set exists only in `governance/skills/skills-registry.json`. Retired skills:

- may remain as historical/reference files;
- may not be selected by routing;
- may not own authority or approval;
- may not be dependencies of active or conditional skills;
- may not be described as active, default, mandatory, or current truth.

The mixed `bthwani-governance-ci-guardian` skill is retired and must never be routed.

## Tool ladder

1. Direct scoped repository inspection.
2. Existing targeted search, script, or registered guard.
3. Small idempotent helper for a repeated narrow pattern.
4. LeanCTX only when active and materially more efficient.
5. Graphify only for unclear ownership, routing, dependency, duplication, or dead-code relationships.
6. Nx affected only when workspace impact calculation is required.
7. Runtime tools only when runtime behavior is changed or claimed.

## Skill ownership rules

- Load only the active or conditional governed skills required by the task.
- Owner skills govern only their declared authority domain.
- Coordinators orchestrate but do not execute implementation work or duplicate specialist policy.
- The independent reviewer reviews but does not coordinate or implement the reviewed work.
- Adapters and tools own no approval.
- Every dependency must resolve to an active or conditional governed skill.
- Every decision maps through `governance/contracts/decision-vocabulary.json`.
- A scoped `PASS` cannot be upgraded to `CLOSED_WITH_EVIDENCE`.

## Acceptance condition

Accepted only when routing matches the skill registry, all selected skills are governed and non-retired, Product Truth precedes implementation where applicable, G0–G10 terminology is consistent, optional tools remain optional, dependencies resolve without cycles, governance and CI approval remain separate, G4 review is independent from coordination and implementation, the strongest supervisor stays advisory, and no adapter, tool, executor, retired skill, coordinator, or reviewer can self-grant another authority's approval.
