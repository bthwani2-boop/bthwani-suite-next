# Future Runtime Capabilities

## Purpose

هذا الملف يسجل القدرات التي سنحتاجها لاحقًا حتى لا تُنسى، لكنه لا يفعّلها الآن.

## Current Execution Boundary

ينفذ الآن في CI والبيئة المحلية:

* Node gates (CI / Node / PNPM gates)
* DSH Go backend & DB integration
* Identity Go backend
* WLT Go backend & DB integration
* Docker runtime smoke
* CodeQL analysis (Go, JS/TS)
* YER default currency guard
* WireMock request journal proof

لا ينفذ الآن:

* Cloudflare Tunnel
* Traefik
* Mockoon
* Metabase/Grafana
* LocalStack
* Ollama/LocalAI
* OSM/Overpass
* Dnsmasq
* ngrok/LocalTunnel
* Provider Backend Runtime الكامل

## Global Rules

* Default currency is YER / الريال اليمني.
* No SAR default in local/dev/runtime/tests/seeds/contracts/docs. <!-- ALLOW_FOREIGN_CURRENCY_EXAMPLE -->
* Multi-currency is future only.
* No production secrets.
* No production provider URLs.
* No direct financial provider access outside WLT.
* No database public exposure.
* No MinIO Console public exposure.
* No tunnel in CI.
* No heavy runtime:all.
* Every future capability must be optional and must have independent smoke proof.

## Future Items

1. DEV-RUNTIME-EXPOSURE-001 — Cloudflare Quick Tunnel
   Status: future
   Owner: infra/runtime
   Why not now: WLT proof is not closed yet.
   Forbidden: DB exposure, MinIO Console exposure, CI tunnel, production use.
   Expected later: infra/docker/compose.exposure.yml, docs/runtime/exposure.md.

2. DEV-RUNTIME-PROXY-001 — Traefik Proxy
   Status: future
   Owner: infra/runtime
   Why not now: no exposure layer yet.
   Forbidden: default activation, DB exposure, MinIO Console exposure.

3. DEV-PROVIDER-BACKEND-RUNTIME-001 — Backend Provider Registry
   Status: future
   Owner: platform/backend
   When: after WLT mock provider and CI are closed.
   Purpose: provider switching from backend governance, not frontend.

4. DEV-RUNTIME-MOCKOON-001 — Mockoon Manual API Design
   Status: future_optional
   Why not now: WireMock is the CI standard.

5. DEV-OBSERVABILITY-001 — Metrics / Logs / Analytics
   Status: future
   Why not now: event model not stable.

6. DEV-RUNTIME-CACHE-EXPANSION-001 — Valkey Usage Expansion
   Status: future_optional
   When: idempotency locks or retry queues are needed.
   Must not become default.

7. DEV-LOCALSTACK-001 — LocalStack
   Status: deferred_or_rejected_now
   Why not now: heavy and not needed with MinIO.

8. DEV-AI-LOCAL-RUNTIME-001 — Ollama / LocalAI
   Status: rejected_now
   Why not now: heavy on user device.

9. DEV-OSM-OVERPASS-001 — Local Maps / OSM / Overpass
    Status: rejected_now
    Why not now: heavy.

10. DEV-DNSMASQ-001 — Local Domains
    Status: rejected_now
    Why not now: need public testing, not local domains.

11. DEV-NGROK-LOCALTUNNEL-001 — Tunnel Fallbacks
    Status: fallback_only
    When: only if Cloudflare is not available.

12. DSH-RUNTIME-SMOKE-001 — DSH Runtime Smoke
    Status: active (integrated in CI/Docker runtime smoke, v2 scope defined in issue #43)
    Owner: dsh/backend
    Why not now: V2 scope defined in issue #43.

13. IDENTITY-RUNTIME-SMOKE-001 — Identity Runtime Smoke
    Status: active (integrated in CI/Docker runtime smoke, v2 scope defined in issue #44)
    Owner: identity
    Why not now: V2 scope defined in issue #44.

14. DEV-MULTI-CURRENCY-001 — Multi-currency Support
    Status: future
    Owner: wlt/platform
    Why not now: default Yemen market requires YER first.
    Rule: YER remains default. Any foreign currency must be explicit and guarded.

## Execution Order

1. Finish current WLT financial hotfix.
2. Enforce YER.
3. Add real DB CI proof.
4. Add DSH runtime smoke later.
5. Add identity runtime smoke later.
6. Add backend provider registry.
7. Add exposure only when public testing is required.
8. Add proxy only after exposure.
9. Add analytics only after event model.

## Prohibited Until Further Notice

* Cloudflare in CI
* Traefik default
* DB public exposure
* MinIO Console public exposure
* production financial provider in local runtime
* frontend provider secrets
* runtime:all heavy mode
* LocalStack now
* Ollama/LocalAI now
* OSM/Overpass now
* SAR as default currency <!-- ALLOW_FOREIGN_CURRENCY_EXAMPLE -->
