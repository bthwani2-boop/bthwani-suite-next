# 01 — Core Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/01-CORE-CONTRACT.md`

## 1) Truth vs Orientation vs Priority vs Isolation

```text
INTEGRATION_TARGET/LATEST_HEAD → current implementation/repository truth + final delivery baseline
TARGET → resolved ORCHESTRATION_ROOT
ROOT_RECONCILED_GRAPH → navigation/dependency authority
ROOT_CAUSE_LANDSCAPE → material causal problem map
SYSTEMIC_PRIORITY_MODEL → frontier selection authority
TASK_BRANCH/WORKSPACE → isolated working context
LATEST_COMMIT → never navigation/priority authority by recency alone
```

`plans/**` و`tools/prompting/**` Derived Support فقط.

## 2) Invocation Contract

```text
NEW INVOCATION → NEW PACKAGE BY DEFAULT
EXPLICIT USER RESUME → exact previous package only
```

ممنوع استئناف آخر Package مفتوحة أو آخر Session أو latest changed files تلقائيًا. الحزم السابقة مصادر Evidence/Findings/Decisions قابلة لإعادة التحقق فقط.

New invocation:

```text
resolve latest integration target
→ unique task/package identity
→ dedicated task branch
→ isolated workspace
→ new package
→ root/macro reconciliation
→ target-wide gap/root-cause landscape
→ root-cause clustering + priority model
→ graph/frontier derivation
```

Explicit resume:

```text
exact package requested by user
→ validate package/task branch/target/mode/root
→ latest target reconciliation
→ task-isolation gate
→ root/landscape reconciliation
→ stale-evidence + stale-priority invalidation
→ resume correct graph position
```

## 3) Task Isolation

```text
TASK_CONTEXT_POLICY = ISOLATED_CURRENT_TASK_ONLY
FOREIGN_DELTA_POLICY = INPUT_NOT_INSTRUCTION
DIRECT_INTEGRATION_TARGET_WRITES = FORBIDDEN_EXCEPT_INTEGRATION_OWNER
```

Local writes require dedicated Task Branch + Worktree.
Remote/API-only writes require dedicated Task Branch and every write must target it explicitly.
Read-only workers may operate against pinned refs without an isolated worktree.

No writing worker may use `INTEGRATION_TARGET` as its normal working branch.

## 4) FAIL-CLOSED

```text
DEFAULT_STATE = OPEN
UNPROVEN = OPEN
KNOWN_UNRESOLVED = OPEN
STALE_EVIDENCE = OPEN for affected claim
UNACCOUNTED_MATERIAL_ITEM = OPEN
UNCLUSTERED_MATERIAL_FINDING = OPEN
UNRANKED_MATERIAL_ROOT_CAUSE = OPEN
STALE_ROOT_RECONCILIATION = OPEN
STALE_PRIORITY_MODEL = OPEN
INVALID_FRONTIER = OPEN
TASK_BRANCH_NOT_READY = OPEN
WORKSPACE_ISOLATION_NOT_PROVEN = OPEN
INTEGRATION_NOT_COMPLETE = OPEN for final closure
```

ممنوع ignore/defer/hide/patch-around/fake green/force push/foreign overwrite أو إسقاط Finding/Dependency/Consumer/Scope Delta/Root-Cause Cluster.

## 5) Scope

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

## 6) Graph Motion

Orientation top-down؛ movement بعد ذلك Graph-Driven non-linear:

```text
vertical / horizontal / reverse / cross-layer / cross-surface / jump-to-root
```

Structured backtracking واجب إذا ظهر upstream cause. Start-from-root لا يعني full rescan؛ احتفظ بالأدلة غير المتأثرة.

## 7) Root-Cause Landscape / Priority

قبل التنفيذ اجمع Findings المادية ضمن Root-Cause Clusters `RC-NNN` ثم رتّبها مقارنةً بالأدلة.

```text
PRIORITY = HIGHEST PROVEN SYSTEMIC LEVERAGE
```

العوامل الحاكمة:

```text
UPSTREAM / ROOT-CAUSE DEPTH
→ BLOCKING POWER
→ CANONICAL / FOUNDATION IMPORTANCE
→ BLAST RADIUS
→ RISK / SEVERITY
→ UNLOCK VALUE
→ FINDING DENSITY / RECURRENCE
→ STRUCTURAL-DEBT MULTIPLIER
```

لا score ميكانيكي أعمى. كثرة Findings إشارة مهمة لكنها لا تتغلب تلقائيًا على Root Cause أعلى أو أخطر أو أكثر فتحًا للنظام.

محظور أن تحدد الأولوية: `RECENCY / MOST_FINDINGS_ALONE / MOST_CHANGED_FILES / EASIEST_FIX / LAST_SESSION / SEQUENCE_NUMBER`.

