# 05 — Reverify, Re-diagnose, and Repeat the Deletion Loop

## Purpose

بعد كل Deletion Closure Unit، لا تستخدم قائمة ثابتة ولا تنتقل تلقائيًا إلى Finding تاريخية. أعد بناء حالة الحذف من Exact New `g`.

## 1. Immediate post-unit verification

بعد الحذف:

```text
TARGETED TESTS / BUILD / TYPECHECK / LINT AS APPLICABLE
→ RUNTIME / ROUTE / CONFIG CHECK AS APPLICABLE
→ DATA READBACK AS APPLICABLE
→ CONTRACT / GENERATED PARITY AS APPLICABLE
→ REFERENCE SEARCH
→ NEGATIVE SPACE
→ REQUIRED-BEHAVIOR FALSIFICATION
→ NO UNRELATED ACCIDENTAL DIFF
```

إذا فشل أي عنصر مادي:

`UNIT=OPEN`.

## 2. Push and re-pin

قبل Push:

```text
FETCH REMOTE g
→ EXPECTED_REMOTE_G_SHA == ACTUAL_REMOTE_G_SHA
```

إذا تغير:

```text
COMPARE
→ INVALIDATE AFFECTED EVIDENCE
→ RE-PIN
→ RE-EVALUATE CURRENT UNIT
```

إذا لم يتغير:

```text
COMMIT COHERENT DELETION CLOSURE UNIT
→ PUSH DIRECTLY TO g
→ FETCH
→ VERIFY REMOTE SHA
→ PIN NEW EXACT SHA
```

## 3. Refresh the deletion model

بعد كل New SHA حدّث:

```text
CURRENT_TRACKED_TREE
CURRENT_LIVE_USE_MODEL
REQUIRED_SURVIVOR_MODEL
DELETION_CANDIDATES
REMOVAL_DELTA
BLOCKED_UNKNOWNS
EVIDENCE_VALIDITY
```

الحذف السابق قد يجعل Artifacts جديدة يتيمة. لذلك لا تعتمد على Census القديمة كما هي.

مثال:

```text
remove obsolete package
→ parent barrel becomes empty
→ dependency becomes unused
→ fixture tree loses last consumer
→ workflow job becomes dead
```

هذه ليست Scope creep؛ هذه Residue سببية ويجب التقاطها.

## 4. Dynamic deletion graph

أعد synthesis:

```text
NEWLY_ORPHANED
NEWLY_UNUSED
NEWLY_UNREACHABLE
LOSING_AUTHORITIES_REMAINING
COMPATIBILITY_RESIDUE
MANIFEST_DEPENDENCY_RESIDUE
TEST_FIXTURE_RESIDUE
CONFIG_ROUTE_RESIDUE
```

ثم أعد ترتيب Closure Units من الأدلة الحية.

Historical Finding لا يملك Scheduling Authority.

## 5. Re-baseline triggers

نفذ Partial أو Full Census جديد إذا تغير ماديًا:

```text
top-level topology
workspace/package graph
runtime entrypoints
route graph
config composition
contract/generated lineage
data/schema ownership
script/workflow graph
build/bootstrap/upgrade path
```

أو إذا أزال الحذف Owner كان يملك fanout كبيرًا.

## 6. Evidence invalidation

لا تعيد استخدام Proof قديم إذا تغيرت assumptions التي اعتمد عليها.

مثال:

```text
ZERO_CALLERS proof at SHA A
!= automatically valid at SHA B
```

أعد Search/Graph/Verification عندما يمس التغيير المسار أو consumer graph.

## 7. Unknown handling

إذا ظهر Unknown جديد:

```text
UNKNOWN_AFFECTS_DELETION_SAFETY=YES
→ BLOCK CANDIDATE
→ RESOLVE UNKNOWN BEFORE DELETE
```

لا تستخدم Error/Missing/Unreachable tooling كدليل عدم استعمال.

```text
FAILED SEARCH != ZERO REFERENCES
MISSING BUILD != DEAD CODE
UNAVAILABLE ENV != UNUSED CONFIG
404 != UNUSED ROUTE
```

## 8. Candidate lifecycle

الحالات المسموحة:

```text
SUSPECTED
EVIDENCE_COLLECTION
KEEP_PROVEN
DELETE_PROVEN
RETIRE_AFTER_PROVEN_CUTOVER
BLOCKED_BY_UNKNOWN
EXECUTING
OPEN_RESIDUE
CLOSED
```

`CLOSED` تعني حذف Artifact وكل residue السببية وإثبات Negative Space.

## 9. No fixed queue

لا تستخدم:

```text
STATIC_ROOT_QUEUE
OLD_ROOT_ID_ORDER
HISTORICAL_FINDING_ORDER
FIRST_RED_NEXT
EASIEST_DELETE_NEXT
```

استخدم:

```text
REFRESHED g
→ LIVE-USE MODEL
→ REMOVAL DELTA
→ DYNAMIC DELETION GRAPH
→ HIGHEST PROVEN EXECUTABLE UNIT
```

## 10. When graph reaches zero

`DELETION_GRAPH=0` لا يعني Completion.

نفذ:

```text
FRESH BRANCH-WIDE ADVERSARIAL RE-CENSUS
```

من Actual Tracked Tree على Exact Candidate SHA.

أعد فحص:

```text
EVERY MATERIAL ARTIFACT RIGHT TO EXIST
ORPHANED FILES/DIRECTORIES
UNUSED SYMBOLS/EXPORTS
UNUSED PACKAGES/DEPENDENCIES
DEAD ROUTES/APIS
DEAD ENTRYPOINTS
DEAD CONFIG/ENV
DEAD SCRIPTS/WORKFLOWS
STALE TEST/FIXTURE/MOCK/SNAPSHOT
SUPERSEDED AUTHORITIES
COMPATIBILITY RESIDUE
GENERATED/MANUAL REPAIR RESIDUE
DEAD DATA/SCHEMA RESIDUE
STALE ASSETS/MANIFESTS
OBSOLETE PLAN/GOVERNANCE AUTHORITY
FILESYSTEM NOISE
```

أي Finding مادي يعيد فتح Dynamic Deletion Graph.

## 11. Stop condition

انتقل إلى `06` فقط عندما:

```text
DYNAMIC_DELETION_GRAPH=0
KNOWN_DELETE_PROVEN_NOT_EXECUTED=0
KNOWN_RETIRE_AFTER_CUTOVER_NOT_EXECUTED=0
KNOWN_OPEN_RESIDUE=0
KNOWN_MATERIAL_UNKNOWNS_AFFECTING_CLEANUP=0
FRESH_FULL_G_RE_CENSUS=PASS
```
