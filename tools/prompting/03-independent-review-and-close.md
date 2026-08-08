# الأمر 3 — المراجعة المستقلة والحكم على الإغلاق

Status: DERIVED_SUPPORT

استخدم هذا الأمر بعد اكتمال التنفيذ عندما يكون المطلوب **مراجعة مستقلة للـcandidate والـdiff والأدلة ثم إصدار أعلى قرار تسمح به السلطة الحالية**. المراجع لا يكتب الإصلاح الذي يراجعه ولا ينتحل اعتمادًا محميًا.

## المدخلات

```text
REPOSITORY: <owner/repo>
TARGET_REF: <branch-or-ref>
CANDIDATE_SHA: <40-sha-or-resolve-current>
BASE_SHA_OR_RANGE: <base-sha | commit-range>
PACKAGE_PATH: <plans/diagnose-implementing/<task> | N/A>
CLAIMED_OUTCOME: <what is claimed complete>
```

## 1. السلطة وتثبيت المرشح

ثبّت Candidate immutable من الفرع الذي حدده المستخدم واقرأ وفق الترتيب الحاكم الحالي:

```text
current authorized review task
→ governance/authority/authority-precedence.json
→ governance/GOVERNANCE.md
→ governance/product/PRD.md
→ applicable engineering/security/delivery policy
→ applicable Product Truth + machine contracts
→ candidate implementation/runtime evidence
→ live repository-platform evidence when claimed
```

لا تعتمد تقرير المنفذ أو `RESULT.json` أو CI قديمًا كدليل كافٍ بذاته.

## 2. استقلال المراجع

المراجع:

- لا يكون مؤلف التغيير الذي يراجعه عندما تكون المراجعة المستقلة مطلوبة؛
- لا يصلح الكود ثم يراجع إصلاحه على أنه مستقل في الدورة نفسها؛
- لا يمنح Product/QA/Security/Finance/Isolation/Release/Production/final-closure approval ما لم يكن هو صاحب السلطة المسموح بها صراحة؛
- لا يعدّل المصدر أثناء هذه المراجعة؛ إذا ظهر Fix يعاد إلى منفذ التغيير ثم يراجع Candidate جديدًا.

## 3. راجع الادعاء والأثر لا الملفات فقط

ابدأ من `CLAIMED_OUTCOME` وحدد:

```text
actors/service identities
required/excluded surfaces
canonical truth/write owners
legal states/transitions
trusted scopes + permissions + object authorization
contracts/generated clients
persistence/events/jobs/providers
financial ownership when applicable
canonical readbacks
failure/retry/offline/recovery behavior
compatibility/mixed-version obligations
required evidence scopes + protected approvals
```

ثم تحقق أن الـdiff يحقق النتيجة بلا side path أو parallel truth غير مراجع.

## 4. Diff integrity وScope drift

راجع Base→Candidate:

```text
changed files + commits
unexpected generated or lockfile changes
out-of-scope paths
unrelated cleanup mixed into fix
missing consumer migration
legacy path still reachable
unreviewed migration/contract/runtime side effect
```

أي تغيير خارج النطاق بلا سبب مثبت Finding، وأي dependency لازمة غير موجودة في الـdiff Finding أيضًا.

## 5. Root Cause وCanonical Ownership

لكل تغيير جوهري اسأل:

```text
هل عولج المالك الحاكم أم العرض فقط؟
هل بقي write/read path قديم يناقض الجديد؟
هل جرى نسخ business logic/state machine إلى Surface/shared code؟
هل Generated contract/client ما زال من المصدر الحاكم؟
هل migration/invariant يحمي الحقيقة عند concurrency/retry؟
هل success UI يقرأ persisted/canonical state؟
هل rollback/recovery يعيد invariant لا مجرد الواجهة؟
هل أزيل fallback/dual-write بعد اكتمال migration؟
```

أي workaround يخفي السبب دون إزالته = Finding.

## 6. Full-Stack Multi-Surface review

راجع المسار الكامل بقدر الانطباق:

