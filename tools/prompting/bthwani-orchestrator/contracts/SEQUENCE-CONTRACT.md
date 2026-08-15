# Sequence Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY

One Sequence = one coherent root-cause treatment/execution/verification/closure unit, created JIT from machine-selected frontier.

Existing required identity/root/priority/dependency/execution/status/common-gate fields remain mandatory. Operational impact fields additionally required:

```text
OPERATIONAL_GRAPH_POSITION_PROVEN=YES|NO
JOURNEY_IMPACT_MAPPED=YES|NO
STATE_IMPACT_MAPPED=YES|NO
AUTHORITY_IMPACT_MAPPED=YES|NO
HANDOFF_IMPACT_MAPPED=YES|NO
CANONICAL_TRUTH_IMPACT_MAPPED=YES|NO
```

Before `READY_TO_EXECUTE` all six are YES and canonical gates pass on the same reconciled SHA.

A lower-layer observation cannot become Sequence while HOLD. Promotion requires operational parent + RC-NNN + current priority proof.

Sequence number = creation history, never priority. Parallel live write additionally requires machine-selected `INDEPENDENT_PARALLEL`, `PARALLEL_SAFETY=PROVEN_INDEPENDENT`, distinct semantic conflict domain and isolated workspace.

All prior common/terminal requirements remain: root cause, decisions/impact propagation, re-diagnosis, impact/findings/dependencies, verification definition, solution readiness, implementation/consumers/cleanup/verification/governance/scope-delta as applicable to MODE.
