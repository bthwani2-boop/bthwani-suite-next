# الأمر 3 — المراجعة المستقلة والحكم على الإغلاق

Status: DERIVED_SUPPORT

استخدم هذا الأمر بعد اكتمال التنفيذ عندما يكون المطلوب **مراجعة مستقلة للـdiff/candidate والأدلة ثم إصدار أعلى قرار مسموح**. المراجع لا يكتب الإصلاح الذي يراجعه ولا ينتحل اعتمادًا محميًا.

## المدخلات

```text
REPOSITORY: <owner/repo>
TARGET_REF: <branch-or-ref>
CANDIDATE_SHA: <40-sha-or-resolve-current>
BASE_SHA_OR_RANGE: <base-sha | commit-range>
PACKAGE_PATH: <plans/diagnose-implementing/<task> | N/A>
CLAIMED_OUTCOME: <what is claimed complete>
```

## أمر المراجعة

ثبّت candidate immutable من الفرع الذي حدده المستخدم، واقرأ `governance/GOVERNANCE.md`, `governance/product/PRD.md`, السياسات المنطبقة، Product Truth الحالي، والـdiff/implementation evidence الفعلي. لا تعتمد تقرير المنفذ أو package result كدليل كافٍ بذاته.

### 1. استقلال المراجع

المراجع:

- لا يكون مؤلف التغيير الذي يراجعه عندما تكون المراجعة المستقلة مطلوبة؛
- لا يصلح الكود ثم يراجع إصلاحه على أنه مستقل في الدورة نفسها؛
- لا يمنح product/security/finance/release/production/final closure authority ما لم يكن هو صاحب الاعتماد الحالي المسموح صراحة؛
- يمكنه إصدار findings و`FIX_REQUIRED` و`NEEDS_EVIDENCE` و`READY_FOR_REVIEW` ضمن حدود الصلاحية.

### 2. راجع الادعاء لا الملفات فقط

ابدأ من `CLAIMED_OUTCOME` وحدد:

```text
actors
required/excluded surfaces
canonical truth/write owners
legal state transitions
security/trusted scopes
financial ownership
persistence/events/integrations
canonical readbacks
failure/recovery paths
required evidence scopes
```

ثم اثبت أن الـdiff يحقق هذه النتيجة كاملة دون parallel truth أو side path غير مراجع.

### 3. مراجعة السبب الجذري

لكل تغيير جوهري اسأل:

```text
هل عولج المالك الحاكم أم عُولج العرض فقط؟
هل بقي write/read path قديم يناقض الجديد؟
هل جرى نسخ business logic إلى Surface/shared code؟
هل Generated contract/client ما زال من مصدره الحاكم؟
هل migration/invariant يحمي الحقيقة عند concurrency/retry؟
هل success UI يقرأ persisted/canonical state؟
هل rollback/recovery يعيد invariant لا مجرد الواجهة؟
```

أي workaround يخفي الخلل دون إزالة سببه = finding.

### 4. مراجعة Full‑Stack متعددة الأسطح

راجع المسار الكامل:

```text
entry/action
→ shared controller/adapter
→ contract/generated client
→ backend/domain
→ database/events/jobs/provider
→ canonical readback
→ every required affected surface
```

افحص الأسطح الأخرى حتى لو لم تكن نقطة البداية عندما تستهلك نفس الحالة أو نتيجة الرحلة.

### 5. الأمن والعزل

عند الانطباق افحص أدلة إيجابية وسلبية لـ:

```text
authentication/session/revocation
role + permission
trusted Platform/Operator context
Partner/Store/Actor scope
object authorization / IDOR
cross-scope leakage
service authentication
secrets/PII/logging
webhook signature/replay
```

لا تعتبر إخفاء زر UI authorization.

### 6. المال

عند وجود payment/refund/settlement/payout/commission/wallet/ledger/reconciliation:

- تحقق أن WLT ما زال المالك المالي الوحيد؛
- DSH/surfaces لا تحسب أو تكتب truth مالية؛
- idempotency/correlation/unknown outcome/reconciliation صحيحة؛
- provider/runtime evidence منفصل عن mock/local success؛
- finance approval مستقل عندما تتطلبه الحوكمة.

### 7. البيانات والمهاجرات

راجع:

```text
forward migration order
constraints/FK/unique/check/indexes
transaction + locking/versioning
backfill correctness
upgrade path
retention/destructive cleanup impact
no rewrite of applied migration history
```

