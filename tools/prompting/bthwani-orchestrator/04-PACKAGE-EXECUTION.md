# 04 — Package & Execution

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/04-PACKAGE-EXECUTION.md`

هذا الملف يملك بوابة حزمة المهمة، شكلها المختصر، Governance Promotion في وضع التنفيذ، والتنفيذ الجذري. لا يملك قواعد التشخيص أو الإغلاق النهائي.

## 1) Package Readiness

لا تنشئ/تحدّث حزمة المهمة قبل:

```text
DISCOVERY_COMPLETE = PASS
DIAGNOSIS_COMPLETE = PASS
DECISION_COMPLETE = PASS
COVERAGE_COMPLETE = PASS
latest-head drift reconciled
acceptance/verification can be defined without guessing
```

إذا بقي قرار مادي غير محسوم أو Finding غير مسجل أو Root Cause/Owner مجهول ماديًا بلا blocker واضح، فالحزمة غير جاهزة.

## 2) مكان وشكل حزمة المهمة

الجذر:

```text
plans/diagnose-implementing/<TASK_NAME>/
```

الملفات الحاكمة الثلاثة فقط:

```text
01-DIAGNOSIS.md
02-EXECUTION.md
03-VERIFICATION-CLOSURE.md
```

الحزمة `DERIVED_SUPPORT` وليست Product/Implementation/Runtime Truth. لا تنشئ ملفات إضافية افتراضيًا. إذا أثبت التعقيد أن ملفًا أصبح غير قابل للاستخدام، يمكن تقسيمه داخليًا مع إبقاء الملفات الثلاثة فهارس/مداخل حاكمة وعدم إنشاء truth موازٍ.

## 3) Create / Resume / Rebaseline

قبل الإنشاء:

```text
ABSENT
→ create package.

EXISTS + same task identity
→ RESUME_AND_RECONCILE; do not duplicate or overwrite blindly.

