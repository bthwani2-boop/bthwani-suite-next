---
name: bthwani-product-truth-governor
version: 2026.07.17-v1
summary: Define and validate product problems, actors, surfaces, invariants, acceptance, and outcome evidence before implementation and before QA.
---

# bthwani-product-truth-governor

## Purpose

Prevent technically valid implementation of the wrong product, wrong actor permissions, wrong surface allocation, incomplete cross-surface behavior, or unproven commercial/runtime claims. Own capability Product Truth within its declared scope; do not own general policy, architecture, implementation, QA, security, release, or finance truth.

## Invoke when

- A new or materially changed user-visible capability is requested.
- A task changes actor behavior, permissions, workflow states, routes, screens, or cross-surface propagation.
- A capability may appear in the wrong application, control-panel section, role, or service.
- A commercial feature, metric, price, loyalty feature, partner subscription, or commission concept is introduced or materially changed.
- Product acceptance is required before independent QA.

## Do not invoke when

- The change is a behavior-preserving internal refactor with explicit `product_impact: NONE`.
- The task is a typo, formatting-only documentation edit, or mechanical generated-client refresh with no public contract change.

## Read before

- `governance/authority/authority-precedence.json`
- `governance/GOVERNANCE.md`
- `governance/product/PRD.md`
- `governance/product/platform-model.yaml`
- `governance/product/product-truth.schema.json`
- `governance/product/contracts/TEMPLATE.product-truth.json`
- `governance/policies/delivery.md`
- `governance/contracts/sdlc/` when a formal product stage is requested
- `governance/contracts/decision-vocabulary.json`

## Authority boundary

- `PRODUCT_MANAGER_AUTHORITY` owns the problem, actors, outcome, priority, scope, exclusions, evidence state, and success metric.
- `PRODUCT_OWNER_ACCEPTANCE_AUTHORITY` owns functional behavior, permissions, states, business rules, negative invariants, surface allocation, and product acceptance.
- `UX_JOURNEY_AUTHORITY` owns journey clarity when a human-facing flow is affected.
- Engineering contributes feasibility and discovery evidence but cannot approve its own product acceptance.
- Product Truth refines only its declared capability and cannot override the PRD or general policies.
- This skill cannot issue QA, security, release, runtime, production, or financial approval.

## Required method

1. Pin repository, exact named branch/ref, and resolved commit.
2. Read the PRD and canonical platform model before interpreting commercial or surface terminology.
3. State the product problem without prescribing implementation.
4. Identify every affected actor and explicitly forbidden actor behavior.
5. Enumerate every required and excluded surface with reasons.
6. Map each required surface to routes/screens, states, actions, operation IDs, and acceptance checks.
7. Define business invariants and negative invariants.
8. Define observable outcome, metric, baseline, target, and observation window when measurable product evidence is applicable.
9. Separate fixed constraints from variable scope and record uncertainty explicitly.
10. Require product-manager approval before `G1_PRODUCT_MODEL_APPROVED` when applicable.
11. Require product-owner authority for readiness/acceptance stages according to the canonical SDLC contract.
12. Require independent product acceptance before applicable QA approval.
13. Run `pnpm run guard:sdlc` after changing Product Truth or formal lifecycle inputs when the environment permits; do not claim it ran otherwise.

## Forbidden behavior

- Starting implementation from a feature list without a problem and actor model.
- Treating backend existence as proof of a complete product capability.
- Omitting a required surface without an explicit exclusion reason.
- Giving an actor actions belonging to another role.
- Treating seed, fixture, fallback, preview, or in-memory data as active runtime or commercial evidence.
- Claiming revenue, payment, partner subscription, commission, or active commercial behavior without authoritative backend/WLT/runtime evidence.
- Combining product-manager and product-owner approval under one execution result.

## Required output

```text
capability_id:
product_truth_state:
problem_evidence_state:
actors:
required_surfaces:
excluded_surfaces:
negative_invariants:
product_manager_decision:
product_owner_decision:
checks:
decision:
remaining_risks:
```

Allowed decisions are `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `BLOCKED_EXTERNAL`, and `PROTOCOL_VIOLATION`, interpreted through `governance/contracts/decision-vocabulary.json`.