لا تعتمد test in-memory لإثبات claim PostgreSQL يتطلب integration/database evidence.

### 8. Events/jobs/retries

راجع stable identity, duplicate delivery, contradictory replay, retry/backoff/DLQ/lease, transactional outbox/inbox, reconciliation، وfailure recovery. لا يكفي happy path.

### 9. UI/UX وruntime

عندما الادعاء يشمل سطحًا مرئيًا، راجع الحالات المنطبقة:

```text
loading / empty / offline / forbidden / conflict / partial
unknown-result / error / retry / recovery / success readback
RTL / localization / accessibility / responsive/device behavior
```

Static code review لا يثبت visual/runtime behavior. اطلب الأدلة المناسبة للادعاء.

### 10. الأدلة

ابنِ evidence matrix للـcandidate نفسه:

```text
static
database
contract
product
runtime
visual
qa
security
finance
isolation
governance
ci
release
production
```

لكل scope:

```text
APPLICABLE | NOT_APPLICABLE_WITH_REASON
PASS | FAIL | MISSING | STALE | BLOCKED
source/command/run/artifact
candidate_sha
proof_limit
```

أي دليل على SHA أقدم يصبح historical إذا كان التغيير اللاحق قد يؤثر على claim.

### 11. مراجعة الحزمة

إذا وُجد `PACKAGE_PATH`:

- قارن الخطة بما نُفذ فعليًا؛
- تحقق أن concerns لم تتداخل أو تُغلق بصمت؛
- تحقق من changed paths/resulting SHA/check results/blockers؛
- لا تعتبر كتابة `DONE/PASS` داخل الحزمة دليلًا مستقلًا؛
- شغّل validator إذا كان Shell متاحًا:

```powershell
node plans/diagnose-implementing/validate-package.mjs <PACKAGE_PATH> --strict --closure
```

فشل validator = لا إغلاق. نجاحه يثبت تماسك الحزمة فقط ضمن ما يفحصه، ولا يخلق approval محميًا.

### 12. مراجعة GitHub/CI

- تحقق من أن CI المطلوب اختبر `CANDIDATE_SHA` نفسه؛
- cancelled/older run ليس PASS؛
- local desired ruleset JSON لا يثبت أن GitHub يفرضه فعليًا؛
- branch protection/required checks/rulesets تحتاج live GitHub evidence إذا كان الادعاء يعتمد عليها.

### 13. تصنيف findings

لكل finding سجّل:

```text
severity: BLOCKER | HIGH | MEDIUM | LOW
category: PRODUCT | ARCHITECTURE | SECURITY | FINANCE | DATA | CONTRACT | RUNTIME | UI_UX | QA | CI | GOVERNANCE
claim_affected
exact_path_or_evidence
why_it_is_wrong
required_owner
required_fix_or_missing_evidence
```

لا تضف تفضيلات style غير مؤثرة كـblockers.

### 14. القرار

استخدم القاموس الحالي فقط:

- `FIX_REQUIRED` إذا بقي عيب داخلي يؤثر على outcome/invariant.
- `NEEDS_EVIDENCE` إذا لا يوجد عيب مثبت لكن evidence مطلوبة مفقودة/stale.
- `BLOCKED_EXTERNAL` إذا dependency خارجية حقيقية تمنع قرارًا أعلى.
- `READY_FOR_REVIEW` إذا implementation/evidence التقنية جاهزة لكن اعتمادًا مستقلًا/محميًا بقي مطلوبًا.
- `PASS` لclaim مراجعة محدود مثبت ضمن صلاحية المراجع.
- `CLOSED_WITH_EVIDENCE` فقط عندما يثبت `governance/contracts/decision-vocabulary.json` وDelivery policy أن **كل applicable evidence scopes + كل required approvals** مكتملة على candidate نفسه، بلا fail/blocked/pending.

إذا لم تكن لديك صلاحية اعتماد final closure المحمية، لا تصدرها حتى لو كانت التقنية سليمة؛ أصدر أعلى قرار مسموح واذكر الاعتماد المتبقي.

## التقرير النهائي

```text
repository
target_ref
candidate_sha
reviewed_range
claimed_outcome
findings_by_severity
evidence_matrix
same_commit_ci_state
package_validation
required_independent_or_protected_approvals
final_decision
exact_remaining_actions
```

لا تعدّل المصدر أثناء هذه المراجعة المستقلة؛ إذا لزم إصلاح، أعده إلى منفذ التغيير ثم راجع candidate جديدًا.
