# 00 — Decision Index

Status: ACTIVE_CANONICAL
Stage: FOUNDATION-001

## Purpose

This is the human-readable governance index for `bthwani-suite-next`.

Conflict resolution and document classification are owned exclusively by:

```text
governance/authority/authority-precedence.json
```

The machine-readable registry overrides historical `Status: CANONICAL`, `self-contained`, phase-readiness, or current-state claims found in lower-precedence files.

## Classification vocabulary

- `ROOT_AUTHORITY`: the single authority-precedence registry.
- `ACTIVE_CANONICAL`: durable active policy for its declared authority domain.
- `CONDITIONAL_CANONICAL`: active only when its `appliesWhen` condition matches the task.
- `OWNER_CONTRACT`: a skill or owner contract limited to its declared scope.
- `ADAPTER`: a tool adapter that may not add or override policy.
- `DERIVED_SUPPORT`: schema, template, matrix, protocol support, or current evidence snapshot that cannot override its source authority or live external state.
- `HISTORICAL_REFERENCE`: evidence of a previous phase only; never current implementation truth.

## Active canonical governance

1. `governance/authority/authority-precedence.json`
2. `AGENTS.md`
3. `governance/00_DECISION_INDEX.md`
4. `governance/LEAN_CODE_BASED_CHECK.md`
5. `governance/01_REPO_BOUNDARIES.md`
6. `governance/02_SERVICES_AND_SURFACES.md`
7. `governance/03_UI_KIT_AND_BRAND_LOCK.md`
8. `governance/04_API_RUNTIME_BINDING.md`
9. `governance/05_DOCKER_AND_DATA_PLANE.md`
10. `governance/06_EVIDENCE_AND_GATES.md`
11. `governance/07_SECURITY_AND_SECRETS.md`
12. `governance/08_CLEANUP_AND_DEPRECATION.md`
13. `governance/09_JOURNEY_OPERATING_MODEL.md`
14. `governance/10_TOOLCHAIN_VERSION_LOCK.md`
15. `governance/17_PERFORMANCE_AND_RUNTIME_BASELINE.md`
16. `governance/26_SDLC_TEAM_AND_STAGE_GATES.md`
17. `governance/product/PRODUCT_TRUTH_POLICY.md`
18. `governance/contracts/decision-vocabulary.json`
19. `governance/agents/agent-registry.json`
20. `governance/skills/skills-registry.json`
21. `governance/guards/guard-registry.json`

## Conditional protocol annexes

These files are canonical only when the applicability conditions in the authority registry match the task:

1. `governance/operational_journey_protocol_package/annexes/SAAS_READINESS_AND_TENANCY_GATES.md`

Registration of a conditional annex does not authorize implementation. SaaS remains deferred unless the user explicitly authorizes that separate scope.

## Derived support and current evidence

These artifacts assist execution or record a bounded observation. They cannot override active canonical governance, live contracts, source code, GitHub settings, or same-commit evidence.

Key derived references include:

- `governance/operational_journey_protocol_package/**`
- `governance/15_MATRIX_NORMALIZATION_RULES.md`
- `governance/16_MASTER_MATRIX_V3_BUSINESS_RULES.md`
- `governance/github/repository-enforcement.json`
- `governance/github/repository-enforcement.schema.json`
- `governance/guards/frontend-binding-registry.json`
- `governance/guards/frontend-binding-registry.schema.json`
- `governance/product/contracts/**`

`governance/github/repository-enforcement.json` is an evidence snapshot. It must remain conservative and must never claim branch protection, required checks, independent reviewer identity, or separation of duties unless those controls are verified from GitHub itself.

Durable business invariants inside a derived document remain useful only when they do not conflict with higher authority or current live contracts.

## Historical references

The following files remain available as historical evidence but do not own current readiness or implementation state:

- `governance/11_INTERFACE_BLUEPRINTS.md`
- `governance/13_DSH_SERVICE_ACTIVATION.md`
- `governance/14_EXTRACTION_AND_SCREEN_INVENTORY.md`
- `governance/14_MASTER_EXTRACTION_LOGIC_UX_COVERAGE.md`
- `governance/99_LEGACY_EXTRACTION_LEDGER.md`

Current state must come from the resolved remote commit, live service manifests, OpenAPI contracts, routes, database migrations, generated clients, bound surfaces, tests, GitHub enforcement state, and same-commit runtime evidence.

## Decision vocabulary

All agents, skills, guards, SDLC gates, and closure judges must use or map their result through:

```text
governance/contracts/decision-vocabulary.json
```

Aliases such as `CODE_CHECK_PASS`, `GATE_PASS`, `STATIC_BINDING`, or `RUNTIME_SMOKE_PASS` identify an evidence scope only. They never imply `CLOSED_WITH_EVIDENCE`.

## Allowed unresolved states

- `FIX_REQUIRED`
- `BLOCKED_EXTERNAL`
- `NEEDS_EVIDENCE`
- `QA_BLOCK`
- `SECURITY_BLOCK`
- `RELEASE_BLOCK`
- `OUT_OF_SCOPE_FOR_THIS_JOURNEY`

## Acceptance condition

Accepted only when the authority-precedence registry validates, active and conditional sources are classified without duplicate authority, historical readiness claims cannot override live state, every decision term maps to the canonical vocabulary, GitHub enforcement evidence cannot overclaim actual controls, and no governed journey reaches implementation readiness without applicable Product Truth and stage-gate approval.