EXISTS + different task identity
→ COLLISION; choose distinct safe task name.
```

الحزمة القديمة لا تثبت أن التشخيص الحالي مكتمل.

عند الاستئناف:

```text
re-read current orchestrator/contracts/governance
→ revalidate package claims against current truth/head
→ preserve still-valid evidence/decisions only
→ mark stale/contradicted assumptions
→ re-diagnose affected scope
```

لا replay ميكانيكي لتاريخ قديم لمجرد الحفاظ على Package.

## 4) 01-DIAGNOSIS.md Ownership

يحتوي على الأقل:

```text
task identity / repository / branch / start/current SHA / mode / target
truth hierarchy and capability limits
scope + supported exclusions
Macro Blueprint
Relation/System Graph summary
Actors/responsibilities
Journey matrices or concise equivalent
States/transitions/actions/handoffs
ACTUAL / INTENDED / DESIRED / CONFLICT
Findings + Root Causes + Blast Radius
Coverage status / scope deltas
Contradictions
Decision Ledger + explicit decisions
Governance Delta Candidates
Re-Diagnosis results
Final Diagnosis Gate
```

التفاصيل الدقيقة يحكمها `contracts/DIAGNOSIS-OUTPUT-CONTRACT.md` و`contracts/DECISION-OUTPUT-CONTRACT.md`.

## 5) 02-EXECUTION.md Ownership

يبدأ بخطة تنفيذ محسومة، ثم يصبح سجل التنفيذ الحقيقي:

```text
execution order / dependencies
root cause + canonical owner per change
paths/symbols/contracts/data affected
writers/readers/consumers migration
must-not-change boundaries
implementation steps
actual changes performed
local cleanup after each root fix
candidate lifecycle
concurrent movement/reconciliation
blockers/deviations
remaining execution state
```

لا يكرر التشخيص الكامل؛ يشير إلى IDs من `01-DIAGNOSIS.md`.

## 6) 03-VERIFICATION-CLOSURE.md Ownership

يحتوي:

```text
verification plan and actual evidence
candidate SHA/evidence provenance
runtime/E2E/readback
security/data/finance/domain gates when applicable
cleanup and structural hygiene result
Governance reconciliation
fresh-head reconciliation
final adversarial completeness
remaining open items
final OPEN/BLOCKED/CLOSED decision
```

يحكمه `05-VERIFICATION-CLEANUP-CLOSURE.md` وعقود Evidence/Closure.

## 7) PREPARE_ONLY Boundary

في هذا الوضع:

```text
create/update the three task-package files
record exact implementation plan
record required governance promotion candidates
record evidence acquisition plan
STOP at PACKAGE_READY / STOP_PREPARED
```

ممنوع:

```text
product/source writes
governance mutation
runtime/data/provider mutation
migration application
implementation commits
final product DONE claim
```

`02-EXECUTION.md` في PREPARE_ONLY هو **خطة تنفيذ جاهزة** وليس سجل تغييرات مزعومة. `03-VERIFICATION-CLOSURE.md` هو **خطة تحقق وإغلاق** وليس Evidence مزعومة.

## 8) EXECUTE_END_TO_END Boundary

لا Product write قبل Readiness. بعد Readiness:

```text
revalidate current authority/truth/head
→ Governance Promotion where required
→ canonical implementation owner first
→ migrate every affected writer/reader/consumer
→ remove obsolete/parallel behavior
→ local cleanup
→ targeted affected verification
→ continue until implementation scope exhausted
```

## 9) Governance Promotion

لكل `GOVERNANCE_PROMOTION_PENDING` أو حقيقة دائمة جديدة:

```text
resolved durable rule
→ classify type
→ find existing canonical governance owner
→ check authority to mutate
→ update canonical owner when authorized
→ update machine-readable counterpart/registry when applicable
→ propagate into implementation and consumers
→ verify semantic parity later
```

Routing المعتاد، وفق الحوكمة الحية الحالية:

```text
Platform/Product-wide → governance/product/PRD.md / platform-model.yaml
Capability Product Truth → governance/product/contracts/*.product-truth.json
Engineering → governance/policies/engineering.md
Security → governance/policies/security.md
Delivery → governance/policies/delivery.md
Authority → governance/authority/**
Machine contract/registry → governance/contracts/** or registered canonical path
```

لا تنشئ `governance/<topic>-decisions.md` أو ملف Journey تاريخي لمجرد أهمية القرار. إذا لا يوجد Owner مناسب، اتبع Governance change rule الحالية بدل اختراع طبقة جديدة.

## 10) Governance Timing

ثلاث نقاط فقط افتراضيًا:

```text
A) durable Macro decision locked
→ promote before deep downstream assumptions depend on it, when authorized.

B) new material evidence during execution invalidates a durable decision
→ reopen affected decision
→ re-diagnose
→ update governance intentionally, never silently.

C) before final closure
→ full Governance Reconciliation Gate.
```

لا تكتب كل فرضية مؤقتة إلى Governance.

## 11) Root-Cause Execution Loop

لكل Finding تنفيذي:

```text
confirm current failure/evidence
→ correlate duplicate symptoms
→ identify first causal failure
→ canonical owner/root cause
→ challenge competing hypothesis
→ root fix/refactor/redesign/rebuild
→ migrate affected consumers
→ sync contracts/generated artifacts
→ data/migration transition when needed
→ remove obsolete/parallel path
→ local structural cleanup
→ targeted verify
→ adjacent regression search
→ update Finding status
```

لا Patch loop بلا فرضية جديدة.

## 12) No Patch / No Parallel Truth

ممنوع كحل نهائي:

```text
temporary patch masking root cause
silent fallback
parallel Product/Business truth
permanent dual-write without migration contract
surface-local business truth duplicating canonical owner
UI-only authorization
state bypass
legacy route left reachable after migration
new finance retry identity before unknown-result reconciliation
test/guard weakening
```

حل انتقالي ضروري فعليًا يجب أن يكون محدودًا، مبررًا، صريح الملكية، له expiry/removal trigger، ولا يخفي Failure.

## 13) Consumer Migration

الإصلاح لا يغلق عند تعديل Owner فقط. احصر وحدث بحسب الأثر:

```text
writers
readers
API consumers
generated clients/bindings
surfaces
jobs/events
DB queries/migrations
configs/env
permissions/scopes
tests/mocks/fixtures
docs/comments touched by the semantic change
```

كل Consumer إما migrated أو `NOT_AFFECTED_WITH_PROOF`.

## 14) Change Impact Propagation

كل Write مادي يطلق:

```text
changed owner/contract/state
→ affected graph traversal
→ affected consumers
→ invalidated evidence
→ required re-verification
→ governance impact
→ cleanup residue
```

لا تكرر Full Repo verification إذا كان impact محدودًا ومثبتًا، ولا تقللها إذا تغير shared owner/contract عالي الـfanout.

## 15) Local Cleanup During Execution

بعد كل Root Fix:

```text
remove obsolete local path
remove stale compatibility/workaround if انتهت الحاجة
repair imports/exports/references
normalize naming/placement/ownership if directly affected
remove debug/temp residue
verify immediate reference integrity
```

التنظيف النهائي الشامل يبقى في الوحدة 05.

## 16) Execution Ordering

رتّب:

```text
hard dependency
→ canonical foundation blocker
→ high-risk / high-blast-radius owner
→ core journey critical path
→ consumers
→ compatibility transition
→ cleanup/finishing
```

وحدة التنفيذ لا تحددها الملفات بل concern/root cause غير المتداخل.

## 17) Data / Migration Rules

عند الانطباق:

```text
forward deterministic migrations only
no applied-history rewrite
expand/compatible/backfill/switch/contract when needed
fresh DB + representative non-empty DB
constraints/indexes/FKs/checks
locks/batching/idempotency
restart/partial failure
rollback/roll-forward
orphan/duplicate/drift checks
```

أي destructive/production mutation تخضع للAuthority Gate في Core.

## 18) Security / Finance / Events

Security: أصلح enforcement في المالك الموثوق، لا UI فقط؛ غطِّ IDOR/cross-scope/session/replay/input-output/PII/secrets/audit حسب الأثر.

Finance: WLT/المالك المالي الحاكم، idempotency/correlation/readback/reconciliation/unknown-result/compensation/replay safety؛ لا Mock success كإغلاق مالي.

Events/Jobs/Providers: stable identity، duplicate/out-of-order/replay، retry/backoff/DLQ/lease، timeout/unknown result، provider auth/signature، reconciliation/compensation/restart.

## 19) Execution Completion Gate

قبل Freeze يجب أن يكون:

```text
zero known in-scope finding requiring implementation write
zero FIXED_PENDING_VERIFY that still needs a write rather than evidence
all affected consumers migrated/dispositioned
all governance promotions required for durable resolved truth completed or explicitly blocked
all local cleanup caused by implementation complete
package bookkeeping required before Freeze complete
latest remote movement reconciled
```

إذا لا، التنفيذ يبقى OPEN.