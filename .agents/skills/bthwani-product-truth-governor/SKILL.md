---
name: bthwani-product-truth-governor
version: 2026.07.17-v1
summary: Define and validate product problems, actors, surfaces, invariants, acceptance, and outcome evidence before implementation and before QA.
---

# bthwani-product-truth-governor

## Purpose

Prevent technically valid implementation of the wrong product, wrong actor permissions, wrong surface allocation, incomplete cross-surface behavior, or unproven commercial and runtime claims. Own the Product Truth contract; do not own architecture, implementation, QA, security, release, or finance truth.

## Invoke when

- A new or materially changed user-visible capability is requested.
- A task changes actor behavior, permissions, workflow states, routes, screens, or cross-surface propagation.
- A capability may appear in the wrong application, control-panel section, role, or service.
- A commercial feature, metric, price, loyalty feature, partner subscription, or commission concept is introduced or materially changed.
- Product acceptance is required before independent QA.

## Do not invoke when

- The change is a behavior-preserving internal refactor with explicit `product_impact: NONE`.
- The task is a typo, formatting-only documentation edit, or mechanical generated-client refresh with no public contract change.
- The task attempts to introduce tenancy or classify BThwani as SaaS without an explicit owner instruction replacing the canonical platform model; return `PROTOCOL_VIOLATION` instead of routing to a nonexistent conditional authority.

## Read before

- `governance/authority/authority-precedence.json`
- `governance/policies/product.md`
- `governance/product/platform-model.yaml`
- `governance/product/product-truth.schema.json`
- `governance/product/contracts/TEMPLATE.product-truth.json`
- `governance/policies/release.md`
- `governance/contracts/decision-vocabulary.json`

## Authority boundary

- `PRODUCT_MANAGER_AUTHORITY` owns the problem, actors, outcome, priority, scope, exclusions, evidence state, and success metric.
- `PRODUCT_OWNER_ACCEPTANCE_AUTHORITY` owns functional behavior, permissions, states, business rules, negative invariants, surface allocation, and product acceptance.
- `UX_JOURNEY_AUTHORITY` owns journey clarity when a human-facing flow is affected.
- Engineering contributes feasibility and discovery evidence but cannot approve its own product acceptance.
- This skill cannot issue QA, security, release, runtime, production, or financial approval.

## Required method

1. Pin repository, remote branch, and resolved commit.
2. Read and enforce the canonical platform model before interpreting commercial terminology.
3. State the product problem without prescribing implementation.
4. Identify every affected actor and explicitly forbidden actor behavior.
5. Enumerate every required and excluded surface with reasons.
6. Map each required surface to routes or screens, states, actions, operation IDs, and acceptance checks.
7. Define business invariants and negative invariants.
8. Define the observable outcome, metric, baseline, target, and observation window.
9. Separate fixed constraints from variable scope and record the execution appetite and uncertainty.
10. Require product-manager approval before `PRODUCT_MODEL_APPROVED`.
11. Require product-owner approval before `READY_FOR_IMPLEMENTATION`.
12. Require independent product acceptance before QA approval.
13. Run `pnpm run guard:sdlc` after changing Product Truth contracts or policy; the SDLC gate includes the Product Truth validator.

## Forbidden behavior

- Starting implementation from a feature list without a problem and actor model.
- Treating backend existence as proof of a complete product capability.
- Omitting a surface without an explicit exclusion reason.
- Giving an actor actions belonging to another role.
- Treating seed, fixture, fallback, preview, or in-memory data as active runtime or commercial evidence.
- Claiming revenue, payment, partner subscription, commission, or active commercial behavior without the authoritative backend and WLT evidence.
- Combining product-manager and product-owner approval under the same execution result.
- Treating a partner subscription as a tenant boundary, SaaS lifecycle, entitlement plane, or independent platform instance.
- Introducing tenancy or SaaS terminology into active product behavior without replacing the canonical platform model through explicit owner authority.

## Required output

Return:

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
