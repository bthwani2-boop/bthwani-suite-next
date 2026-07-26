# BThwani Skill Catalog

Version: 2026.07.26-v2

This catalog is a human-readable projection of `governance/skills/skills-registry.json`. The registry is the canonical source. If this file conflicts with the registry, the registry wins.

## Active skills (always-on routing)

- `bthwani-current-workspace-authority` — Pin repository mode, remote branch, immutable commit, and allowed scope before any repository claim or write.
- `bthwani-universal-task-router` — Classify repository tasks by canonical mode, risk, authority, skills, tools, scope, and permissible evidence claims.
- `bthwani-evidence-gate-router` — Select the smallest sufficient canonical evidence scopes and checks without granting approval or closure.

## Conditional skills (invoke only when their trigger applies)

- `bthwani-agent-skill-integrity` — Reconcile active governed skills, retired legacy references, agent roles, adapters, and routing without inventing authority.
- `bthwani-api-runtime-binding` — Verify the contract-to-runtime binding chain without owning product scope or final closure.
- `bthwani-ci-workflow-guardian` — Validate GitHub Actions policy, immutable refs, least privilege, verification-only behavior, and final aggregation.
- `bthwani-cost-aware-subagent-orchestrator` — Coordinate product-aware hierarchical subagents with non-overlapping ownership, minimum sufficient context, independent review, and deterministic merge.
- `bthwani-docker-journey-runtime` — Route Docker and data-plane changes to bounded same-commit runtime evidence without upgrading static checks.
- `bthwani-dsh-wlt-finance-boundary` — Protect WLT financial truth; require explicit evidence for every DSH/WLT financial handoff.
- `bthwani-final-journey-closure-judge` — Judge final closure only from same-commit, all-applicable-scope, independently approved evidence.
- `bthwani-governance-contract-guardian` — Validate governance contracts, authority precedence, agents, skills, guards, and SDLC control-plane integrity without self-approving.
- `bthwani-guard-command-router` — Resolve required verification to registered guards, canonical commands, and declared assurance boundaries.
- `bthwani-independent-implementation-reviewer` — Independently review implementation scope, code, developer evidence, and protected-change separation without coordinating or implementing the reviewed work.
- `bthwani-platform-runtime-config` — Govern environment, provider, service-slot, base-URL, CORS, and sensitive runtime configuration ownership.
- `bthwani-product-truth-governor` — Define and validate product problems, actors, surfaces, invariants, acceptance, and outcome evidence before implementation and before QA.
- `bthwani-screen-flow-binding` — Verify route, screen, state, action, and controller binding for declared product surfaces.
- `bthwani-sdlc-stage-gate-orchestrator` — Route governed changes through G0-G10 and final closure without owning specialist approval.
- `bthwani-security-secrets-privacy` — Route auth, authorization, secrets, PII, sensitive logs, and privacy findings to independent security evidence.
- `bthwani-service-fullstack-journey` — Verify a declared capability across product, contract, backend, data, shared state, and required surfaces.

## Retired entries (must never be routed)

- `graphify` — Graphify is a conditional tool, not an owner skill or approval authority. Its `SKILL.md` remains only as the governed tool documentation referenced by `CLAUDE.md` and `.agents/GRAPHIFY.md`.

All other previously retired skill directories were moved to `.agents/archive/skills/` (archived, not destroyed): superseded legacy skills own no authority and had no live references, and dead references must not accumulate inside the active contract. Archiving a skill requires proof that no active file references it; the registry, this catalog, routing, guards, and scripts must be updated in the same change. See `.agents/archive/README.md`.

## Catalog rule

Every folder under `.agents/skills/*` must contain exactly one `SKILL.md`, must be registered in `governance/skills/skills-registry.json`, and must appear in this catalog under its registry status.

Every skill must remain task-specific. Global rules belong in `AGENTS.md`, `.agents/AUTHORITY_BOUNDARY.md`, and `.agents/EVIDENCE_GATE_ROUTER.md`.
