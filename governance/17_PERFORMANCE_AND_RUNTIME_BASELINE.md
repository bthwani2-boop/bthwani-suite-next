# 17 — Performance & Runtime Baseline

Status: CANONICAL
Stage: PHASE-13_PERFORMANCE_AND_RUNTIME_BASELINE

## Purpose

Define the performance and runtime baseline policies that prevent the construction of resource-heavy backend services. These rules establish measurable criteria for runtime behavior, database operations, external providers, and system latency.

## Backend Rules

1. **Independent Runtimes**: Every service must execute as an isolated runtime container/process. Cross-service calls must navigate network-based API contracts.
2. **Mandatory Server Timeouts**: Every HTTP/RPC server must enforce strict read, write, and idle timeouts. Uncapped connections are forbidden.
3. **Context-Scoped Timeouts**: Every database query or external provider invocation must use a Go `context.Context` (or runtime equivalent) with a configured timeout.
4. **Health & Readiness Endpoints**: Every backend service must expose `/healthz` and `/readyz` endpoints.
5. **No Unbounded Goroutines**: Concurrent operations must be governed by bounded worker pools or explicit concurrency caps. Goroutines spawned without structural lifecycles are forbidden.
6. **Rate Limiting**: Rate limits must be applied at service entry boundaries to protect runtimes from resource exhaustion.
7. **Structured Logging**: All logs must be written in JSON structured format containing `timestamp`, `level`, `service`, `correlation_id`, and `actor_id`.

## Database Rules

1. **Mandatory Pagination**: Every list endpoint must implement cursor-based or limit-offset pagination. 
2. **Strict Limits**: List queries must enforce a strict default and maximum `limit` value to prevent scanning large sections of tables.
3. **Optimized Indexes**: Indexes must exist for every filter, sort, and foreign key column used in queries. Unindexed queries in production paths are forbidden.
4. **No N+1 Queries**: Database queries must retrieve required data in bulk (e.g., via joins or prefetching). Iterative subqueries are forbidden.
5. **Read Models**: Heavy read endpoints must query optimized read-only models (views or dedicated tables) instead of executing aggregate joins on live transaction tables.

## Provider Rules

1. **Request Timeouts**: All external provider HTTP requests must enforce a low request timeout.
2. **Limited Retries**: Retries must use exponential backoff and be limited to a maximum count (typically <= 3). Uncapped retry loops are forbidden.
3. **Message Queue for Slow Operations**: Any operation that takes longer than 1 second must be offloaded to an asynchronous background task queue.
4. **Idempotency Keys**: All mutating provider operations (such as payments or SMS sends) must transmit unique idempotency keys to prevent duplicate actions.
5. **Circuit Breakers**: External provider integrations must use circuit breakers to fail fast when the provider is degraded.
6. **Audit Logs**: All external request/response metadata (excluding PII and secrets) must be captured in secure audit logs.
7. **Provider Health checks**: Integration health must be monitored via periodic checks.
8. **Controlled Failover**: Backup provider failover paths must be planned and tested under simulation.

## Initial Performance Measurement Targets

These targets are measured and validated under load testing, not simply stated verbally:

| Metric | Target |
| --- | --- |
| p95 API Reads | < 300ms |
| p95 API Writes | < 700ms |
| DB Basic Query | < 100ms |
| CPU utilization (under load) | <= 70% |
| RAM Stability | Fixed footprint without leaks after a 30-minute test |
| Error Rate | < 1% |

## Acceptance Condition

This document is accepted only when:
- The performance and runtime baseline policies are registered as canonical.
- The `guard-manifest.json` registers the verification guard for these performance baselines.
- `machine-readable/architecture-map.json#performance_runtime_baseline` records the structured policy, targets, measurement status, and active operation contracts.
- `tools/guards/performance-runtime-baseline.mjs` validates that canonical JSON contract without depending on a retired CSV export.
- Policy validation and measured load performance remain separate: without a recorded load-test run, `measurement_status` must remain `NOT_MEASURED` and must not be reported as performance PASS.
