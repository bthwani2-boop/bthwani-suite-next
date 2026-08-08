# الأمر 2 — التنفيذ الجذري حتى أعلى قرار مثبت

Status: DERIVED_SUPPORT

استخدم هذا الأمر لتنفيذ **حزمة موجودة تحت `plans/diagnose-implementing/` أو مهمة مباشرة** حتى أعلى نتيجة يمكن إثباتها، مع إصلاح السبب الجذري ومنع النجاح الشكلي.

## المدخلات

```text
REPOSITORY: <owner/repo>
TARGET_REF: <branch-or-ref>
MODE: <PACKAGE | DIRECT_TASK>
PACKAGE_PATH: <plans/diagnose-implementing/<task> | N/A>
TASK: <direct task when MODE=DIRECT_TASK>
DELIVERY: <LOCAL_ONLY | COMMIT | COMMIT_AND_PUSH>
```

## 1. السلطة وتثبيت التنفيذ

اتبع الترتيب الحاكم الحالي من المرجع نفسه:

```text
current authorized task
→ governance/authority/authority-precedence.json
→ governance/GOVERNANCE.md
→ governance/product/PRD.md
→ applicable engineering/security/delivery policy
→ applicable capability Product Truth + machine contracts
→ exact pinned implementation/runtime/platform evidence
```

استخدم `CODE_BASED_LEAN`: أصلح أصغر نطاق جذري كامل، ووسّع فقط بسبب مثبت.

قبل أي كتابة سجّل:

```text
STARTING_REMOTE_SHA
CAN_READ_REPOSITORY
CAN_WRITE_REPOSITORY
CAN_EXECUTE_SHELL
CAN_RUN_NODE
CAN_RUN_DATABASE
CAN_RUN_RUNTIME
CAN_COMMIT
CAN_PUSH
```

أعد حل رأس الفرع قبل كل دفعة كتابة وبعد كل Push/آخر كتابة. لا تستبدل الفرع، ولا Force Push/Reset/history rewrite، ولا تدمج/تطلق/تنشر دون تفويض المهمة الحالية.

## 2. Package mode / Direct task mode

### Package

اقرأ بالترتيب:

```text
START-HERE.md
→ MANIFEST.json
→ GLOBAL-DIAGNOSIS.md
→ COVERAGE.json
→ EXECUTION-ORDER.json
→ current unit DIAGNOSIS/EXECUTION/VERIFICATION/RESULT
```

عند توفر Shell:

```powershell
node plans/diagnose-implementing/validate-package.mjs <PACKAGE_PATH> --strict
```

إذا فشل strict بسبب الخطة، أصلح الحزمة أولًا دون تخفيف الهدف أو acceptance criteria. إذا تحرك الفرع منذ `pinnedStartSha`، نفّذ impact reconciliation على paths/symbols/contracts/generated clients/schema/migrations/owners/dependencies/journeys/verifications المتأثرة فقط، ثم أعد strict.

لا تبدأ وحدة تعتمد على dependency غير `DONE`، ولا تسمح بأكثر من وحدة كتابة `IN_PROGRESS`.

### Direct task

نفّذ مباشرة فقط إذا كانت الملكية والنطاق والنتيجة محدودة وواضحة. إذا ثبتت عدة Root Causes مستقلة أو multi-domain/multi-surface foundation/migration concerns، أنشئ حزمة `plans/diagnose-implementing/` بدل إدارة الخطة في الذاكرة أو المحادثة.

## 3. قاعدة الاستمرار

أي خلل داخلي مرتبط وقابل للإصلاح هو دليل جديد، لا سبب للتوقف:

```text
FAILURE
→ classify evidence
→ re-diagnose root cause/owner
→ fix canonical owner
→ targeted verify
→ affected verify
→ continue
```

لا تكرر الأمر الفاشل بلا فرضية جديدة. إذا تكررت محاولات متشابهة بلا تقدم، أوقف Patch loop وأعد تشخيص الملكية والافتراضات قبل الاستمرار.

