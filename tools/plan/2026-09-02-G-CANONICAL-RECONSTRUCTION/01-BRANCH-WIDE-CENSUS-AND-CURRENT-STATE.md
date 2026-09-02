# 01 — Branch-Wide Deletion Census and Current Live-Use State

## Purpose

ابنِ Census كاملًا من **Actual Tracked Tree** على Exact Pinned `g` لاكتشاف كل ما قد يكون ميتًا أو يتيمًا أو متروكًا أو غير مستخدم أو Superseded، من دون حذف أي شيء أثناء الاكتشاف.

الهدف في هذه المرحلة ليس تقييم جودة التصميم العامة؛ الهدف هو إثبات:

```text
WHAT EXISTS?
WHAT IS REQUIRED TODAY?
WHAT IS ACTUALLY REACHABLE?
WHAT HAS NO REQUIRED CONSUMER?
WHAT IS A LOSING / SUPERSEDED AUTHORITY?
WHAT CANNOT YET BE SAFELY DISPOSITIONED?
```

## 1. Start from exact live g

```text
FETCH REMOTE g
→ RESOLVE EXACT COMMIT SHA
→ PIN SHA
→ ENUMERATE ACTUAL TRACKED TREE
→ INVALIDATE SHA-SPECIFIC EVIDENCE FROM OTHER SHAS
```

لا تستخدم قائمة مجلدات مفترضة لتحديد Scope.

## 2. Census universe

Traverse كل Material Top-Level Entry وكل Material Subtree، بما في ذلك حيث يوجد:

```text
applications / surfaces
services / domains
core / shared
packages / modules
database / schema
migrations / seeds / bootstrap
contracts / generated
runtime / config / env
infra / topology
scripts / CLI / tooling
workflows / actions
tests / fixtures / mocks / snapshots
dependencies / plugins
assets / manifests
governance / docs / plans when live-authority material
```

وكذلك كل Material:

```text
line
symbol
function
type
component
hook
module
file
directory
package
service
route
API
DTO
enum
schema object
migration
seed
runtime path
config binding
script
workflow
test
fixture
mock
dependency
export / re-export
```

## 3. Evidence to collect per artifact

لكل Artifact سجّل على الأقل:

```text
PATH / SYMBOL
TYPE
DECLARED PURPOSE
PROVEN CURRENT RESPONSIBILITY
OWNER
WRITER_IF_MUTABLE
READERS
IMPORTERS
CALLERS
EXPORTS_REEXPORTS
RUNTIME_ENTRYPOINT_REACHABILITY
BUILD_REACHABILITY
CONFIG_REFERENCES
SCRIPT_WORKFLOW_INVOCATIONS
TEST_FIXTURE_MOCK_REFERENCES
CONTRACT_GENERATED_LINEAGE
DATA_SCHEMA_RELATIONSHIP
BOOTSTRAP_MIGRATION_UPGRADE_RELATIONSHIP
EXTERNAL_CONTRACT_DEPENDENCY
DUPLICATE_OR_SUPERSEDED_BY
LASTING_REQUIRED_BEHAVIOR
DELETION_RISK
EVIDENCE_PROVENANCE
DISPOSITION
```

## 4. Candidate discovery classes

ابحث صراحة عن:

```text
ORPHANED_FILES
ORPHANED_DIRECTORIES
EMPTY_OR_EFFECTIVELY_EMPTY_DIRECTORIES
UNREFERENCED_SYMBOLS
UNUSED_EXPORTS_REEXPORTS
UNUSED_PACKAGES
UNUSED_DEPENDENCIES
DEAD_ROUTES
DEAD_APIS
DEAD_RUNTIME_ENTRYPOINTS
DEAD_SCRIPTS
DEAD_WORKFLOWS
STALE_CONFIG
STALE_ENV_BINDINGS
STALE_FEATURE_FLAGS
STALE_TESTS
STALE_FIXTURES
STALE_MOCKS
STALE_SNAPSHOTS
SUPERSEDED_IMPLEMENTATIONS
DUPLICATE_LOSING_AUTHORITIES
OBSOLETE_COMPATIBILITY_LAYERS
GENERATED_MANUAL_REPAIR_RESIDUE
PATCH_RESIDUE
OLD_TEMP_BACKUP_COPY_FINAL_V2_V3_ARTIFACTS
UNREACHABLE_ASSETS
OBSOLETE_MANIFEST_ENTRIES
OBSOLETE_GOVERNANCE_OR_PLAN_AUTHORITY
```

الأسماء `old/new/legacy/v2/v3/tmp/temp/copy/backup/fixed/final` هي **probes فقط** وليست دليل حذف.

والـbuckets مثل `common/utils/helpers/misc/shared/core` هي probes لوجود residue أو misplaced ownership، وليست هدف إعادة هيكلة تلقائي.

