---
name: bthwani-platform-runtime-config
version: 2026.07.17-v1
summary: Govern environment, provider, service-slot, base-URL, CORS, and sensitive runtime configuration ownership.
---

# bthwani-platform-runtime-config

## Purpose

Own verification of runtime configuration boundaries so environment, provider, service-slot, base-URL, CORS, feature posture, and sensitive settings remain centralized and truthful.

## Invoke when

- Environment, provider, service-slot, base-URL, runtime-map, CORS, or sensitive configuration changes.
- A service or surface needs a new runtime configuration value or provider binding.

## Do not invoke when

- No runtime configuration, provider boundary, or sensitive setting is affected.
- The task is only static UI presentation with no configuration dependency.

## Read before

- `governance/04_API_RUNTIME_BINDING.md`
- `governance/05_DOCKER_AND_DATA_PLANE.md`
- `governance/07_SECURITY_AND_SECRETS.md`
- applicable shared configuration owners, runtime manifests, and consumers

## Authority boundary

This skill owns configuration-boundary verification only. It cannot approve application security, provider production activation, release, runtime success, or final closure. Sensitive findings are routed to the independent security authority.

## Required invariants

1. Configuration has one declared owner and typed consumers.
2. Screens and leaf components do not own base URLs, provider secrets, CORS policy, or service slots.
3. Production provider activation is explicit and fail-closed.
4. Defaults do not broaden CORS, bypass authentication, expose credentials, or present mock posture as production.
5. Runtime behavior claims require same-commit runtime evidence.

## Forbidden

- Screen-local runtime configuration.
- Preview, demo, fixture, or mock state presented as live runtime truth.
- Provider mutation hidden in frontend code.
- Broad CORS or unsafe production defaults.
- Returning the noncanonical decision `BLOCKED_SECURITY_RISK`; use `SECURITY_BLOCK`.

## Required output

```text
resolved_commit_sha:
configuration_owner:
consumers:
provider_posture:
sensitive_data_review:
static_checks:
runtime_evidence_required:
missing_evidence:
decision:
remaining_risk:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `SECURITY_BLOCK`, `BLOCKED_EXTERNAL`, and `PROTOCOL_VIOLATION`.
