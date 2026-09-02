# 04 — Cleanup, Deletion, Residue Removal, Naming and Topology

## Purpose

هذا الملف هو Enforcement Gate الفعلي للحذف الكامل. لا يكفي حذف Source رئيسي؛ يجب حذف كل residue التي فقدت حقها في الوجود بسببه.

القانون:

```text
CUTOVER COMPLETE
→ DELETE LOSING ARTIFACT
→ DELETE ALL PROVEN NON-REQUIRED RESIDUE
→ PROVE NEGATIVE SPACE
```

## 1. Universal deletion safety gate

قبل حذف أي Material Artifact أثبت حيث applicable:

```text
ZERO_REQUIRED_IMPORTS
ZERO_REQUIRED_EXPORTS_REEXPORTS
ZERO_REQUIRED_CALLERS
ZERO_REQUIRED_RUNTIME_ROUTES
ZERO_REQUIRED_ENTRYPOINTS
ZERO_REQUIRED_MUTABLE_WRITERS
ZERO_REQUIRED_READERS
ZERO_REQUIRED_CONFIG_ENV_REFERENCES
ZERO_REQUIRED_SCRIPT_WORKFLOW_INVOCATIONS
ZERO_REQUIRED_CONTRACT_GENERATED_REFERENCES
ZERO_REQUIRED_TEST_FIXTURE_MOCK_SNAPSHOT_DEPENDENCY
ZERO_REQUIRED_DATA_SCHEMA_MIGRATION_DEPENDENCY
ZERO_SUPPORTED_BOOTSTRAP_UPGRADE_RECOVERY_DEPENDENCY
ZERO_REQUIRED_EXTERNAL_CONTRACT_DEPENDENCY
ZERO_REQUIRED_OPERATIONAL_RUNBOOK_DEPENDENCY
```

ثم:

```text
DELETE
→ SEARCH REFERENCES AGAIN
→ VERIFY BUILD/RUNTIME/TESTS AS APPLICABLE
→ NEGATIVE-SPACE PROOF
```

## 2. Files and symbols

احذف:

```text
unreferenced dead symbols
superseded implementations
unused exports
unused re-exports
files whose final required responsibility disappeared
manual copies replaced by surviving authority
patch helpers that only served deleted behavior
```

بعد الحذف افحص barrels/index files/public API surfaces/type exports.

## 3. Directories and package trees

Directory لا تبقى كأرشيف حي.

بعد إزالة محتواها المطلوب:

```text
EMPTY_DIRECTORY → DELETE
OBSOLETE_PACKAGE_TREE → DELETE WHOLE TREE
```

افحص:

```text
workspace manifests
package.json dependencies/scripts
path aliases
tsconfig references
build config
lint/test config
Docker/compose/runtime references
CI paths
CODEOWNERS/governance references where material
```

## 4. Dependencies

Dependency تصبح deletable فقط إذا ثبت:

```text
ZERO_REQUIRED_DIRECT_IMPORTS
ZERO_REQUIRED_DYNAMIC_LOADS
ZERO_REQUIRED_BUILD_TOOL_USAGE
ZERO_REQUIRED_SCRIPT_USAGE
ZERO_REQUIRED_WORKFLOW_USAGE
ZERO_REQUIRED_GENERATION_USAGE
```

ثم:

```text
REMOVE MANIFEST ENTRY
→ UPDATE LOCKFILE USING PROJECT-CANONICAL PACKAGE MANAGER
→ VERIFY NO UNEXPECTED DEPENDENCY GRAPH DAMAGE
```

لا تحذف Transitive Dependency مباشرة من lockfile يدويًا كترقيع.

## 5. APIs, routes and runtime entrypoints

قبل حذف API/Route/Handler/Command:

```text
ZERO_REQUIRED_CALLERS
ZERO_REQUIRED_EXTERNAL_CONSUMERS
ZERO_REQUIRED_INTERNAL_CONSUMERS
ZERO_ROUTE_REGISTRATION
ZERO_DISCOVERY_REGISTRY_REFS
ZERO_CONFIG_SELECTABILITY
ZERO_DOCUMENTED_SUPPORTED_CONTRACT
```

إذا كان Endpoint قديمًا لكن ما يزال Supported External Contract:

`KEEP_PROVEN` أو `RETIRE_AFTER_PROVEN_CUTOVER`، وليس `DELETE_PROVEN`.

## 6. Config and environment

احذف Config/Env binding فقط بعد إثبات:

```text
ZERO_REQUIRED_READERS
ZERO_REQUIRED_DEPLOYMENT_BINDINGS
ZERO_REQUIRED_SECRET_MAPPING
ZERO_REQUIRED_WORKFLOW_REFERENCES
ZERO_REQUIRED_RUNTIME_FALLBACK
```

ممنوع تحويل obsolete config إلى fallback صامت يبقيه حيًا.

## 7. Scripts, CLI and workflows

لكل Script/Workflow افحص:

```text
package script invocation
CI workflow_call / workflow_dispatch / schedule / push / PR triggers
other workflow references
operator documentation
release/deploy/bootstrap usage
data mutation capability
```

Script أو Workflow غير مستدعى محليًا ليس ميتًا تلقائيًا.

إذا ثبت dead:

```text
DELETE FILE
→ DELETE CALL SITES
→ DELETE MANIFEST COMMANDS
→ DELETE DOC/RUNBOOK REFERENCES
→ VERIFY NO AUTOMATION PATH REFERENCES IT
```

