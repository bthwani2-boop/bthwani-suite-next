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

- `antigravity-implementer`
- `graphify`
- `leanctx`
- `open-code-review`

## Constraints

- Use the smallest materially sufficient skill/tool set.
- Do not introduce a registry, validation layer, or routing metadata layer just to describe these files again.
- Prefer compiler, typecheck, lint, tests, builds, database/runtime checks, contract tooling, and security tools directly.
- Keep custom guards or workflows only when they add unique executable assurance that cannot be obtained more simply.
- Parallel read-only investigation is allowed when useful.
- At most one writer may modify an overlapping work unit at a time.
- When delegation is used, use one integration/push owner for the combined result.
- Implementers own only their bounded edits; tools and adapters own no Product Truth or approval.
