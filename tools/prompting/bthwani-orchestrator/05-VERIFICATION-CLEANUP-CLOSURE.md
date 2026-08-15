# 05 — Verification, Cleanup & Closure

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/05-VERIFICATION-CLEANUP-CLOSURE.md`

هذا الملف يملك Candidate/Evidence، Runtime/E2E، Cleanup/Structural Hygiene، Governance Sync، Fresh-Head، Adversarial Review، وFinal Closure.

## 1) Verification Principle

```text
nearest root-cause regression
→ affected unit/package
→ related integration
→ affected typecheck/lint/test/build
→ contract/generated client
→ DB/data/security/isolation
→ runtime/readiness/smoke/readback
→ cross-surface E2E/visual/manual when claimed
→ failure/edge/adversarial
→ full verification only when proven/policy-required
```

استخدم كل Evidence منطبقة، لا كل الأدوات كل مرة. لا Heavy CI مكرر لنفس Candidate إذا الدليل ما يزال صالحًا.

## 2) Candidate Lifecycle

استخدم المعاني التالية:

```text
STARTING_REMOTE_SHA
WORK_BASE_SHA
IMPLEMENTATION_SHA
BOOKKEEPING_SHA optional
FINAL_CANDIDATE_SHA
LATEST_REMOTE_SHA
HEAD_AT_REVIEW_START
HEAD_AT_DECISION
MERGE_SHA only if actual authorized merge
```

كل write بعد `FINAL_CANDIDATE_SHA` يلغي Freeze ويخلق Candidate جديدًا ويعيد evidence المتأثر.

## 3) Freeze

قبل Final Evidence:

```text
complete all product/package/governance writes required for candidate
→ complete cleanup writes
→ reconcile latest head
→ create final logical commit(s)
→ FREEZE WRITES
→ FINAL_CANDIDATE_SHA = exact last allowed commit
```

بعد Freeze ممنوع source/package/governance/format/generation/lockfile/migration write أو commit/push أثناء Final Read-Only Verification. أي write = عودة إلى التنفيذ.

## 4) Evidence Record

لكل Check:

```text
EVIDENCE_ID
source/command/workflow/run/artifact
candidate_sha
environment/profile/runner
started/completed when useful
status/exit
claim it can falsify
what it does NOT prove
covered scope
invalidated-by triggers
artifact/log provenance
```

الحالات:

```text
PASS
FAIL
MISSING
STALE
BLOCKED
NOT_APPLICABLE_WITH_PROOF
CANCELLED_OR_SUPERSEDED
```

`CANCELLED` ليس PASS، و`MISSING/STALE` لا يثبت Closure.

## 5) Failure Classification

لكل CI/Runtime failure:

```text
DETERMINISTIC_PRODUCT
DETERMINISTIC_TEST_OR_CONTRACT
INFRA_OR_RUNNER
EXTERNAL_PROVIDER
FLAKY_OR_NONDETERMINISTIC
CANCELLED_OR_SUPERSEDED
STALE_RUN
```

القواعد:

```text
DETERMINISTIC → root-cause fix → NEW SHA
INFRA/PROVIDER → prove external cause → targeted rerun only
FLAKY → flakiness defect until controlled/proven
CANCELLED/SUPERSEDED → neither product PASS nor product FAIL proof
STALE → cannot prove current candidate
```

لا Blind rerun لإجبار green.

## 6) Runtime Freshness

قبل Runtime/E2E حسب الحاجة أثبت:

```text
source checkout = candidate
artifact/image/bundle provenance = candidate or exact derived digest
process/container/service version current
schema/migrations required version
seed/fixture provenance known
no stale dev server/container/process
network/config/env target intended profile
```

عند الحاجة:

```text
rebuild/restart affected services
clear only safe derived caches
unique test run id
capture pre-state
execute real scenario
read canonical persisted post-state
clean/isolate test data safely
```

نجاح مبني على stale process/data ليس Runtime proof.

## 7) Real Scenario / Cross-Surface Verification

إذا Claim تشغيلي، اختبر Actual Scenario الحقيقي حسب الإمكان:

```text
Actor/identity/session/scope
→ Surface action
→ Contract/API
→ Domain transition
→ Persistence/events/integration
→ canonical readback
→ affected consuming surfaces
→ observable operational result
```

Mock/Static proof يبقى محدودًا ولا يترقى تلقائيًا إلى End-to-End.

## 8) Domain Gates

### Security

عند الانطباق: auth/session/revocation/role/permission/trusted context/object auth/IDOR/cross-scope/service auth/input-output validation/injection/SSRF/path traversal/upload/PII/secrets/provider signatures/replay/rate-limit/audit.

### Finance

أثبت owner المالي، idempotency/correlation، state constraints، provider outcome binding، canonical readback، unknown-result reconciliation، compensation، replay/restart safety.

### Data/PostgreSQL

أثبت migration determinism، schema/constraints/indexes، fresh + non-empty cases، drift/orphans/duplicates، lock/concurrency/idempotency، restart/partial failure، compatibility/rollback/roll-forward.

### Mobile / Control Panel

Mobile: permissions/deep-links/push/maps/location/SecureStore/session/offline/reconnect/build/OTA/EAS/env/runtime transport حسب Claim.

Control Panel: route/object auth/trusted scope/server-client/search isolation/bulk/audit/session/error/readback/responsive/RTL/localization/accessibility حسب Claim.

### Supply Chain / CI

lockfile integrity، unsupported/duplicate dependency، CVE/dependency review، CodeQL/Gitleaks/workflow policy/pinning حسب التغيير والخطر. Scanner green لا يبرر إخفاء Finding.

## 9) Evidence Invalidation

أي mutation أو branch movement قد يبطل evidence. أمثلة:

```text
contract/schema change → consumers/generation/integration rerun
migration/data owner → DB/runtime/readback rerun
runtime/config/network → runtime/E2E rerun
security/auth/permission → negative isolation/security rerun
shared library → all proven consumers rerun
unrelated docs only → evidence may remain valid if provenance proves independence
```

أعد أقل مجموعة كافية من الأدلة المتأثرة، لا كل شيء عشوائيًا.

## 10) Cleanup = Part of DONE

التنظيف ليس تجميلًا. ينفذ موضعيًا أثناء الإصلاح، ثم Sweep نهائي قبل الإغلاق.

ابحث داخل النطاق المثبت عن:

```text
dead/unreachable code
stale/legacy/superseded residue
duplicate implementations / duplicate truth
obsolete routes/contracts/DTOs/schemas/models
unused imports/exports/re-exports/dependencies
stale configs/env/flags/scripts/commands
temporary/debug/generated noise
old names/paths/aliases
orphan/stale references
wrong ownership/responsibility/placement/context
misleading naming
TODO/FIXME/HACK/workarounds/fallbacks
unnecessary compatibility layers
files/folders without proven Purpose/Consumer/Responsibility
parallel business logic/state machines/data writers
stale docs/comments/examples touched by scope
```

## 11) Structural Hygiene

وحدة التنظيف ليست الملف فقط:

```text
line/expression/branch/block
→ function/method/type/component/helper
→ file/file group/folder
→ module/package
→ service/surface/domain
→ contract/route/config/dependency
```

المعالجات المسموحة حسب الدليل:

```text
Delete / Rename / Move / Merge / Split / Refactor / Reorganize / Redesign / Rebuild
```

لكل عنصر باقٍ يجب أن يكون له:

```text
Responsibility
Purpose
Consumer
Requirement
Architectural Reason
Correct Ownership
Correct Placement
Correct Naming/Context
```

## 12) Reference Integrity

بعد أي Delete/Rename/Move/Merge/Split/Replace افحص الاتجاهين:

```text
Imports/Exports/Re-exports
Callers/Callees
Registrations/Bindings/Routes
Contracts/Schemas
Configs/Env
Dependencies
Tests/Mocks/Fixtures
Docs/Examples
Build/CI/Scripts
Generated References
```

الحذف الجزئي أو Rename مع Alias قديم بلا حاجة = غير مكتمل.

## 13) Canonical Source Consolidation

لكل مفهوم يجب أن يكون له Owner واحد حيث يحكم التصميم بذلك. عند duplication:

```text
identify canonical owner
→ migrate writers/readers/consumers
→ remove secondary truth/sync residue when safe
→ update references
→ verify canonical readback
```

## 14) Final Cleanup Gate

قبل Closure أثبت داخل النطاق:

```text
ZERO known dead code/files/folders
ZERO known stale/obsolete implementation path
ZERO known unjustified duplicate truth/logic
ZERO known orphan/stale reference
ZERO known unused affected dependency
ZERO known stale affected config/env/flag/script
ZERO known misleading naming/placement/context
ZERO known temporary workaround/fallback
ZERO known unjustified compatibility residue
ZERO known scope-related TODO/FIXME/HACK
ZERO known structural contradiction
ZERO known cleanup finding unresolved
```

ثم أعد verification المتأثر لإثبات أن التنظيف لم يُحدث Regression.

## 15) Governance Reconciliation

في `EXECUTE_END_TO_END` قبل الإغلاق:

```text
all durable task decisions classified
→ all required governance promotions completed or explicitly blocked
→ machine-readable counterpart synchronized when applicable
→ governance ↔ Product Truth ↔ contract ↔ code ↔ runtime compared
```

ممنوع Closure إذا بقي:

```text
durable truth only in task artifacts
governance ↔ Product Truth contradiction
governance ↔ machine-contract contradiction
governance ↔ implementation contradiction
governance ↔ runtime contradiction
stale governance caused/exposed by task without disposition
```

النتيجة المطلوبة: `GOVERNANCE_SYNC_COMPLETE`.

## 16) Fresh-Head Gate

قبل Final Decision:

```text
HEAD_AT_DECISION = re-resolve exact branch
compare HEAD_AT_DECISION with FINAL_CANDIDATE_SHA
classify any movement
```

إذا المطلوب إغلاق branch head والرأس مختلف أو تغيرت truth ذات الصلة، أعد reconciliation + evidence المتأثر. لا تدّع إغلاق رأس قديم.

## 17) Final Adversarial Completeness

على Candidate المرشح حاول اكتشاف ما يمنع الإغلاق:

```text
unclosed root cause
parallel/stale truth
hidden writer/reader
missing consumer/migration
contract/binding mismatch
security/authz bypass
retry/replay/concurrency defect
unknown-result/recovery gap
partial failure/restart gap
runtime-only defect
stale process/data/config
weak/flaky/modified guard
missing audit/observability
foreign/out-of-scope delta
legacy reachable path
PII/secret leakage
neighbor consumer regression
wrong ownership/placement/naming/context
unnecessary residue
cross-surface semantic mismatch
```

أي Finding يحتاج write → إلغاء Freeze والعودة للتنفيذ.

## 18) Final Read-Only Verification

على `FINAL_CANDIDATE_SHA` فقط:

```text
required final checks
generated consistency without mutation
exact diff/scope/foreign-change review
canonical persisted readbacks
runtime/E2E evidence where claimed
security/data/finance gates where applicable
failure/edge/adversarial behavior
test effectiveness
evidence/artifact provenance
```

ممنوع `--fix` أو formatter/generator writes أو source/package mutation أثناء هذه المرحلة.

## 19) Test Effectiveness

إذا عُدّل Test/Guard، أثبت أنه:

```text
fails on broken behavior or equivalent regression fixture
passes after root fix
was not weakened to accept the bug
```

## 20) Approval / Independence

حل approvals من authority الحالية. Historical blanket authorization ليس outcome acceptance إذا كانت policy تحتاج approval/provenance/candidate binding خاصًا.

`SELF_REVIEW ≠ INDEPENDENT_REVIEW`. إذا كانت مراجعة مستقلة مطلوبة، أثبت reviewer provenance وbinding للـCandidate.

## 21) Closure Equation

في EXECUTE mode:

```text
DISCOVERY_COMPLETE
AND DIAGNOSIS_COMPLETE
AND DECISION_COMPLETE
AND COVERAGE_COMPLETE
AND PACKAGE_READY
AND IMPLEMENTATION_COMPLETE
AND CLEANUP_COMPLETE
AND EVIDENCE_COMPLETE
AND GOVERNANCE_SYNC_COMPLETE
AND FRESH_HEAD_VALID
AND FINAL_ADVERSARIAL_PASS
```

مع:

```text
ZERO known fixable in-scope defects
ZERO unresolved findings
ZERO unverified fixes
ZERO required missing/stale evidence
ZERO required missing/unproven approval
ZERO unresolved material decision required for outcome
ZERO plan/package assertion treated as live truth without revalidation
```

فشل أي بند = `OPEN/BLOCKED` وفق vocabulary الحاكمة.

## 22) PREPARE_ONLY Closure Semantics

في PREPARE_ONLY لا يوجد Product Closure. أعلى حالة هي:

```text
STOP_PREPARED / PACKAGE_READY
```

بمعنى أن التشخيص والقرارات والتغطية وخطة التنفيذ/التحقق جاهزة، لا أن المنتج أُصلح.

## 23) Final Report

`03-VERIFICATION-CLOSURE.md` يسجل على الأقل:

```text
repository/branch/mode/target
starting/work/final/head SHAs
scope + supported exclusions
root causes/owners
actual changed/removed/moved paths
consumer migration
checks + proof limits
runtime freshness/readbacks
Findings final state
cleanup/structural/source-of-truth review
Governance Sync
Evidence Matrix
Approval/independence when required
concurrent movement/reconciliation
remaining blockers/resume point
retention action
final decision
```

## 24) Final Rule

إذا كان الوصف الصادق للنتيجة هو:

```text
"يعمل لكن ..."
```

وكانت الـ"لكن" Finding مادية معلومة قابلة للمعالجة داخل النطاق، فالحالة `OPEN`.