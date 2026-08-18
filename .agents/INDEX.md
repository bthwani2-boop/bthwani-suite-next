# BThwani Agent Routing Index

Status: DERIVED_SUPPORT

Canonical inputs:

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
- `bthwani-api-runtime-binding` — API contract, generated client, route, or consumer binding changes.
- `bthwani-ci-workflow-guardian` — executable GitHub Actions or CI code changes.
- `bthwani-cost-aware-subagent-orchestrator` — two or more independent bounded work units justify delegation.
- `bthwani-docker-journey-runtime` — Docker, persistence, startup, or live runtime proof.
- `bthwani-dsh-wlt-finance-boundary` — payment, wallet, ledger, settlement, payout, refund, commission, or reconciliation.
- `bthwani-final-journey-closure-judge` — explicit final multi-scope closure.
- `bthwani-independent-implementation-reviewer` — bounded independent implementation review when materially required.
- `bthwani-platform-runtime-config` — environment, provider, URL, port, CORS, or sensitive runtime configuration.
- `bthwani-product-truth-governor` — user-visible, role-sensitive, commercial, cross-surface, or workflow behavior.
- `bthwani-screen-flow-binding` — route, screen, state, action, or controller binding.
- `bthwani-security-secrets-privacy` — auth, authorization, sessions, secrets, PII, privacy, or isolation.
- `bthwani-service-fullstack-journey` — capability crossing contract, backend, data, shared state, and surfaces.

## Conditional tools

Tool policies live under `.agents/tools/` and are loaded only after the tool is selected:

- `opencode-implementer` — bounded OpenCode/NVIDIA implementation under one selected orchestrator.
- `antigravity-implementer` — bounded Antigravity/Gemini implementation when explicitly selected.
- `graphify` — unresolved application-code relationships.
- `leanctx` — repeated reads or noisy output.
- `open-code-review` — bounded advisory diff, commit, or range review.

## Constraints

- Use the smallest materially sufficient skill/tool set.
- Do not introduce a guard, workflow, registry, or validation layer merely to police governance text.
- Verification guards and workflows exist for executable code, contracts, data, runtime, security, and executable CI only.
- Exactly one delegated backend owns a bounded work unit.
- Implementers own bounded edits; the selected orchestrator owns reconciliation, verification, commit, and push.
- Tools and adapters own no Product Truth or approval.