## 4. Foundation Gate عند ثبوت الحاجة

في Journey/Application/Surface/Feature عابرة للأسطح، لا تبدأ وحدات تابعة إذا بقي concern تأسيسي مثبت يمنعها.

نفّذ أولًا `FOUNDATION`/`MIGRATION`/shared prerequisite اللازمة فقط، ثم بوابة التحقق المخططة، وبعدها الوحدات التابعة. لا تجعل Foundation مسحًا شاملاً للمستودع بلا دليل.

إذا ظهر Foundation defect أثناء Journey:

```text
stop affected path safely
→ capture evidence
→ reopen/create owning foundation unit
→ invalidate dependent evidence
→ recompute order
→ fix foundation
→ rerun affected foundation checks
→ resume from last valid checkpoint
```

## 5. إصلاح السبب الجذري

لكل concern:

```text
symptom
→ authoritative truth/write owner
→ proven root cause
→ canonical target state
→ central fix
→ migrate every affected writer/reader/consumer
→ regenerate derivatives when required
→ remove obsolete/parallel path after migration
→ persisted/canonical readback
→ affected verification
```

ممنوع:

```text
temporary patch / silent fallback
parallel truth / permanent dual-write
handwritten parallel contract/type/client
business logic duplicated into surface/shared UI
runtime mock/fixture as truth
fake control with no persisted effect
UI-only authorization
test weakening / guard disabling
rewriting applied migration
manual state mutation to bypass state machine
financial retry with a new identity before resolving unknown outcome
legacy path left reachable after cutover
```

## 6. Full-Stack Multi-Surface closure

اسم التطبيق/السطح/الصفحة هو نقطة البداية فقط. أغلق كل علاقة مثبتة:

```text
interaction
→ shared controller/adapter
→ generated contract/client
→ API/handler/domain/state machine
→ transaction/database
→ events/jobs/providers/WLT when applicable
→ persisted canonical readback
→ every required affected surface
```

لا تعتبر السطح الأول مغلقًا إذا كانت النتيجة يجب أن تظهر أو تُستهلك في سطح آخر.

## 7. Compatibility وRollout

عند تغيير API/Schema/Contract/Mobile-facing behavior، أثبت ما ينطبق:

```text
old mobile + new backend
new mobile + old backend عند الحاجة
current control-panel + new backend
generated-client/event/cache compatibility
mixed-version runtime
feature-flag safe default عند وجوده
rollback/roll-forward
compatibility window: owner + expiry + removal trigger + monitoring/tests
```

لا تفترض تحديث كل تطبيقات الهاتف لحظيًا. Compatibility المؤقتة لا تتحول إلى fallback أو dual-write دائم.

## 8. الأمن والهوية والنطاق

عند الانطباق تحقق من:

```text
authentication/session/device/revocation
role + permission
trusted Platform/Operator context
Partner/Store/Actor/Assignment scope
object authorization / IDOR
cross-scope leakage / privilege escalation
service authentication
PII/secrets/logging
provider signature/replay/rate limits
negative paths
```

Client-controlled IDs محددات موارد وليست إثبات صلاحية.

## 9. DSH / WLT

أعد إثبات الحدود من Product Truth والعقود الحالية. عند الأثر المالي:

- WLT يبقى مالك ledger/balance/payment/refund/settlement/payout/commission/reconciliation truth.
- DSH/surfaces لا تنشئ حقيقة مالية موازية.
- تحقق من idempotency/correlation/state constraints/readback/reconciliation/compensation.
- timeout/unknown provider outcome يبقى reconcilable ولا يتحول إلى نجاح محلي أو retry عشوائي عبر مزود آخر.

## 10. PostgreSQL والأنظمة الموزعة

أي Schema/data change:

- forward ordered deterministic migration؛
- transaction عند الإمكان؛
- constraints/indexes/FKs/checks حسب invariant؛
- compatibility + backfill + writer/reader transition؛
- اختبار PostgreSQL فعلي على fresh/non-empty عند الحاجة؛
- locks/concurrency/idempotency؛
- rollback أو roll-forward/compensation؛
- cleanup فقط بعد ترحيل كل المستهلكين.

