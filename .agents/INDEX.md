# BThwani Agent Routing Index

Status: DERIVED_SUPPORT
Authority: `AGENTS.md` and `governance/authority/authority-precedence.json`

## Purpose

Route repository work to the smallest sufficient set of owner skills without duplicating their policies or overriding canonical governance.

## Execution tiers

| Tier | Use when | Default skills |
|---|---|---|
| Instant | isolated wording, explanation, or one-line safe fix | none |
| Focused | one module or one owner boundary | one owner skill |
| Standard | multi-file or cross-layer work | workspace authority + one owner skill |
| Escalated | product, finance, security, migration, CI, release, or formal closure | workspace authority + router + required owner skills + evidence routing |

LeanCTX is optional. Graphify is conditional. Neither is a mandatory first step.

## Mandatory routing

- Repository, branch, PR, remote state, or write → `bthwani-current-workspace-authority`.
- User-visible, role-sensitive, cross-surface, commercial, or workflow change → `bthwani-product-truth-governor`.
- API, route, generated client, or consumer binding → `bthwani-api-runtime-binding`.
- Route, screen, state, action, or controller binding → `bthwani-screen-flow-binding`.
- Cross-layer service capability → `bthwani-service-fullstack-journey`.
- DSH/WLT money boundary → `bthwani-dsh-wlt-finance-boundary`.
- Runtime behavior → `bthwani-docker-journey-runtime` or `bthwani-platform-runtime-config` as applicable.
- Security, privacy, auth, or secrets → `bthwani-security-secrets-privacy`.
- Formal G0–G9 control → `bthwani-sdlc-stage-gate-orchestrator`.
- Final multi-dimensional closure → `bthwani-final-journey-closure-judge`.
- Two or more independent bounded work units with real subagent capability → `bthwani-cost-aware-subagent-orchestrator`.
- Skill or agent registry changes → `bthwani-agent-skill-integrity`.
- Guard selection → `bthwani-guard-command-router`.
- Ownership, routing, duplication, or dead-code ambiguity → `graphify`.

## Product routing order

For applicable capabilities:

```text
Problem and evidence
→ actors and role boundaries
→ required/excluded surfaces
→ outcome and acceptance
→ Product Manager approval
→ Product Owner approval
→ architecture and contracts
→ implementation
→ product acceptance
→ independent QA/security/release as applicable
```

Implementation skills may not bypass Product Truth approval.

## Skill ownership rules

- Load only skills required by the current task.
- Owner skills govern only their declared authority domain.
- Coordinator skills orchestrate but do not duplicate specialist policy.
- Adapters do not own approval.
- A skill dependency must be registered in `governance/skills/skills-registry.json`.
- Final decisions map through `governance/contracts/decision-vocabulary.json`.

## Active owner skills

### Authority and routing

- `bthwani-current-workspace-authority`
- `bthwani-universal-task-router`
- `bthwani-evidence-gate-router`
- `bthwani-guard-command-router`
- `bthwani-cost-aware-subagent-orchestrator`

### Product and journey

- `bthwani-product-truth-governor`
- `bthwani-screen-flow-binding`
- `bthwani-service-fullstack-journey`
- `bthwani-api-runtime-binding`

### Risk and closure

- `bthwani-dsh-wlt-finance-boundary`
- `bthwani-security-secrets-privacy`
- `bthwani-docker-journey-runtime`
- `bthwani-platform-runtime-config`
- `bthwani-sdlc-stage-gate-orchestrator`
- `bthwani-final-journey-closure-judge`

### Foundation and maintenance

- `bthwani-foundation-execution`
- `bthwani-agent-skill-integrity`
- `bthwani-clean-code-guard`
- `bthwani-machine-readable-matrix-governor`
- `bthwani-legacy-extraction`
- `bthwani-patch-review-evidence`
- `bthwani-agent-handoff-evidence-pack` — explicit request only
- `external-agent-donor-reference` — agent-system design only

### UI

- `bthwani-ui-kit-design-lock`
- `bthwani-frontend-design-excellence`
- `bthwani-premium-visual-design-surgeon`

### Tools

- `graphify`
- `nx-workspace`
- `nx-run-tasks`
- `nx-import`
- `nx-plugins`
- `nx-generate`

## Acceptance condition

Accepted only when routing is consistent with AGENTS.md, Product Truth precedes implementation where applicable, all skill dependencies resolve, optional tools remain optional, and no adapter or executor is allowed to self-grant formal approval.
