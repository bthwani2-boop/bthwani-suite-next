---
name: bthwani-screen-flow-binding
version: 2026.07.17-v1
summary: Verify route, screen, state, action, and controller binding for declared product surfaces.
---

# bthwani-screen-flow-binding

## Purpose

Own verification that each declared user or operator flow is allocated to the correct surface, route, screen, actor, state model, action, and data controller.

## Invoke when

- A route, navigation entry, screen, tab, CTA, role-visible action, or surface state changes.
- Product Truth declares a required UI surface or actor flow.

## Do not invoke when

- No user-facing or operator-facing route, screen, state, or action changes.
- The task is API-only, database-only, or a behavior-preserving refactor with no surface impact.

## Authority boundary

This skill owns screen-flow binding verification only. It does not choose product scope, approve actor permissions, own API contracts, approve visual design, perform independent QA, or declare final closure.

## Execution contract

Verify:

1. required surface and actor come from Product Truth;
2. route or navigation entry is reachable;
3. screen and controller ownership are explicit;
4. permitted and forbidden actions match the actor;
5. loading, empty, success, failure, forbidden, and retry states exist when applicable;
6. data-backed actions bind through the owned client/controller;
7. RTL, accessibility, and visual proof are checked when applicable to the requested evidence scope.

## Forbidden

- Orphan screens, dead tabs, unreachable CTAs, or route entries without owners.
- Screen-local seed or in-memory state presented as live runtime truth.
- Actions exposed to excluded actors or surfaces.
- Requiring screenshots for ordinary implementation when visual closure is not requested.

## Required output

```text
product_truth_contract:
actors:
required_surfaces:
routes_or_screens:
states:
actions:
controller_bindings:
checks:
decision:
remaining_gaps:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `BLOCKED_EXTERNAL`, and `OUT_OF_SCOPE_FOR_THIS_JOURNEY`.