## 8. Tests, fixtures, mocks, snapshots

تصنيفها يكون حسب Truth التي تحميها:

```text
LIVE_REQUIRED_TRUTH → KEEP / MIGRATE
RETIRED_TRUTH_ONLY → DELETE
DUPLICATE_REDUNDANT_WITH_NO_UNIQUE_GUARD → DELETE_PROVEN
UNKNOWN_GUARD_VALUE → BLOCKED_BY_UNKNOWN
```

بعد حذف Production Artifact افحص residue الاختبارية التابعة له كاملة.

## 9. Contracts and generated artifacts

احذف:

```text
handwritten DTO copies
manual enum copies
generated overlays
manual generated edits
keep-in-sync mappers
repair intersections / Omit layers
```

فقط عندما يثبت أنها Losing Copies وأن كل Required Consumers انتقلت إلى authoritative existing source.

بعدها:

```text
REGENERATE
→ VERIFY EXPECTED GENERATED DIFF
→ ZERO LOSING-COPY REFERENCES
```

## 10. Database, schema, storage and migrations

هذه أعلى فئة حساسية.

لا تحذف Table/Column/Index/Seed/Storage Truth قبل:

```text
DATA INVENTORY
→ PROVEN TARGET REQUIRED TRUTH
→ MIGRATION
→ BACKFILL / RECONCILIATION
→ WRITER CUTOVER
→ READER CUTOVER
→ PERSISTED READBACK
→ ZERO REQUIRED DATA LOSS
→ SUPPORTED UPGRADE / BOOTSTRAP / RECOVERY PROOF
```

ثم فقط:

`REMOVE OBSOLETE STORAGE`.

Historical migrations لا تحذف لمجرد القدم. يجب إثبات أنها غير لازمة لكل Supported installation/upgrade/recovery path.

## 11. Assets and manifests

افحص الصور/fonts/bundles/static files/native manifests/app configs:

```text
code references
runtime URI references
manifest references
build bundling
native resource lookup
web public paths
store/app metadata where applicable
```

عدم وجود import صريح لا يثبت dead asset.

## 12. Docs, plans and governance

إذا كانت Artifact وثائقية جزءًا من Live Execution Authority، فهي Material.

احذفها فقط عندما:

```text
AUTHORITY_ENDED_OR_SUPERSEDED=PROVEN
ZERO_LIVE_EXECUTION_REFERENCES=PROVEN
ZERO_OPERATOR_DEPENDENCY=PROVEN
```

لا تنقلها إلى `archive/old/history` داخل Live Tree لمجرد الاحتفاظ بها. Git History هو archive.

## 13. Naming/path cleanup — narrow scope only

هذه الحملة ليست Rename Campaign عامة.

Naming/Path mutation يسمح فقط عندما:

1. حذف Losing Artifact يترك اسمًا يشير إلى شيء لم يعد موجودًا، أو
2. اسم/مسار بقايا هو نفسه Artifact غير مطلوب، أو
3. Rename ضروري لإكمال Cutover إلى surviving owner المثبت.

ابحث بعد كل حذف عن:

```text
old
new
legacy
v2
v3
tmp
temp
copy
backup
fixed
final
```

لكن لا تحذف/تغير بناءً على الاسم وحده.

## 14. Compatibility residue

بعد اكتمال Cutover:

```text
compat adapter
fallback
alias
old route
old env key
old export
old mapping
translation shim
keep-in-sync code
```

يجب أن يثبت Required Responsibility مستقلة أو يُحذف.

ممنوع `UNBOUNDED_COMPATIBILITY`.

## 15. Parent/child residue sweep

كل Deletion Unit يجب أن تفحص أعلى وأسفل Artifact المحذوف:

```text
PARENT BARREL / INDEX
PARENT DIRECTORY
PACKAGE MANIFEST
WORKSPACE
DEPENDENTS
TEST TREE
CONFIG TREE
DOCS / RUNBOOK
CI
GENERATED OUTPUT
LOCKFILE
```

هدفنا ليس ترك قشرة فارغة بعد حذف الداخل.

## 16. Negative-space proof

بعد كل Unit نفذ Searches موجهة لأسماء ومسارات ورموز وContracts وConfig keys وRoutes المحذوفة.

النتيجة المطلوبة:

```text
OLD_SYMBOL_REFS=0
OLD_PATH_REFS=0
OLD_IMPORT_REFS=0
OLD_EXPORT_REFS=0
OLD_ROUTE_REFS=0
OLD_CONFIG_REFS=0
OLD_SCRIPT_WORKFLOW_REFS=0
OLD_TEST_FIXTURE_REFS=0
OLD_RUNTIME_REACHABILITY=0
LOSING_AUTHORITY_REACHABILITY=0
```

أي نتيجة مادية تعيد Unit إلى `OPEN`.

## 17. No cosmetic cleanup

ممنوع:

```text
legacy → archive
old → history
duplicate → common
misc → utils
two authorities → shared wrapper
unused → disabled forever
```

التنظيف الصحيح:

```text
PROVE NOT REQUIRED
→ MIGRATE REQUIRED DEPENDENTS IF ANY
→ CUT OVER
→ DELETE
→ DELETE RESIDUE
→ PROVE ZERO REFERENCES
```
