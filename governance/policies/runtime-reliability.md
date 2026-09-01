# Runtime, Configuration, Reliability, Observability, and Recovery Policy

Status: ACTIVE_CANONICAL

## Runtime truth

A runtime claim requires evidence from the intended candidate/artifact/process/schema/configuration/profile/endpoint and readback sufficient to exclude stale execution. A configured endpoint, `enabled=true`, green build or container start is not proof that the governed dependency/journey works.

## Configuration ownership

Distinguish canonical configuration schema/meaning from environment-scoped values. Each material setting has one owner, type/validation, requiredness, security classification and failure behavior.

Required invalid/missing security-, finance- or correctness-critical configuration fails closed. Local/staging/production may differ in endpoints, credentials, scale and provider accounts, but must not silently redefine core Product/authorization/financial/state-machine semantics.

No hidden localhost/dev/legacy fallback may activate in production. Secrets never live in client-visible config, source or logs.

## Startup, health, and readiness

Startup validates required configuration and critical dependency assumptions at the earliest safe boundary. Health/readiness signals must represent what their consumers believe they mean; do not report ready/healthy while a required dependency/path is known unusable.

Distinguish liveness, readiness, dependency/provider health and business-journey health instead of collapsing them into one fake-green signal.

## Providers and external systems

Each integration defines canonical owner, authentication/service identity, request/response contract, timeout, retry/idempotency, rate/quota handling, error normalization, unknown-result behavior, observability, reconciliation/recovery and secret boundary.

Provider-specific payloads terminate at their adapter/boundary. Provider identity must not leak throughout business logic or decide internal financial/domain authority.

An ambiguous external mutation result is reconciled before another route/provider may move the same governed effect again.

## Timeouts, retries, backpressure, and failure

Retries must be bounded, idempotency-aware and consistent with the operation's semantics. Define timeout/retry budgets, cancellation and backoff only where material; do not layer retries at multiple levels without understanding amplification.

For queues/jobs/events/providers, address duplicate delivery, ordering where required, poison/failure handling, restart/replay, backpressure and observable stuck work. `event published` is not proof of consumed business outcome when readback/handoff is required.

## Observability

Material failure modes require the smallest telemetry that lets a real consumer detect/diagnose/recover: truthful health/readiness, structured logs, metrics, traces/correlation, queue/job/reconciliation signals and release identity as applicable.

Telemetry requires a decision/operational consumer; instrumentation without purpose is not quality. Evidence/logging must minimize secrets and sensitive/PII payloads.

## Performance and capacity

For material hot paths/bounded resources inspect latency, throughput/capacity, error behavior, CPU/memory, pools/connections, queues/caches, query plans/N+1, payload/pagination, provider quotas and contention. Optimize measured/proven roots, not speculative micro-optimizations.

Do not invent SLO/SLI thresholds. If safe operation requires a performance/reliability contract and none exists, that absence is a governance/operations decision gap.

## Recovery, restart, and disaster resilience

When material prove behavior across process restart, partial failure, dependency outage, migration/backfill interruption and external unknown results. Durable state requires an applicable restore/rebuild/reconciliation path; backup existence alone does not prove recoverability.

Rollback and forward recovery are distinct, especially with data/schema changes and public mobile clients. Recovery must preserve canonical ownership and must not re-enable obsolete/shadow writers.

## Clean-state reproducibility

The system must be reproducible from canonical source plus declared toolchain/dependencies/configuration/generation/migrations, without undocumented machine edits, hidden packages, manually patched databases or stale local artifacts. Local conveniences remain explicitly local.

## Closure

Runtime/reliability closure requires truthful startup/readiness, validated config ownership, bounded provider/failure semantics, required observability, recovered/reconcilable failure paths, no hidden fallback/shadow runtime authority and same-candidate evidence for the claims made.