```text
Product Truth
→ Actor/Session/Trusted Scope/Permission
→ Surface action/control
→ shared controller/adapter
→ generated client/canonical contract
→ API/handler/domain/state machine
→ transaction/database
→ events/jobs/providers/WLT
→ persisted canonical readback
→ every required affected surface
```

افحص الأسطح الأخرى حتى لو لم تكن نقطة البداية عندما تستهلك نفس الحالة أو نتيجة الرحلة.

## 7. Compatibility وRollout

عند Contract/API/Schema/Mobile change راجع ما ينطبق:

```text
old mobile + new backend
new mobile + old backend when required
current control-panel + new backend
generated client/event/cache compatibility
mixed-version runtime
feature-flag safe default
rollback/roll-forward
compatibility owner + expiry + removal trigger + monitoring/tests
```

رفض Compatibility دائم بلا مالك/مدة/إزالة، ورفض fallback أو dual-write يحافظ على الحقيقة القديمة بعد cutover.

## 8. الأمن والعزل

عند الانطباق اطلب evidence إيجابيًا وسلبيًا لـ:

```text
authentication/session/revocation
role + permission
trusted Platform/Operator context
Partner/Store/Actor/Assignment scope
object authorization / IDOR
cross-scope leakage / privilege escalation
service authentication
secrets/PII/logging
provider signature/replay/rate-limit
```

إخفاء زر UI لا يثبت Authorization.

## 9. المال

عند payment/refund/settlement/payout/commission/wallet/ledger/reconciliation:

- تحقق أن WLT ما زال المالك المالي الوحيد؛
- DSH/surfaces لا تحسب أو تكتب Financial truth موازية؛
- idempotency/correlation/state constraints/unknown outcome/reconciliation صحيحة؛
- provider/runtime evidence منفصل عن mock/local success؛
- finance approval مستقل عندما تتطلبه الحوكمة.

## 10. البيانات والمهاجرات

راجع:

```text
forward migration order + no applied-history rewrite
constraints/FK/unique/check/indexes
transaction + locking/versioning
backfill correctness/idempotency/batching
fresh + non-empty upgrade path
partial failure/restart
rollback or roll-forward/compensation
destructive cleanup only after consumers/data proof
```

لا تعتمد in-memory test لإثبات PostgreSQL claim يتطلب DB integration evidence.

## 11. Events/Jobs/Providers

راجع stable identity، duplicate/out-of-order/replay، transactional outbox/inbox، retry/backoff/DLQ/lease، timeout/partial/unknown result، reconciliation/compensation، provider auth/signature، restart recovery. Happy path وحده لا يكفي.

## 12. UI/UX + Mobile + Control Panel + Runtime

عندما يشمل الادعاء سطحًا مرئيًا راجع الحالات المنطبقة:

```text
loading / empty / partial / success / error
forbidden / blocked / conflict / stale
offline / unknown-result / retry / recovery
canonical persisted readback
RTL / localization / accessibility / responsive/device behavior
```

Static code review لا يثبت Visual/Runtime behavior.

عند Mobile راجع navigation/deep-links/native permissions/push/maps/SecureStore/offline/native rebuild/OTA/EAS/signing/runtime env؛ Metro PASS لا يثبت Native build.

عند Control Panel راجع route/object authorization، server/client boundary، trusted scope selection، pagination/filter/search isolation، bulk/destructive actions، audit، session expiry، error mapping، optimistic rollback/readback، cross-surface readback.

## 13. فعالية الاختبارات

لا تكتفِ بأن الاختبار أخضر. لكل Test/Guard مهم اسأل:

```text
what exact claim does it falsify?
can it pass while the product remains broken?
does it exercise the real contract/database/runtime path?
does it cover negative/retry/concurrency/recovery risk where applicable?
was it weakened, mocked, skipped, or redirected to make the change pass?
```

اختبار لا يستطيع كشف رجوع Root Cause لا يثبت إغلاقه.

## 14. Evidence matrix على Candidate نفسه