إذا كانت causal uncertainty قادرة على تغيير الترتيب، زد التشخيص قبل الكتابة.

## 8) Latest Head Discipline

قبل semantic write/integration/push:

```text
resolve latest INTEGRATION_TARGET head
→ classify delta
→ carry unrelated work without following it
→ attach related delta to correct graph/root-cause cluster
→ re-open only affected root/landscape/priority/evidence cone
```

`LATEST HEAD GOVERNS TRUTH AND INTEGRATION, NOT NAVIGATION OR PRIORITY.`

## 9) Root + Landscape + Isolation + Frontier Gate

لا Sequence creation/resume/live write إذا:

```text
ROOT_RECONCILIATION_REQUIRED != NO
ROOT_RECONCILED_SHA != LATEST_RECONCILED_SHA
TARGET_LANDSCAPE_COMPLETE != YES
LANDSCAPE_RECONCILED_SHA != LATEST_RECONCILED_SHA
ROOT_CAUSE_CLUSTERING_COMPLETE != YES
ROOT_CAUSE_CLUSTERS_ACCOUNTED != YES
UNCLUSTERED_MATERIAL_FINDINGS != 0
PRIORITY_MODEL_COMPLETE != YES
PRIORITY_DERIVATION_SOURCE != ROOT_CAUSE_LANDSCAPE
UNRANKED_MATERIAL_CLUSTERS != 0
PRIMARY_FRONTIER_JUSTIFIED != YES
LANDSCAPE_ADVERSARIAL_PASS != YES
PRIORITY_POLICY != HIGHEST_PROVEN_SYSTEMIC_LEVERAGE
FRONTIER_DERIVATION_SOURCE != ROOT_GRAPH
FRONTIER_VALID != YES
TASK_BRANCH_READY != YES
WORKSPACE_ISOLATION_READY != YES
TASK_BRANCH == INTEGRATION_TARGET
```

For first JIT sequence, Root + Landscape/Priority reconciliation passes first, then sequence creation establishes the valid frontier.

## 10) Root Cause / Decision

```text
Detect → Confirm → correlate → Root Cause → Blast Radius → Canonical Owner
→ compare systemic leverage
→ full impact propagation → root treatment
→ migrate consumers → remove obsolete/parallel truth
→ cleanup → runtime/readback → verification
```

أي Decision يفرض impact propagation + affected re-diagnosis + affected re-ranking when causal placement/leverage changes.

## 11) Accounting

كل Graph Node/Finding/Root-Cause Cluster/Scope Delta/Decision/Consumer/Evidence/Cleanup item يجب أن يكون ID-addressable/dispositioned. لا final handoff/closure حتى `ACCOUNTING_COMPLETE=YES`، وكل Finding مادية clustered/dispositioned وكل Cluster مادية ranked.

## 12) Multi-Agent Safety

```text
ONE EXECUTION OWNER PER CONFLICT DOMAIN
ONE WRITING WORKER PER ISOLATED WORKSPACE
MULTIPLE PROVEN-INDEPENDENT PRIORITY FRONTS MAY RUN
ONE INTEGRATION OWNER PER INTEGRATION TARGET
NO STALE PUSH
NO FORCE PUSH
```

كل agent: mission + graph scope + input SHA + authority + conflict domain + workspace/branch + expected output + handoff + invalidation trigger.

## 13) Integration Contract

Task branch success is not target closure.

```text
TASK_BRANCH
→ latest-target reconciliation
→ semantic rebuild/rebase
→ invalidated verification
→ affected landscape/priority reconciliation
→ serialized Integration Owner
→ target integration
→ INTEGRATION_COMPLETE=YES
→ target candidate freeze
→ final read-only verification
```

Final candidate/head semantics refer to the Integration Target after integration.

## 14) Golden Rules

```text
NEW INVOCATION CREATES A NEW PACKAGE.
OLD PACKAGE RESUME REQUIRES EXPLICIT USER INTENT.
TARGET ROOT GOVERNS ORIENTATION.
THE GRAPH GOVERNS MOVEMENT.
ROOT CAUSE GOVERNS SCOPE.
SYSTEMIC LEVERAGE GOVERNS PRIORITY.
MOST FINDINGS ALONE NEVER GOVERNS PRIORITY.
RECENCY NEVER GOVERNS PRIORITY.
LATEST HEAD GOVERNS TRUTH/INTEGRATION ONLY.
FOREIGN DELTA IS INPUT, NOT INSTRUCTION.
TASK BRANCH/WORKSPACE ISOLATES WRITES.
INTEGRATION TARGET IS NOT A SHARED WORKING BRANCH.
ACCOUNTING PREVENTS SILENT LOSS.
DEPENDENCIES GOVERN ORDER.
INDEPENDENCE GOVERNS PARALLELISM.
EVIDENCE GOVERNS CLOSURE.
UNPROVEN = OPEN.
```
