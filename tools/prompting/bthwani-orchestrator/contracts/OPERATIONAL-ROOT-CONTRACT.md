# Operational Root Contract

Status: DERIVED_SUPPORT / MACHINE-CONTRACT-DOCUMENTATION

Canonical machine artifact: `plans/diagnose-implementing/<TASK>/operational-root.json`.

## Required categories

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

Each category:

```json
{"applicability":"APPLICABLE|NOT_APPLICABLE","items":[],"exclusionEvidence":[]}
```

APPLICABLE requires material items. NOT_APPLICABLE requires evidence-backed exclusion.

Each material item requires unique stable `id`, `status=ACCOUNTED|SUPPORTED_EXCLUSION`, non-empty `evidence`, and meaningful `name/claim`. Relationships use IDs; dangling material references are forbidden.

## Challenges

`negativeSpace` and `adversarial` must be `PASS` with evidence on current reconciled SHA before operational root completion.

## Meaning

`OPERATIONAL_ROOT_COMPLETE` means bounded material operational universe is accounted against current authorized target evidence. It does not claim metaphysical discovery of every possible unknown defect.

## Frontier prohibition

No root-cause landscape, priority model, sequence or execution frontier is valid until canonical operational-root gate passes.
