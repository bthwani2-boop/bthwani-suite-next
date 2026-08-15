# 02 — Discovery & Diagnosis

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY

## Governing diagnosis

```text
PRE-FLIGHT
→ BOUNDED OPERATIONAL BREADTH PASS
→ MACHINE OPERATIONAL COVERAGE
→ COMPETITIVE DEEPENING
→ TARGET FINDINGS
→ ROOT-CAUSE CLUSTERING
→ SYSTEMIC RANKING
→ FRONTIER
```

**Deep Journey/State/Authority/Handoff diagnosis needed to establish operational coverage occurs before first Frontier.** This supersedes any older order that placed deep journey diagnosis after frontier derivation.

## Operational breadth pass

Map material scope at sufficient breadth before technical prioritization:

```text
Product outcomes / expected operational results
Actors / authority / responsibility
Journeys / entry / outcome / failure / recovery
States / transitions / actions / preconditions / invariants
Cross-surface handoffs / responsibility transfer
Canonical truth owners / writers / readers / consumers
Data / contract / API / persistence / event/readback flow
Surfaces/services implementing those meanings
Runtime/security/infra/CI/observability/governance boundaries
```

Use `operational-root.json` as machine registry. Every category is `APPLICABLE` with accounted material items or `NOT_APPLICABLE` with evidence-backed exclusion.

## Top-down, evidence in both directions

Orientation is top-down. Evidence collection may move reverse/vertical/horizontal/cross-layer/cross-surface. Repository/code/DB/runtime may expose missing operational nodes; when they do, escalate the observation upward before fixing.

## Lower-layer observations

Technical defects discovered before parent/root placement go to `lower-layer-observations.json` as `HOLD`. Never ignore them and never execute them merely because they are concrete/easy/first failure.

## Competitive deepening

After breadth coverage, deepen only hypotheses capable of changing the winning systemic root:

```text
can become highest root
OR can invalidate current winner
OR blocks current winner
OR materially changes authority/blast-radius/risk/unlock
```

This prevents both shallow diagnosis and expensive full-deep-scan of low-leverage leaves.

## Negative-space / adversarial operational pass

Actively search for:

```text
missing actor/authority/responsibility
journey with no owner/outcome/recovery
state or transition not reachable/read back consistently
handoff with orphan responsibility
hidden writer/reader/consumer
parallel canonical truth
surface meaning mismatch
missing failure/cancel/retry/idempotency path
technical route/API/job/event with no operational parent
operational outcome with no implementation path
```

Any material discovery reopens affected coverage and downstream priority provenance.

## Root-cause landscape

Only after operational gate PASS, correlate findings into `RC-NNN` clusters. `20 findings != 20 sequences`. Priority is comparative systemic leverage, not count/ease/recency.

## Diagnosis unit after frontier

Sequence deepening remains:

```text
Journey × Multi-Surface × Cross-Layer
Forward + Reverse + Temporal + Failure/Recovery + Adversarial
```

but it may refine/expand an already operationally-accounted node; if it discovers an upstream root that changes priority, suspend and re-rank rather than continue mechanically.
