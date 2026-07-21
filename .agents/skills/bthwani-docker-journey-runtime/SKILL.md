---
name: bthwani-docker-journey-runtime
version: 2026.07.17-v1
summary: Route Docker and data-plane changes to bounded same-commit runtime evidence without upgrading static checks.
---

# bthwani-docker-journey-runtime

## Purpose

Own runtime-evidence routing for Docker, data-plane, service startup, health, migrations, persistence, Redis, MinIO, and live HTTP behavior.

## Invoke when

- Docker, data-plane, runtime configuration, service startup, database, Redis, MinIO, or live behavior changes.
- The requested claim includes runtime, integration, persistence, release, or production behavior.

## Do not invoke when

- The task is static or documentation-only and makes no runtime claim.
- Runtime is explicitly outside the declared journey.

## Read before

- `governance/05_DOCKER_AND_DATA_PLANE.md`
- `governance/06_EVIDENCE_AND_GATES.md`
- `package.json`
- applicable runtime scripts, compose files, service manifests, migrations, and health endpoints

## Authority boundary

This skill selects and reconciles runtime evidence only. It cannot approve product, architecture, finance, QA, security, release, production, or final closure. A runtime declaration, health configuration, or static anti-stub guard is not proof that a runtime executed.

## Required evidence

1. Exact immutable commit and environment identity.
2. Exact targeted runtime command and profiles.
3. Startup and health result for affected services.
4. Request/response evidence for claimed endpoints.
5. Persistence or readback evidence when mutation or database state is claimed.
6. Failure-path evidence when required by the journey.
7. Explicit missing evidence and blocker classification.

## Forbidden

- Running runtime gates for agent-only or documentation-only changes.
- Treating memory repositories, mocks, seeds, fixtures, or declarations as live proof.
- Using floating or unverified container references where the canonical runtime policy requires locks.
- Moving service business schema into infrastructure provisioning.
- Claiming production readiness from local or CI runtime smoke alone.

## Required output

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

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `BLOCKED_EXTERNAL`, `RELEASE_BLOCK`, and `PROTOCOL_VIOLATION`.
