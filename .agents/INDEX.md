
# BThwani Agent Routing Index

Status: DERIVED_SUPPORT

Canonical sources:

- `AGENTS.md`
- `governance/skills/skills-registry.json`
- `governance/tools/agent-tool-registry.json`

Use this index only when routing is not already obvious. Normal focused work must not preload the full skill or tool layer.

## Active skill

- `bthwani-current-workspace-authority` — pin repository, branch, commit, and ref provenance for repository claims.

## Conditional skills

Load only when the trigger matches:

- `bthwani-universal-task-router` — task mode or risk is unclear.
- `bthwani-evidence-gate-router` — verification, readiness, closure, or evidence scope is requested.
- `bthwani-agent-skill-integrity` — agents, skills, registries, adapters, or routing change.
- `bthwani-api-runtime-binding` — API contract, generated client, route, or consumer binding changes.
- `bthwani-ci-workflow-guardian` — GitHub Actions or CI policy changes.
- `bthwani-cost-aware-subagent-orchestrator` — two or more independent bounded work units justify delegation.
- `bthwani-docker-journey-runtime` — Docker, persistence, startup, or live runtime proof.
- `bthwani-dsh-wlt-finance-boundary` — payment, wallet, ledger, settlement, payout, refund, commission, or reconciliation.
- `bthwani-final-journey-closure-judge` — explicit final multi-scope closure.
- `bthwani-governance-contract-guardian` — governance contracts, authorities, registries, guards, or SDLC control plane.
- `bthwani-guard-command-router` — registered guard or canonical command resolution.
- `bthwani-independent-implementation-reviewer` — protected independent implementation review.
- `bthwani-platform-runtime-config` — environment, provider, URL, port, CORS, or sensitive runtime configuration.
- `bthwani-product-truth-governor` — user-visible, role-sensitive, commercial, cross-surface, or workflow behavior.
- `bthwani-screen-flow-binding` — route, screen, state, action, or controller binding.
- `bthwani-security-secrets-privacy` — auth, authorization, sessions, secrets, PII, privacy, or isolation.
- `bthwani-service-fullstack-journey` — capability crossing contract, backend, data, shared state, and surfaces.
- `bthwani-sdlc-stage-gate-orchestrator` — formal G0-G10, release, production, or risk-acceptance routing.

## Conditional tools

Tool policies live under `.agents/tools/` and are loaded only after the tool is selected:

- `opencode-implementer` — serial bounded OpenCode/NVIDIA implementation under exactly one selected Codex or Claude orchestrator.
- `antigravity-implementer` — serial bounded Antigravity CLI (`agy`) implementation using an explicit Gemini model when that backend is explicitly selected.
- `graphify` — unresolved application-code relationships.
- `leanctx` — repeated reads or noisy output.
- `open-code-review` — bounded advisory diff, commit, or range review.

## Constraints

- Default delegated routes are `Codex → OpenCode/NVIDIA → Codex verification` and `Claude → OpenCode/NVIDIA → Claude verification` when the current authorized task selects OpenCode/NVIDIA.
- AGY/Gemini remains a conditional alternate backend only when a current authorized task explicitly selects it.
- Exactly one orchestrator and one backend own a work unit; no shared work unit or parallel delegation between Codex and Claude.
- The OpenCode relay uses the local OpenCode credential store, accepts no API-key argument, and fixes the approved NVIDIA worker/model mapping internally.
- Implementers own bounded edits only; the selected orchestrator owns diff review, re-pinning, developer verification, rework, commit, and push.
- Tools and adapters own no approval.
- Retired skills are never routed and have no live `SKILL.md`.
- The independent reviewer must not author, execute, or coordinate the reviewed change.