عند Events/Jobs/Providers اختبر حسب الأثر:

```text
stable identity / duplicate delivery / out-of-order/replay
outbox/inbox / retry/backoff / DLQ/lease
timeout / partial failure / unknown result
reconciliation / compensation / restart recovery
```

## 11. UI/UX + Mobile + Control Panel

لكل Surface مطلوب افحص controls/routes/screens مع الحالات المنطبقة:

```text
loading / empty / partial / success / error
forbidden / blocked / conflict / stale
offline / unknown-result / retry / recovery
canonical persisted readback
```

وتحقق من RTL/localization/accessibility/focus/large text/responsive/device/network عند تأثرها.

عند Mobile افحص navigation/deep links/native permissions/push/maps/SecureStore/offline/native rebuild/OTA/EAS/signing/runtime env؛ نجاح Metro لا يثبت Native build.

عند Control Panel افحص route/object authorization، server/client boundary، trusted scope selection، pagination/filter/search isolation، bulk/destructive actions، audit، session expiry، error mapping، optimistic rollback/readback، cross-surface readback.

## 12. التحقق والأدوات — Affected First

اقرأ الأوامر الفعلية من manifests/scripts؛ لا تخترع commands.

```text
nearest targeted check
→ unit/package test
→ related integration
→ affected typecheck/lint/test/build
→ contract/generated client/db/security checks
→ runtime health/readiness/smoke/readback when claimed
→ cross-surface E2E/manual visual-operational acceptance when claimed
→ full workspace/runtime only when impact requires it
```

Tool ladder:

```text
direct scoped inspection
→ focused search/existing command
→ targeted registered guard
→ small idempotent helper for proven repetition
→ Nx affected
→ LeanCTX only if it materially reduces repeated reads/noise
→ Graphify only if ownership/dependency/duplication/dead-code remains unresolved
→ OpenCodeReview for bounded diff/commit/range
→ runtime tooling only for runtime-changing/claimed work
```

لا تدّع Guard/Build/Test/Review/Runtime لم يُنفذ.

## 13. Manual acceptance وEvidence invalidation

Runtime/Visual/Operational claims تحتاج عند الانطباق actor حقيقيًا إلى persisted effect/readback، لا screenshot أو static success فقط. اختبر success/denied/wrong-scope/conflict/stale/slow-network/offline/duplicate/reconnect/restart بقدر الخطر.

أي relevant write لاحق في canonical truth/auth/authz/contract/generated client/schema/shared state/runtime foundation يبطل الأدلة السابقة المتأثرة. حددها وأعدها؛ لا تستخدم PASS أقدم من mutation أبطل معناه.

## 14. أقصى تقدم والعوائق

`BLOCKED_EXTERNAL` ليس اختصارًا لأي فشل داخلي. إذا حُجب مسار واحد خارجيًا:

1. جمّد المسار المتأثر فقط.
2. نفّذ كل العمل الداخلي المستقل الممكن.
3. وثّق blocker owner/evidence/attempts/minimum unblock action/resume point.

استخدم `NEEDS_EVIDENCE` عندما التنفيذ قد يكون صحيحًا لكن الدليل المطلوب مفقود أو stale. استخدم `FIX_REQUIRED` عندما بقي عيب داخلي قابل للإصلاح.

## 15. تحديث الحزمة

في Package mode حدّث Schema الحالي بالحقيقة الفعلية فقط:

```text
RESULT.json = status/baselineSha/resultingSha/completed tasks/modified paths/check results/blockers/deviations/decision
EXECUTION.json + EXECUTION-ORDER.json = actual state; max one IN_PROGRESS
COVERAGE.json = only when impact assessment changed
MANIFEST.json = latest observed SHA + actual implementation/verification/decision state allowed by schema
```

لا تجعل `PASS/DONE` مع required check فاشل/غير منفذ أو blocker/deviation مفتوح.

## 16. Commit وPush

