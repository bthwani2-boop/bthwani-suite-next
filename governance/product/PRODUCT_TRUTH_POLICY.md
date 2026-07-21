# Product Truth Policy

Status: ACTIVE_CANONICAL

## Purpose

Prevent technically correct but functionally wrong or incomplete implementation by requiring an explicit product model before implementation readiness and an independent product acceptance decision before QA approval.

## Applicability

A Product Truth contract is required for every new or materially changed user-visible, role-sensitive, cross-surface, commercial, operational, or workflow capability. Pure internal refactors that preserve externally observable behavior may declare `product_impact: NONE` in their change impact instead.

## Authorities

- `PRODUCT_MANAGER_AUTHORITY` owns the problem, target actors, outcome, priority, scope, exclusions, value hypothesis, and success metric.
- `PRODUCT_OWNER_ACCEPTANCE_AUTHORITY` owns functional behavior, states, permissions, business rules, cross-surface acceptance, and the final product acceptance decision.
- `UX_JOURNEY_AUTHORITY` owns journey coherence and actor-facing state clarity when a UI or human workflow is affected.
- Engineering may challenge assumptions and contribute to discovery, but it may not self-approve product acceptance for its own implementation.

## Required contract

The machine-readable contract must validate against `governance/product/product-truth.schema.json` and must declare:

- the problem and evidence state;
- actors and role boundaries;
- required and explicitly excluded surfaces;
- routes, screens, actions, and forbidden actions;
- outcome and measurable acceptance criteria;
- business and negative invariants;
- owners and approval separation;
- implementation appetite, fixed constraints, variable scope, and verification targets.

## Stage-gate integration

- G0 requires a Product Truth contract or an explicit `product_impact: NONE` declaration.
- G1 requires product-manager approval of the problem, actors, outcome, and scope.
- G3 requires `PRODUCT_MODEL_APPROVED` and product-owner approval of functional acceptance.
- G4 implementation evidence cannot substitute for product acceptance.
- Product acceptance must pass before G5 independent QA approval.

## Cross-surface rule

Every required surface must be mapped to its actor, route or screen, permitted actions, forbidden actions, states, contract operations, and acceptance checks. An omitted surface is a failure unless it is explicitly excluded with a reason.

## Claim safety

A screen, button, metric, plan, entitlement, or commercial status must not claim active behavior when its backing API, data, financial mutation, or runtime proof is absent. Seed, fixture, fallback, local-memory, and preview data must be labelled as non-production and cannot support revenue, subscriber, runtime, or closure claims.

## Scope boundary

This policy does not activate or implement SaaS. SaaS and tenancy remain governed separately and are not changed by this product-governance layer.

## Acceptance condition

Accepted only when every applicable capability has one valid Product Truth contract, product-manager and product-owner authorities are separated, required surfaces are explicit, negative invariants are testable, and no implementation or QA gate can bypass product-model approval.
