# 17 — Performance and Runtime Baseline

Status: ACTIVE_CANONICAL

## Purpose

Define performance and runtime design constraints while keeping configuration, static policy validation, measured benchmarks, release approval, and production evidence separate.

## Backend rules

1. Service boundaries remain explicit; cross-service calls use declared contracts.
2. HTTP and RPC servers configure bounded read, write, idle, and shutdown timeouts.
3. Database and external-provider work uses cancellation and configured deadlines.
4. Applicable backend services expose health and readiness signals.
5. Concurrent work uses bounded lifecycles, queues, pools, or explicit caps.
6. Entry boundaries apply appropriate rate, payload, and resource controls.
7. Structured logs contain the required operational context without leaking secrets or unnecessary PII.

## Database rules

1. List operations implement bounded pagination.
2. Query limits have explicit defaults and maximums.
3. Indexes support material filters, sorts, joins, ownership checks, and foreign keys.
4. Production paths avoid unbounded N+1 query patterns.
5. Heavy reads use justified read models, precomputation, or bounded queries.
6. Database performance claims require measured plans or benchmarks, not schema declarations alone.

## Provider rules

1. Provider requests use explicit timeouts.
2. Retries are bounded, use backoff, and respect idempotency.
3. Slow or deferred work uses an owned asynchronous mechanism when required by the journey.
4. Mutating provider operations use idempotency and replay protection where applicable.
5. Degraded providers fail through governed circuit-breaker or fail-closed behavior.
6. Audit metadata excludes secrets and unnecessary PII.
7. Health and failover posture is observable and tested before a readiness claim.

## Measurement targets

Initial target budgets may include:

| Metric | Target |
|---|---:|
| p95 API reads | `< 300 ms` |
| p95 API writes | `< 700 ms` |
| basic database query | `< 100 ms` |
| CPU under declared load | `<= 70%` |
| memory stability | no sustained leak during the declared duration |
| error rate | `< 1%` |

Targets are policy budgets, not measured results.

## Evidence boundary

- `guard:performance-budget` proves budget configuration only.
- Static source inspection may prove selected timeout, limit, or ownership patterns only.
- Measured claims require a versioned benchmark tied to the immutable commit, environment, dataset, workload, duration, concurrency, tool version, and raw result.
- Release and production performance require their own applicable evidence and approvals.
- Without a benchmark, measurement state is `NOT_MEASURED`; do not report performance `PASS` beyond configuration or static scope.

## Acceptance condition

Accepted only when performance policies are registered, affected code obeys applicable static constraints, budget configuration is valid, measured results are clearly separated from declarations, regressions remain fail-closed for their scope, and no benchmark, release, or production claim is made without same-commit evidence.
