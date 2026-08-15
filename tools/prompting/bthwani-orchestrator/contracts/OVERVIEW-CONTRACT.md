# Overview Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY

Overview is summary/provenance; machine truth for operational coverage and root-cause ranking lives in sibling JSON registries.

Required identity/isolation/root fields remain: package/task identity, Integration Target, Task Branch/workspace, TARGET/ORCHESTRATION_ROOT, latest reconciled SHA, root reconciliation, frontier/integration/final candidate/accounting fields.

Required operational summary fields:

```text
MINIMUM_DIAGNOSTIC_ALTITUDE
OPERATIONAL_ROOT_REQUIRED=YES
OPERATIONAL_ROOT_COMPLETE=YES|NO
OPERATIONAL_ROOT_RECONCILED_SHA=UNSET|<sha>
OPERATIONAL_NEGATIVE_SPACE_PASS=YES|NO
OPERATIONAL_ADVERSARIAL_PASS=YES|NO
LOWER_LAYER_HOLD_COUNT=<n|UNSET>
```

Header cannot manufacture PASS; canonical gates derive validity from `operational-root.json`, `lower-layer-observations.json`, and `root-cause-landscape.json`.

Required sections retain Truth Baseline, Macro/Operational Blueprint, Sequence Registry/Frontier, Decisions/Blockers, Accounting/Reconciliation, Final Handoff/Closure.
