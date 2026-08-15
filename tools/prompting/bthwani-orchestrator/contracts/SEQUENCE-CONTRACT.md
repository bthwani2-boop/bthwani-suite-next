# Sequence Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY

Every Sequence is one coherent root-cause execution/verification/closure unit and must carry:

```text
ROOT_CAUSE_CLUSTER_ID=RC-NNN
PRIORITY_CLASS
PRIORITY_BASIS
OPERATIONAL_GRAPH_POSITION_PROVEN=YES|NO
JOURNEY_IMPACT_MAPPED=YES|NO
STATE_IMPACT_MAPPED=YES|NO
AUTHORITY_IMPACT_MAPPED=YES|NO
HANDOFF_IMPACT_MAPPED=YES|NO
CANONICAL_TRUTH_IMPACT_MAPPED=YES|NO
```

Before READY_TO_EXECUTE all above must be YES, cluster must be selected by `root-cause-landscape.json`, and canonical operational/root/priority/frontier gates must pass on same reconciled SHA.

Sequence number is identity history, never priority. Lower-layer observation cannot become Sequence until promoted with operational parent + cluster + priority proof.
