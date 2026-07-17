# 00 — Decision Index

Status: ACTIVE_CANONICAL

## Purpose

This is the human-readable index for `bthwani-suite-next`. Conflict resolution and classification are owned exclusively by:

```text
governance/authority/authority-precedence.json
```

The machine-readable authority registry overrides stale `Status: CANONICAL`, self-contained, readiness, and current-state claims in lower-precedence files.

## Classification vocabulary

- `ROOT_AUTHORITY`: the single authority-precedence registry.
- `ACTIVE_CANONICAL`: durable active policy or machine-readable contract for its declared domain.
- `CONDITIONAL_CANONICAL`: active only when its registered applicability condition matches the task.
- `OWNER_CONTRACT`: an active or conditional governed skill limited to its registered authority.
- `ADAPTER`: a tool adapter that may not create policy or own approval.
- `DERIVED_SUPPORT`: templates, schemas, instances, matrices, snapshots, and support artifacts that cannot override source authority or live state.
- `HISTORICAL_REFERENCE`: previous-phase evidence only; never current implementation truth.

## Root and active human governance

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

## Active machine-readable contracts

The following paths encode enforceable governance and are validated by registered guards:

- `governance/contracts/**` — decision vocabulary and shared contract schemas;
- `governance/agents/**` — logical roles, authority, and approval domains;
- `governance/skills/**` — skill lifecycle, dependencies, authority, and routing;
- `governance/guards/**` — guard registry, assurance boundaries, and static binding registry;
- `governance/product/product-truth.schema.json` — Product Truth schema;
- `tools/guards/guard-manifest.json` — guard sets and execution policy.

A machine-readable contract does not prove that its associated guard, workflow, runtime, or human approval executed.

## Conditional annex

The following annex applies only when its registered condition matches the task:

- `governance/operational_journey_protocol_package/annexes/SAAS_READINESS_AND_TENANCY_GATES.md`

Registration does not authorize SaaS implementation, tenant activation, billing, metering, or commercial launch. SaaS remains outside the current execution scope.

## Owner contracts and adapters

- `.agents/skills/**` may own only the scope of an `active` or `conditional` `governed` entry in `governance/skills/skills-registry.json`.
- `legacy` skills are `retired`; they may remain historical references but cannot be routed, depended on, or treated as authorities.
- `GEMINI.md` is an adapter and may not override `AGENTS.md`, canonical governance, or owner contracts.
- Graphify, Nx, LeanCTX, and similar utilities are tools, not owner skills or approval authorities.

## Derived support and current evidence

Derived artifacts assist execution or record bounded observations. They cannot override canonical governance, source code, live contracts, GitHub settings, or same-commit evidence.

Key derived paths:

- `governance/github/repository-enforcement.json` — conservative GitHub enforcement snapshot;
- `governance/product/contracts/**` — capability-specific Product Truth instances;
- `governance/operational_journey_protocol_package/**` — SDLC templates and support;
- `governance/15_MATRIX_NORMALIZATION_RULES.md`;
- `governance/16_MASTER_MATRIX_V3_BUSINESS_RULES.md`.

`repository-enforcement.json` must never claim branch protection, required checks, independent reviewer identity, or separation of duties unless verified from GitHub itself.

`governance/guards/guard-assurance.json` is part of the active guard contract. It defines the maximum claim each guard can support. A scope guard with `closureEligible: false` cannot independently support final closure.

## Historical references

The following files may remain readable but own no current readiness or implementation state:

- `governance/11_INTERFACE_BLUEPRINTS.md`
- `governance/13_DSH_SERVICE_ACTIVATION.md`
- `governance/14_EXTRACTION_AND_SCREEN_INVENTORY.md`
- `governance/14_MASTER_EXTRACTION_LOGIC_UX_COVERAGE.md`
- `governance/99_LEGACY_EXTRACTION_LEDGER.md`

Current state comes from the resolved remote commit, current code, manifests, contracts, routes, migrations, generated clients, bound surfaces, registered guards, actual GitHub enforcement, and same-commit evidence.

## Decision vocabulary

All agents, skills, guards, SDLC validators, workflows, and closure judges use:

```text
governance/contracts/decision-vocabulary.json
```

- `PASS` is limited to its declared evidence scope.
- `READY_FOR_REVIEW` is not approval or closure.
- `CLOSED_WITH_EVIDENCE` requires every scope applicable to the declared impact on the same immutable commit.
- Deprecated aliases may be read for migration only and must not be introduced in active outputs.

Allowed unresolved decisions include `FIX_REQUIRED`, `BLOCKED_EXTERNAL`, `NEEDS_EVIDENCE`, `QA_BLOCK`, `SECURITY_BLOCK`, `RELEASE_BLOCK`, `PROTOCOL_VIOLATION`, and `OUT_OF_SCOPE_FOR_THIS_JOURNEY`.

## Acceptance condition

Accepted only when this index matches the authority registry, every active source is classified once, active skills are governed, legacy skills are retired, machine contracts and guard sets are registered, all decisions map to the canonical vocabulary, assurance boundaries prevent overclaiming, and no applicable Product Truth, governance, CI, SDLC, security, finance, QA, release, runtime, or production requirement is bypassed.
