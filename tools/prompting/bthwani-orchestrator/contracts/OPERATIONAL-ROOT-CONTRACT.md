# Operational Root Contract

Status: DERIVED_SUPPORT / MACHINE-CONTRACT-DOCUMENTATION

Machine path: `plans/diagnose-implementing/_machine/<TASK_NAME>/`.

## operational-root.json

Schema: `BTHWANI_OPERATIONAL_ROOT_V1`.

Required categories:

```text
productOutcomes
actors
authorities
responsibilities
journeys
states
transitions
invariants
handoffs
truthOwners
writersReadersConsumers
flows
implementationRuntimeBoundaries
```

Each category is exactly one of:

```text
APPLICABLE
NOT_APPLICABLE_WITH_PROOF
```

APPLICABLE requires material `items[]`; each item requires stable `id`, meaningful `name`, `status=ACCOUNTED|SUPPORTED_EXCLUSION`, and non-empty `evidence[]`. NOT_APPLICABLE_WITH_PROOF requires non-empty `exclusionEvidence[]`.

`challenges.negativeSpace` and `challenges.adversarial` require `status=PASS` + evidence on the same `reconciledSha`.

## lower-layer-observations.json

Schema: `BTHWANI_LOWER_LAYER_OBSERVATIONS_V1`.

Each observation requires `id/layer/symptom/sourceEvidence/status`.

```text
HOLD         → cannot govern execution
PROMOTED     → operationalParent + RC-NNN + promotionEvidence required
DISPOSITIONED→ resolved/excluded with proof
```

Closure requires zero material HOLD.

## root-cause-landscape.json

Schema: `BTHWANI_ROOT_CAUSE_LANDSCAPE_V1`.
Priority policy: `HIGHEST_PROVEN_SYSTEMIC_LEVERAGE`.

Each unresolved material RC requires:

```text
id=RC-NNN
operationalParents[]
priorityRank
priorityClass
comparisonBasis
evidence[]
competitiveDeepening=DEEPENED_ENOUGH_TO_RANK|PROVEN_CANNOT_OUTRANK
operationalGraphPositionProven
blastRadiusComplete
dependenciesComplete
consumersComplete
unresolvedUpstream[]
```

Selected primary must be the minimum current priorityRank and `DEEPENED_ENOUGH_TO_RANK`. Parallel selections require `INDEPENDENT_PARALLEL` + independence evidence.

## Completeness meaning

Machine PASS means bounded material completeness against current authorized evidence. It does not claim unknowable absolute completeness; `UNPROVEN=OPEN`.
