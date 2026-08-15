# 03 — Decisions, Coverage & Anti-Drift

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY

## Accounting order

```text
ORCHESTRATION_ROOT
→ PRODUCT OUTCOMES
→ ACTORS / AUTHORITIES / RESPONSIBILITIES
→ JOURNEYS
→ STATES / TRANSITIONS / INVARIANTS
→ HANDOFFS
→ CANONICAL OWNERS / WRITERS / READERS / CONSUMERS
→ DATA/CONTRACT/API/PERSISTENCE/EVENT FLOW
→ SURFACE/SERVICE/RUNTIME REALIZATION
→ FINDINGS
→ RC CLUSTERS
→ PRIORITY
→ FRONTIER
```

Coverage never starts from changed files, apps, services, CI failures, or latest commits.

## Machine coverage

`operational-root.json` is the operational coverage registry. Header flags are summaries only. Machine gates compute missing/unaccounted material items from registries.

Every category must be `APPLICABLE` or `NOT_APPLICABLE_WITH_PROOF`. Every material item requires stable ID, status/disposition and evidence references.

## Lower-layer anti-drift

`lower-layer-observations.json` prevents silent loss without leaf-first execution. `HOLD` observations cannot become current work until promoted through a proven operational parent and RC/priority placement.

## Root-cause accounting

Every material finding is assigned to `RC-NNN`, supported exclusion, or explicit more-diagnosis state. Every material open RC is comparatively ranked. New evidence that can change causal placement invalidates the affected ranking and frontier.

## Decision propagation

```text
derive if possible
→ true non-derivable decision boundary
→ resolve
→ full impact propagation
→ invalidate affected operational/causal/evidence cone
→ re-diagnose / re-rank
```

## Frontier validity

Frontier is invalid when:

```text
operational root stale/incomplete
material operational node unaccounted
lower-layer item promoted without parent/root proof
open material RC unranked
selected RC has unresolved upstream operational/root dependency
blast radius/consumers/dependencies incomplete
priority comparison not current
foreign delta changes authority/causal placement
```

Sequence number, recency and easiest fix never imply priority.