## 5. Reachability proof

لا يكفي بحث نصي واحد.

استخدم عند المادية مزيجًا من:

```text
repository search
import / export graph
dependency graph
call graph
runtime entrypoint analysis
route registration
config composition
package manifests
workspace references
build scripts
workflow invocation
contract generation lineage
database migration/bootstrap path
tests and fixtures
CI / CodeQL / Sonar / Semgrep / reviews as evidence
```

Tool finding لا يقرر الحذف وحده.

## 6. Required-vs-not-required decision

لكل Candidate طبّق:

### KEEP_PROVEN

يجب أن يوجد دليل مادي على Responsibility حالية مطلوبة، مثل:

```text
required runtime consumer
required build/bootstrap consumer
required mutable writer or reader
required external contract
required data migration/upgrade path
required security/operational responsibility
required test protecting live behavior
required generator source
```

### DELETE_PROVEN

يجب أن يوجد دليل أن Artifact لا يملك Required Responsibility وأن حذفه لا يفقد Truth مطلوبة.

### RETIRE_AFTER_PROVEN_CUTOVER

استخدمها عندما Artifact خاسر لكن لديه Consumers لازالوا مطلوبين. المطلوب هنا ليس إبقاءه، بل تحديد Migration/Cutover كامل قبل الحذف.

### BLOCKED_BY_UNKNOWN

أي Unknown قد يغير Requiredness أو Migration direction يمنع الحذف.

```text
UNKNOWN != UNUSED
NO_SEARCH_HIT != DEAD
NO_RUNTIME_CALL != SAFE_TO_DELETE_MIGRATION
OLD != OBSOLETE
TEST_ONLY != UNNECESSARY
GENERATED != DISPOSABLE
```

## 7. Special high-risk classes

### Database migrations / schema / seeds

لا تصنف Migration قديمة كميتة لمجرد أن Runtime لا يستدعيها.

أثبت أثرها على:

```text
fresh bootstrap
supported upgrades
recovery / replay
production data lineage
backfill / reconciliation
schema ownership
```

### Contracts / generated code

قد يكون Generated Artifact غير مستورد مباشرة لكنه جزء من generation/build/package contract. افحص lineage كاملة.

### CI / workflows / scripts

عدم التشغيل محليًا لا يعني أنها ميتة. افحص triggers، reusable workflows، package scripts، scheduled/manual operations، release/bootstrap usage.

### Tests / fixtures / mocks

لا تحذف Test فقط لأنه لا يلمس Runtime. أثبت أنه لا يحمي Behavior/Contract/Regression مطلوبًا، أو أنه تابع حصريًا لArtifact تم حذفه.

### Docs / plans / governance

احذف فقط إذا كانت Live Authority أو execution reference قد انتهت أو استبدلت، ولا يوجد Consumer/Workflow/Operator يعتمد عليها.

## 8. Current live-use model

أنشئ Model واحدًا لـ`CURRENT g` من منظور الإبقاء/الحذف:

```text
REQUIRED_ARTIFACTS
REQUIRED_OWNERS
REQUIRED_WRITERS
LIVE_READERS
LIVE_CONSUMERS
LIVE_ENTRYPOINTS
LIVE_ROUTES
LIVE_CONFIG
LIVE_SCRIPTS_WORKFLOWS
LIVE_CONTRACT_GENERATED_LINEAGE
LIVE_DATA_MIGRATION_UPGRADE_PATHS
CANDIDATE_DEAD_ARTIFACTS
LOSING_AUTHORITIES
BLOCKED_UNKNOWNS
```

لا تنتقل إلى ملف `02` إذا بقي Unknown يمكن أن يحوّل Candidate من deletable إلى required.

## 9. Census output

يجب أن ينتج Census قائمة disposition كاملة ماديًا:

```text
TOTAL_MATERIAL_ARTIFACTS_CONSIDERED=
KEEP_PROVEN=
DELETE_PROVEN=
RETIRE_AFTER_PROVEN_CUTOVER=
BLOCKED_BY_UNKNOWN=
```

ومع كل Candidate:

```text
CANDIDATE_ID=
ARTIFACT=
WHY_SUSPECTED=
PROVEN_RESPONSIBILITY=
LIVE_CONSUMERS=
REACHABILITY=
SURVIVING_OWNER_IF_ANY=
MIGRATION_REQUIRED=
DELETION_PROOF=
NEGATIVE_SPACE_PROBES=
RISK=
STATUS=
```

## 10. Mutation rule

هذه المرحلة Read-Only.

```text
NO_DELETE
NO_RENAME
NO_REHOME
NO_REFACTOR
NO_DEPENDENCY_REMOVAL
NO_CONFIG_REMOVAL
NO_TEST_REMOVAL
```

حتى يتم بناء Removal Delta كامل في `02` وتصنيف وحدات الحذف في `03`.
