# 09 — Journey Operating Model

Status: CANONICAL

## Model

Build the new repository by production-shaped operational journeys and capability flows.

The definitive list of operational journeys and capability flows must be derived and built directly from the codebase (such as actual application flows, router paths, backend services, and test suites) rather than being statically defined here.

An operational journey may include governance link, blueprint, domain, database, OpenAPI, backend, generated client, frontend, Docker/runtime, tests, visual evidence, and evidence pack.

## Illustrative Journey Order (Examples)

The following sequence serves as illustrative examples of the journey order and capability flows. This is not a strict or exhaustive list of all allowed journeys, but a reference baseline to guide implementation:

1. FOUNDATION-001 — mini governance closure
2. FOUNDATION-002 — core identity contract
3. FOUNDATION-003 — provider contract/control baseline
4. FOUNDATION-004 — ui-kit baseline
5. Partner Field Onboarding & Store Activation Journey
6. Store Discovery capability (public + role governance)
7. Home Discovery capability (operator banners/promos/categories)
8. Storefront Catalog capability (products, categories, media, overrides)
9. Cart & Serviceability capability
10. WLT Payment Session / Status capability
11. Checkout & Payment Binding capability

## Stop rule

Do not continue while current journey is NOT_APPROVED_YET, BLOCKED_NEEDS_BLUEPRINT, BLOCKED_NEEDS_API_CONTRACT, or BLOCKED_NEEDS_RUNTIME_EVIDENCE.

## SDLC gate rule

Journeys that require formal approval must use the stage sequence in [26_SDLC_TEAM_AND_STAGE_GATES.md](26_SDLC_TEAM_AND_STAGE_GATES.md).

No journey may claim `CLOSED_WITH_EVIDENCE`, release readiness, SaaS readiness, or production readiness when an applicable QA, security, tenant-isolation, release, or risk-acceptance gate is missing.

## Acceptance condition

Accepted only when every journey declares scope, exclusions, evidence requirements, closure state, and any applicable SDLC/SaaS gate state.
