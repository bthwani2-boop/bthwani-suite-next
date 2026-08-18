---
name: bthwani-product-truth-governor
version: 2026.08.18-v2
summary: Define product actors, surfaces, invariants, and outcomes without coupling product decisions to an SDLC stage machine.
---

# bthwani-product-truth-governor

## Invoke when

A user-visible capability, actor permission, workflow state, route/screen allocation, cross-surface behavior, commercial rule, metric, price, loyalty, subscription, or commission concept changes materially.

## Method

1. Pin repository/ref/SHA.
2. Read the PRD, platform model, and applicable capability Product Truth.
3. State the product outcome and affected actors.
4. Enumerate required/excluded surfaces and negative invariants.
5. Map required surfaces to actual routes/screens/actions/contracts where implementation is in scope.
6. Separate product uncertainty from implementation defects.
7. Verify implementation/runtime outcomes only with the evidence that actually exercises them.

Do not require G0-G10 stages, `guard:sdlc`, artifact manifests, or governance approval machinery. Product Truth guides what the system should do; actual code/runtime evidence proves what the candidate does.

## Output

```text
capability_id:
problem:
actors:
required_surfaces:
excluded_surfaces:
invariants:
implementation_checks:
runtime_evidence:
missing_evidence:
decision:
remaining_risks:
```
