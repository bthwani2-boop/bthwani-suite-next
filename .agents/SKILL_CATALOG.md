
# BThwani Skill Catalog

Version: 2026.08.06-v4
Status: DERIVED_SUPPORT

Canonical source: `governance/skills/skills-registry.json`.
This catalog is checked for exact membership and status drift.

## Active skills

- `bthwani-current-workspace-authority` — repository and immutable ref resolution.

## Conditional skills

- `bthwani-agent-skill-integrity` — agent, skill, registry, adapter, and routing integrity.
- `bthwani-api-runtime-binding` — API contract-to-runtime binding.
- `bthwani-ci-workflow-guardian` — CI workflow policy and aggregation.
- `bthwani-cost-aware-subagent-orchestrator` — bounded multi-agent coordination.
- `bthwani-docker-journey-runtime` — Docker and data-plane runtime evidence.
- `bthwani-dsh-wlt-finance-boundary` — WLT financial truth and DSH/WLT handoffs.
- `bthwani-evidence-gate-router` — evidence-scope routing.
- `bthwani-final-journey-closure-judge` — final same-commit multi-scope closure.
- `bthwani-governance-contract-guardian` — governance-contract integrity.
- `bthwani-guard-command-router` — registered guard and command resolution.
- `bthwani-independent-implementation-reviewer` — protected implementation review.
- `bthwani-platform-runtime-config` — runtime configuration ownership.
- `bthwani-product-truth-governor` — product problem, scope, and acceptance.
- `bthwani-screen-flow-binding` — screen and controller binding.
- `bthwani-sdlc-stage-gate-orchestrator` — formal G0-G10 routing.
- `bthwani-security-secrets-privacy` — security, privacy, secrets, and isolation routing.
- `bthwani-service-fullstack-journey` — full-stack multi-surface journey verification.
- `bthwani-universal-task-router` — task-mode and risk routing.

## Retired entries

- `graphify` — retired as a skill; Graphify is a conditional tool documented under `.agents/tools/graphify.md`.
- `open-code-review-delegate` — retired as a skill; OpenCodeReview is a conditional tool documented under `.agents/tools/open-code-review.md`.

## Catalog rule

- Active and conditional entries require one live `.agents/skills/<id>/SKILL.md`.
- Retired entries are lifecycle records only and must not retain live skill directories.
- Tool policies belong under `.agents/tools/`, not `.agents/skills/`.
