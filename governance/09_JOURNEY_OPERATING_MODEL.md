# 09 — Journey Operating Model

Status: ACTIVE_CANONICAL

## Model

Build capabilities as production-shaped operational journeys derived from current Product Truth, contracts, routes, services, data ownership, surfaces, runtime posture, and tests.

This document does not maintain a frozen universal journey list. The applicable journey is derived from the resolved codebase and declared impact.

A journey may include:

- Product Truth and actor model;
- owner governance and architecture;
- database and migration impact;
- OpenAPI and generated clients;
- backend, adapters, controllers, and surfaces;
- runtime and provider behavior;
- negative, cross-surface, accessibility, and security verification;
- governance, CI, QA, release, and production evidence when applicable.

## Illustrative capability order

Illustrative ordering may begin with repository foundation, identity, providers, UI kit, onboarding, discovery, catalog, cart, payment session, checkout, order, dispatch, delivery, support, and operations. This sequence is neither exhaustive nor authority for current readiness.

## Stop rule

Do not advance a journey while its canonical decision is any of:

- `FIX_REQUIRED`
- `NEEDS_EVIDENCE`
- `BLOCKED_EXTERNAL`
- `QA_BLOCK`
- `SECURITY_BLOCK`
- `RELEASE_BLOCK`
- `PROTOCOL_VIOLATION`

`OUT_OF_SCOPE_FOR_THIS_JOURNEY` excludes an item; it does not count it as passed or implemented.

## SDLC rule

Journeys requiring formal control use G0–G10 and the final closure rules in `governance/26_SDLC_TEAM_AND_STAGE_GATES.md`.

- Product Truth precedes implementation when applicable.
- Product acceptance precedes QA.
- Governance-contract and CI-workflow approval apply when their impact flags are true.
- Runtime, visual, QA, security, release, and production scopes remain independent.
- Commercial SaaS and tenant activation remain outside the current scope unless separately authorized later.

## Closure rule

No journey may claim `CLOSED_WITH_EVIDENCE` unless every evidence scope applicable to its declared impact passed on the same immutable commit with required independent approvals, no open blocker, and proven separation of duties.

## Acceptance condition

Accepted only when each journey declares scope, exclusions, actors, owners, impact, evidence scopes, stage state when applicable, canonical decision, and unresolved risk without using deprecated stop labels or static source as runtime proof.
