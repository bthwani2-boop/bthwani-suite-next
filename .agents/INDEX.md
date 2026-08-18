# BThwani Agent Routing Index

Status: DERIVED_SUPPORT

Use this index only when routing is not already obvious. Normal focused work should not preload every skill or tool.

## Skills

Load only when the trigger matches:

- `bthwani-current-workspace-authority` — pin repository, branch, commit, and ref provenance.
- `bthwani-universal-task-router` — task mode or risk is unclear.
- `bthwani-evidence-gate-router` — verification, readiness, closure, or evidence scope is unclear.
- `bthwani-api-runtime-binding` — API contract, generated client, route, or consumer binding changes.
- `bthwani-ci-workflow-guardian` — executable GitHub Actions or CI code changes.
- `bthwani-cost-aware-subagent-orchestrator` — independent bounded work units materially benefit from delegation.
- `bthwani-docker-journey-runtime` — Docker, persistence, startup, or live runtime proof.
- `bthwani-dsh-wlt-finance-boundary` — payment, wallet, ledger, settlement, payout, refund, commission, or reconciliation.
- `bthwani-final-journey-closure-judge` — explicit final multi-scope closure.
- `bthwani-independent-implementation-reviewer` — bounded independent implementation review when materially required.
- `bthwani-platform-runtime-config` — environment, provider, URL, port, CORS, or sensitive runtime configuration.
- `bthwani-product-truth-governor` — user-visible, role-sensitive, commercial, cross-surface, or workflow behavior.
- `bthwani-screen-flow-binding` — route, screen, state, action, or controller binding.
- `bthwani-security-secrets-privacy` — auth, authorization, sessions, secrets, PII, privacy, or isolation.
- `bthwani-service-fullstack-journey` — capability crossing contract, backend, data, shared state, and surfaces.

## Optional tools

Policies live directly under `.agents/tools/`:

- `opencode-implementer`
- `antigravity-implementer`
- `graphify`
- `leanctx`
- `open-code-review`

## Constraints

- Use the smallest materially sufficient skill/tool set.
- Do not introduce a registry or validation layer just to describe these files again.
- Verification guards/workflows exist only for executable code, contracts, data, runtime, security, and executable CI.
- Exactly one delegated backend owns a bounded work unit.
- Implementers own bounded edits; the selected orchestrator owns reconciliation, verification, commit, and push.
- Tools and adapters own no Product Truth or approval.
