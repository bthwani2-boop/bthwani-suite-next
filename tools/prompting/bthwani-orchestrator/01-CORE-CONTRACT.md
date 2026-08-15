# 01 — Core Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/01-CORE-CONTRACT.md`

## 1) Truth vs Orientation

رتّب الحقيقة من أحدث SHA مثبت، لكن افصل بين **truth baseline** و**task direction**:

```text
LATEST_HEAD → current implementation/repository truth + integration baseline
TARGET → resolved ORCHESTRATION_ROOT
ROOT_RECONCILED_GRAPH → navigation/frontier authority
LATEST_COMMIT → never navigation authority by recency alone
```

`plans/**` و`tools/prompting/**` Derived Support فقط.

## 2) Root-Anchored Invocation

كل invocation/resume يبدأ:

```text
resolve latest HEAD
→ restore task identity + ORCHESTRATION_ROOT
→ root/macro orientation check
→ reuse valid prior work
→ classify foreign/concurrent delta
→ reconcile macro graph
→ derive/revalidate frontier from graph
```

لا `resume latest change`، لا `continue newest commit`, ولا `follow last session` إلا إذا أثبت الـGraph أنه next dependency/frontier.

## 3) FAIL-CLOSED

```text
DEFAULT_STATE = OPEN
UNPROVEN = OPEN
KNOWN_UNRESOLVED = OPEN
STALE_EVIDENCE = OPEN for affected claim
UNACCOUNTED_MATERIAL_ITEM = OPEN
STALE_ROOT_RECONCILIATION = OPEN
INVALID_FRONTIER = OPEN
```

ممنوع ignore/defer/hide/patch-around/fake green/force push/foreign overwrite أو إسقاط Finding/Dependency/Consumer/Scope Delta.

## 4) Scope

```text
TARGET ROOT
+ Root Cause
+ Blast Radius
+ Writers/Readers/Consumers
+ Dependencies/Contracts/Data/Runtime
+ required cross-surface behavior
+ related structural residue
```

`TARGET=كل شيء` يبدأ من Macro System/Product root ثم يهبط عبر Canonical Owners/Foundations إلى التفاصيل؛ لا يبدأ من newest touched file.

## 5) Graph Motion

Orientation top-down؛ movement بعد ذلك Graph-Driven non-linear:

```text
vertical / horizontal / reverse / cross-layer / cross-surface / jump-to-root
```

Structured backtracking واجب إذا ظهر upstream cause. Start-from-root لا يعني full rescan؛ احتفظ بالأدلة غير المتأثرة.

## 6) Latest Head Discipline

قبل semantic write/integration/push:

```text
resolve latest head
→ classify delta
→ carry unrelated work without following it
→ attach related delta to correct graph node
→ re-open only affected root/graph cone
```

`LATEST HEAD GOVERNS TRUTH AND WRITES, NOT NAVIGATION.`

## 7) Frontier Gate

لا Sequence creation/resume/live write إذا:

```text
ROOT_RECONCILIATION_REQUIRED != NO
ROOT_RECONCILED_SHA != LATEST_RECONCILED_SHA
FRONTIER_DERIVATION_SOURCE != ROOT_GRAPH
FRONTIER_VALID != YES
```

For first JIT sequence, Root reconciliation passes first, then sequence creation establishes the valid frontier.

## 8) Root Cause / Decision

```text
Detect → Confirm → correlate → Root Cause → Blast Radius → Canonical Owner
→ full impact propagation → root treatment
→ migrate consumers → remove obsolete/parallel truth
→ cleanup → runtime/readback → verification
```

أي Decision يفرض impact propagation + affected re-diagnosis.

## 9) Accounting

كل Graph Node/Finding/Scope Delta/Decision/Consumer/Evidence/Cleanup item يجب أن يكون ID-addressable/dispositioned. لا final handoff/closure حتى `ACCOUNTING_COMPLETE=YES`.

## 10) Multi-Agent Safety

```text
ONE EXECUTION OWNER PER CONFLICT DOMAIN
MULTIPLE PROVEN-INDEPENDENT FRONTS MAY RUN
ONE TARGET-BRANCH INTEGRATION OWNER AT A TIME
NO STALE PUSH
NO FORCE PUSH
```

كل agent: mission + graph scope + input SHA + authority + conflict domain + expected output + handoff + invalidation trigger.

## 11) Golden Rules

```text
TARGET ROOT GOVERNS ORIENTATION.
THE GRAPH GOVERNS MOVEMENT.
ROOT CAUSE GOVERNS SCOPE.
RECENCY NEVER GOVERNS PRIORITY.
LATEST HEAD GOVERNS TRUTH/WRITES ONLY.
FOREIGN DELTA IS CLASSIFIED, NOT FOLLOWED.
ACCOUNTING PREVENTS SILENT LOSS.
DEPENDENCIES GOVERN ORDER.
INDEPENDENCE GOVERNS PARALLELISM.
EVIDENCE GOVERNS CLOSURE.
UNPROVEN = OPEN.
```
