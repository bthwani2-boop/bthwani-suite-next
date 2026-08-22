---
name: bthwani-docker-journey-runtime
version: 2026.08.18-v2
summary: Select bounded runtime evidence for Docker, data, startup, health, persistence, and live HTTP behavior.
---

# bthwani-docker-journey-runtime

## Invoke when

Docker, service startup, runtime configuration, database, Redis, MinIO, live HTTP behavior, persistence, or runtime proof is affected or claimed.

## Method

1. Pin exact branch/SHA and environment.
2. Select only affected runtime profiles/services.
3. Start them with the canonical runtime command.
4. Verify health/readiness.
5. Exercise claimed request/response behavior.
6. Verify persistence/readback for mutations.
7. Exercise the material failure path when applicable.
8. Stop/clean runtime resources when the command owns their lifecycle.

Static configuration or anti-stub checks are not runtime proof. Do not run broad runtime suites for documentation/agent-only changes or unrelated code.

## Output

```text
resolved_commit_sha:
environment:
profiles:
commands:
service_health:
http_evidence:
persistence_readback:
failed_paths:
missing_evidence:
decision:
remaining_risk:
```
