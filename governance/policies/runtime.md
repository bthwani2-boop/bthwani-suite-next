# Runtime and Toolchain Policy

Status: ACTIVE_CANONICAL

`infra/docker` owns composition, networks, volumes, profiles, health checks, and
resource limits. `infra/data-plane` owns shared data provisioning. A compose
declaration does not prove execution.

Runtime commands are deterministic, idempotent, fail on the first causal error,
and expose up, status, smoke, and down. They do not hide failures with unbounded
retry or convert fixture success into live evidence. Runtime proof includes
startup, readiness, migrations, actor requests, failure behavior, and persistence
readback on the same commit.

Operative versions come from package manifests, lockfiles, Go modules, container
references, and workflow setup. They must agree, use bounded versions or immutable
digests, and change together. GitHub Actions use immutable SHAs.

Backends use bounded timeouts, cancellation, pagination, payload limits, pools,
and resource controls. Provider retries are bounded, back off, and preserve
idempotency. Performance claims require a reproducible same-commit benchmark;
configuration alone is only static evidence.
