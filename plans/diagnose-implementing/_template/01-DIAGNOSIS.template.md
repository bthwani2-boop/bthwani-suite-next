# __TASK_NAME__ — Diagnosis

Status: DERIVED_SUPPORT
PACKAGE_SCHEMA: BTHWANI_TASK_PACKAGE_V1
TASK_ID: __TASK_ID__
TASK_NAME: __TASK_NAME__
REPOSITORY: __REPOSITORY__
BRANCH: __BRANCH__
MODE: __MODE__
TARGET: __TARGET__
OBJECTIVE: __TASK_OBJECTIVE__
ORCHESTRATOR_PATH: __ORCHESTRATOR_PATH__
CREATED_AT: __CREATED_AT_ISO__
LAST_RECONCILED_AT: __LAST_RECONCILED_AT_ISO__
START_SHA: __START_SHA__
CURRENT_SHA: __CURRENT_SHA__
DIAGNOSIS_STATUS: OPEN
DISCOVERY_COMPLETE: NO
DIAGNOSIS_COMPLETE: NO
DECISION_COMPLETE: NO
COVERAGE_COMPLETE: NO
PACKAGE_READY: NO

> هذا الملف Derived Support فقط. لا يحل محل Product Truth أو Implementation/Runtime Truth. اتبع `ORCHESTRATOR_PATH` والعقود التابعة له، وأعد تثبيت `CURRENT_SHA` بعد أي drift مادي.

## 1. Truth Baseline

- Authority/Product/Policy/Product-Truth/Machine-Contract sources actually read:
- Pinned/current remote SHA evidence:
- ACTUAL truth sources:
- INTENDED/AUTHORIZED truth sources:
- Derived/historical sources used only for discovery:
- Contradictions in source hierarchy:

## 2. Capability / Evidence Limits

| Capability / Tool | Available | Actually used | Purpose | Proof limit |
|---|---|---|---|---|

## 3. Scope / Universe Inventory

### In scope

### Proven dependencies / consumers / runtime paths

### Supported exclusions

| Item | Evidence | Reason | Reopen trigger |
|---|---|---|---|

### Scope Delta Ledger

| Delta ID | Discovered item | Relation | Classification | Impact | Disposition |
|---|---|---|---|---|---|

## 4. Macro Operational Blueprint

### Domains / Actors / Responsibilities

### Major Journeys

### Canonical States / Owners / Sources of Truth

### Major Handoffs / Dependencies / Invariants

### Macro contradictions / decisions

Classify each material line as `PROVEN | INFERRED | CONTRADICTED | DECISION_REQUIRED` until resolved.

## 5. Relation Graph / Foundations

Record material nodes and edges using the orchestrator relation types: `DEPENDS_ON`, `READS_FROM`, `WRITES_TO`, `TRIGGERS`, `HANDOFF_TO`, `CONSUMED_BY`, `VISIBLE_ON`, `AUTHORIZED_BY`, `OWNS`, `IMPLEMENTS`, `VERIFIED_BY`.

| Node/Cluster | Type | Owner | Key edges | Dependency priority | Evidence |
|---|---|---|---|---|---|

## 6. Journey-by-Journey Diagnosis

For every material journey, preserve the same operational meaning across all participating surfaces/layers.

| Journey ID | Actors/Surfaces | Preconditions | Actions/Rules | States/Transitions | Handoffs | Failure/Recovery | Cross-layer/runtime readback | Status |
|---|---|---|---|---|---|---|---|---|

Core pass: logical → state/transition → forward → reverse → cross-surface → cross-layer → failure/recovery. Add temporal/concurrency/security/finance/offline/performance/provider/migration passes only when risk or evidence triggers them.

## 7. Findings Ledger

| Finding ID | Journey/Area | Evidence | Root cause or missing proof | Canonical owner | Blast radius / consumers | Current → Target | Severity/Confidence | Status |
|---|---|---|---|---|---|---|---|---|

No material Finding may disappear because a later log is green. Challenge competing root-cause hypotheses before closure.

## 8. Coverage Ledger

Allowed lifecycle states: `UNVISITED | IN_PROGRESS | PROVEN | CONTRADICTED | DECISION_REQUIRED | BLOCKED_EXTERNAL | NOT_APPLICABLE_WITH_PROOF`.

| Coverage ID | Node/Journey/Surface/Contract/Runtime path | Status | Evidence | Owner | Finding/Decision refs | Reopen trigger |
|---|---|---|---|---|---|---|

Bidirectional traceability must cover Journey → implementation/contract/state and material implementation/contract/state/route → Journey or proven N/A.

## 9. Decision Ledger

Only true decision boundaries belong here.

| Decision ID | Exact decision | Why evidence cannot resolve it | Options | Recommendation + reason | Impact/tradeoffs | User/authority decision | Status |
|---|---|---|---|---|---|---|---|

Do not ask discoverable facts. Merge overlapping questions. After every material decision, propagate through the graph and re-diagnose affected journeys/surfaces/layers before package readiness.

## 10. ACTUAL / INTENDED / DESIRED / CONFLICT

| Subject | ACTUAL | INTENDED/AUTHORIZED | DESIRED/RESOLVED | CONFLICT / disposition |
|---|---|---|---|---|

## 11. Governance Delta Candidates + Re-Diagnosis

### Governance Delta Candidates

| GOV ID | Durable rule candidate | Classification | Existing canonical owner | Status | Related decision/finding |
|---|---|---|---|---|---|

In `PREPARE_ONLY`, durable changes remain `GOVERNANCE_PROMOTION_PENDING`. In `EXECUTE_END_TO_END`, promote only resolved durable truth under valid authority.

### Re-Diagnosis after decisions / drift

Record impacted graph nodes, journeys, surfaces, contracts, assumptions and new findings after every material decision or head drift.

## 12. Final Diagnosis Gate

Before setting the metadata gates at the top to `YES`, prove:

- zero material `UNVISITED` / `UNCLASSIFIED` / `UNTRACED` / `UNOWNED`;
- zero unrecorded material Finding;
- zero unresolved material Decision required to plan safely;
- every material scope delta classified;
- macro model and affected journeys re-diagnosed after decisions;
- alternative-entry adversarial completeness pass found no new material node, or any discovered node was reopened and covered;
- current HEAD drift reconciled into `CURRENT_SHA` and `LAST_RECONCILED_AT`;
- implementation and verification can proceed without guessing.

Do not set `PACKAGE_READY: YES` merely because this document is long.