ابنِ مصفوفة الأدلة من `governance/contracts/decision-vocabulary.json` وDelivery policy:

```text
static
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
required approval owner when applicable
```

لا scope يثبت Scope آخر. أي دليل أقدم من mutation يؤثر على claim يصبح Historical/Stale.

## 15. مراجعة الحزمة

إذا وُجد `PACKAGE_PATH`:

- قارن الخطة بما نُفذ فعليًا؛
- تحقق أن concerns لم تتداخل أو تُغلق بصمت؛
- تحقق من changed paths/resulting SHA/check results/blockers/deviations؛
- لا تعتبر `DONE/PASS` داخل الحزمة دليلًا مستقلًا؛
- عند توفر Shell شغّل:

```powershell
node plans/diagnose-implementing/validate-package.mjs <PACKAGE_PATH> --strict --closure
```

فشل Validator يمنع الإغلاق. نجاحه يثبت تماسك الحزمة ضمن ما يفحصه ولا يخلق approval محميًا.

## 16. GitHub/CI وRepository-Platform truth

تحقق حيًا عند اعتماد الادعاء عليها من:

```text
candidate/head SHA
workflow runs + required checks
cancelled/superseded/older runs
review threads/reviews
branch protection/rulesets/required reviewers
merge conflicts/base/head relationship
```

CI يجب أن يخص `CANDIDATE_SHA` نفسه. tracked ruleset/workflow config يصف المرغوب ولا يثبت enforcement الحي. لا تعِد تشغيل Job فاشلًا كبديل عن تشخيص Root Cause أو Flakiness.

## 17. Protected approvals

افصل التنفيذ التقني عن الاعتمادات المنطبقة. لا يمنح المراجع نفسه سلطة غير مسجلة. إذا كانت التقنية سليمة لكن approval محميًا مفقودًا، القرار ليس `CLOSED_WITH_EVIDENCE`.

## 18. Findings

لكل Finding سجّل:

```text
severity: BLOCKER | HIGH | MEDIUM | LOW
category: PRODUCT | ARCHITECTURE | SECURITY | FINANCE | DATA | CONTRACT | RUNTIME | UI_UX | QA | CI | GOVERNANCE
claim_affected
exact_path_or_evidence
why_it_is_wrong
root_cause_or_missing_proof
required_owner
required_fix_or_evidence
```

لا تحول تفضيل style غير مؤثر إلى Blocker.

## 19. القرار

استخدم القاموس الحالي فقط:

- `FIX_REQUIRED`: بقي عيب داخلي يؤثر على outcome/invariant.
- `NEEDS_EVIDENCE`: لا عيب مثبت لكن evidence مطلوبة مفقودة/stale.
- `BLOCKED_EXTERNAL`: dependency خارجية حقيقية تمنع قرارًا أعلى.
- `READY_FOR_REVIEW`: implementation/evidence التقنية جاهزة لكن اعتمادًا مستقلًا/محميًا بقي مطلوبًا.
- `PASS`: claim مراجعة محدود مثبت ضمن صلاحية المراجع.
- `PROTOCOL_VIOLATION`: خرق قاعدة حاكمة.
- `CLOSED_WITH_EVIDENCE`: كل applicable evidence scopes + required approvals مكتملة على **نفس immutable candidate** بلا fail/blocked/pending.

إذا لم تكن لديك سلطة final closure المحمية، أصدر أعلى قرار مسموح واذكر الاعتماد المتبقي.

## 20. التقرير النهائي

```text
repository / target_ref
candidate_sha / reviewed_range
claimed_outcome
changed + out-of-scope diff assessment
root-cause/canonical-owner assessment
findings_by_severity
evidence_matrix + proof limits
compatibility/migration/security/finance/runtime assessment
same-candidate CI/repository-platform state
package_validation
required independent/protected approvals
final_decision
exact remaining actions
```

لا تعدّل المصدر أثناء المراجعة. إذا لزم Fix، أعده إلى منفذ التغيير ثم راجع Candidate جديدًا.