نفّذ Commit عند حد concern منطقي وبعد الفحوص اللازمة لذلك الحد:

```text
LOCAL_ONLY      = no commit / no push
COMMIT          = commit only
COMMIT_AND_PUSH = commit + push to TARGET_REF
```

لا PR/Merge/Release/Production دون طلب صريح منفصل. بعد Push أعد تثبيت الرأس.

## 17. جولة إغلاق عدائية

بعد اعتقادك أن التنفيذ اكتمل، لا تغلق مباشرة. راجع الـdiff والمسار كخصم وابحث عن:

```text
unfixed root cause
parallel truth / stale contract / legacy route
hidden writer/reader/consumer
missing migration/compatibility consumer
journey/surface/control gap
security bypass / missing negative path
retry/recovery/unknown-result gap
runtime-only defect
stale evidence
observability/audit gap
out-of-scope diff
```

أي خلل داخلي جديد يعيد `DIAGNOSE → FIX → VERIFY`. هذه الجولة ليست موافقة مستقلة ولا تسمح للمنفذ باعتماد نفسه.

## 18. Read-only final verification

بعد آخر كتابة:

```text
FREEZE WRITES
→ pin final candidate SHA
→ run required final checks read-only
→ confirm generated outputs clean
→ confirm no out-of-scope diff
→ confirm required readbacks/evidence belong to final SHA
→ decide
```

يُمنع في التحقق النهائي أي أمر يغير المصدر أو الدليل الذي يثبته، بما في ذلك `--fix`, formatter, generation, cleanup apply, lockfile/migration mutation, commit, push, merge أو ابتلاع exit code. إذا غيّر التحقق المصدر، عد إلى التنفيذ ثم أعد تحققًا جديدًا.

## 19. Package closure والموافقات

قبل `CLOSED_WITH_EVIDENCE` اقرأ `governance/contracts/decision-vocabulary.json` وDelivery policy وحدد كل evidence scope منطبق. لا يمنح المنفذ نفسه Product/QA/Security/Finance/Isolation/Release/Production/final-closure approval محميًا.

عند الحزمة، لا تغلق قبل ثبوت:

```text
all in-scope units DONE
all required checks PASS on valid recorded SHAs
root causes removed
no relevant parallel truth
owners/contracts/clients/migrations aligned
writers/readers/consumers migrated
required journeys/surfaces/readbacks closed
security/negative/retry/recovery evidence when applicable
no stale evidence
no fixable in-scope defect
```

وعند توفر Shell وشروط الحزمة:

```powershell
node plans/diagnose-implementing/validate-package.mjs <PACKAGE_PATH> --strict --closure
```

Validator PASS يثبت تماسك الحزمة ضمن ما يفحصه، ولا يخلق approval محميًا.

## 20. القرار والتقرير

استخدم القاموس الحالي فقط:

- `PASS`: claim/evidence scope معلن مثبت؛ ليس إغلاقًا نهائيًا.
- `FIX_REQUIRED`: بقي فشل داخلي.
- `NEEDS_EVIDENCE`: دليل مطلوب مفقود/stale/unavailable.
- `BLOCKED_EXTERNAL`: مانع خارجي حقيقي بعد استنفاد العمل الداخلي الممكن.
- `READY_FOR_REVIEW`: التنفيذ والفحوص المستهدفة جاهزة لمراجعة مستقلة/محمية.
- `PROTOCOL_VIOLATION`: خرق قاعدة حاكمة.
- `CLOSED_WITH_EVIDENCE`: كل applicable evidence scopes + required approvals مكتملة على candidate نفسه بلا fail/blocked/pending.

التقرير:

```text
repository / target_ref
starting_sha / final_sha
package_or_task
root_causes_fixed
changed/removed/moved paths
contracts/clients/migrations/data changes
surfaces/journeys/readbacks closed
checks with actual results + proof limits
runtime/security/finance/isolation/manual evidence
invalidated evidence rerun
out-of-scope diff
commits/push result
remaining external blocker or missing evidence + resume point
required independent/protected reviews
final decision
```
