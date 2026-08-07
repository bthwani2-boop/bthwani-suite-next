# الأمر 2 — التنفيذ الجذري حتى أعلى قرار مثبت

Status: DERIVED_SUPPORT

استخدم هذا الأمر لتنفيذ **حزمة موجودة تحت `plans/diagnose-implementing/` أو مهمة مباشرة** داخل المستودع حتى أعلى نتيجة يمكن إثباتها، دون ترقيعات سطحية أو ادعاءات تتجاوز الأدلة.

## المدخلات

```text
REPOSITORY: <owner/repo>
TARGET_REF: <branch-or-ref>
MODE: <PACKAGE | DIRECT_TASK>
PACKAGE_PATH: <plans/diagnose-implementing/<task> | N/A>
TASK: <direct task when MODE=DIRECT_TASK>
DELIVERY: <NO_COMMIT | COMMIT | COMMIT_AND_PUSH>
```

## أمر التنفيذ

نفّذ العمل وفق `governance/GOVERNANCE.md` و`governance/product/PRD.md` والسياسات العامة المنطبقة وProduct Truth الحالي. ثبّت أحدث SHA للفرع الذي حدده المستخدم، أعد حل الرأس قبل كل دفعة كتابة وبعدها، ولا تستبدل الفرع ولا تستخدم force/reset ولا تطمس تغييرات أحدث.

### 1. Preflight

سجّل القدرة الفعلية:

```text
CAN_READ_REPOSITORY
CAN_WRITE_REPOSITORY
CAN_EXECUTE_SHELL
CAN_RUN_NODE
CAN_RUN_DATABASE
CAN_RUN_RUNTIME
CAN_COMMIT
CAN_PUSH
```

لا تدّع أي تنفيذ غير متاح للمضيف.

### 2. Package mode

إذا كان `MODE=PACKAGE`:

1. اقرأ `MANIFEST.json`, `COVERAGE.json`, `EXECUTION-ORDER.json` والوحدة الجاهزة فقط.
2. تحقق من أن pinned baseline ما زال صالحًا أو نفّذ impact reconciliation مع الرأس الحالي.
3. شغّل قبل التنفيذ إن أمكن:

```powershell
node plans/diagnose-implementing/validate-package.mjs <PACKAGE_PATH> --strict
```

4. لا تبدأ وحدة تعتمد على dependency غير `DONE`.
5. لا تجعل أكثر من وحدة كتابة `IN_PROGRESS` في الوقت نفسه.

إذا فشل strict بسبب الخطة نفسها، أصلح الحزمة قبل تنفيذ المنتج. إذا صار سبب الفشل نتيجة drift حقيقي في المستودع، أعد تشخيص الأثر وحدّث الخطة بأقل توسع لازم.

### 3. Direct task mode

إذا كان `MODE=DIRECT_TASK` فابدأ مباشرة فقط عندما تكون الملكية والنطاق والنتيجة واضحة ومحدودة. إذا أثبت التشخيص أن المهمة واسعة/متعددة الملكيات/عالية المخاطر أو تحتاج عدة concerns مترابطة، حوّلها إلى حزمة `plans/diagnose-implementing/` بدل إدارة الخطة في المحادثة أو الذاكرة.

### 4. حل السبب الجذري

لكل concern:

```text
current symptom
→ authoritative owner
→ root cause
→ canonical target state
→ central fix
→ affected consumer migration
→ obsolete/parallel path removal
→ persisted/canonical readback
→ affected verification
```

ممنوع:

- إصلاح UI يخفي خلل backend/domain؛
- local/mock/fallback state يمثل runtime truth؛
- handwritten API types/client عندما يوجد contract-generated owner؛
- duplicate write path أو dual truth؛
- bypass للـauthorization/serviceability/readiness/state machine؛
- DSH/frontend mutation لحقيقة مالية يملكها WLT؛
- تعديل migration مطبق بدل forward migration؛
- تغيير status مباشرة في DB لتجاوز transition حاكم؛
- retry مالي/خارجي بهوية جديدة قبل حسم unknown outcome.

### 5. Full-stack multi-surface

أي state يكتب في سطح ويقرأ/يؤثر في سطح آخر يُنفذ كمسار واحد:

```text
interaction
→ shared controller/adapter
→ generated contract/client
→ route/domain
→ persistence/events/integration
→ canonical readback
→ كل سطح مطلوب متأثر
```

لا تعتبر المهمة مغلقة لأن السطح الابتدائي يعمل وحده.

### 6. الهوية والأمن

عند الانطباق تحقق من:

```text
authentication
session/activation/revocation
role + permission
trusted Platform/Operator context
Partner/Store/Actor business scope
object authorization / IDOR
service authentication
PII/secrets/logging
cross-scope negative paths
```

Client-controlled context لا يملك صلاحية الثقة.

### 7. DSH / WLT

- DSH: operational truth + bounded application-facing WLT references/projections فقط.
- WLT: ledger, wallet, payment, refund, settlement, payout, commission, reconciliation truth.
- أي financial mutation يجب أن تمر بالمالك WLT وبـidempotency/correlation/state constraints الحالية.
- timeout/unknown provider outcome يبقى reconcilable ولا يتحول إلى نجاح محلي.

### 8. PostgreSQL

عند تغير البيانات/schema:

- migration forward/ordered/deterministic؛
- constraints/indexes/FKs/checks حسب invariant؛
- transaction/concurrency/idempotency واضحة؛
- backfill آمن وقابل للتحقق؛
- لا rewrite لتاريخ migration مطبق؛
- لا drop/destructive cleanup قبل إثبات consumers/data/rollback.

### 9. Events/jobs/providers

تحقق عند الانطباق من transaction/outbox, stable event identity, idempotent consumers, retry/backoff/DLQ/lease, reconciliation, provider auth/signature/replay protection, timeout وunknown result، ولا تنشئ duplicate side effect لتحسين المظهر التشغيلي.

### 10. UI/UX

لكل سطح مطلوب راجع controls/routes/screens والنواتج الحقيقية، مع الحالات المنطبقة:

```text
loading
empty
offline
forbidden
conflict
partial
unknown-result
error
retry/recovery
success after canonical readback
```

وتحقق من RTL/localization/accessibility/focus/large text/device/network عند تأثرها.

### 11. Tool ladder

استخدم أصغر أداة تحقق الحاجة:

```text
direct inspection
→ focused search/existing command
→ targeted registered guard
→ small idempotent helper
→ Nx affected
→ LeanCTX only if it materially reduces repeated context
→ Graphify only if ownership/dependency remains unresolved
→ OpenCodeReview for bounded diff/range
→ runtime tools only for runtime-changing/claimed work
```

لا تشغّل full tool suite تلقائيًا.

### 12. Verification

ابدأ بالأصغر الكافي ثم توسع بالمخاطر:

```text
targeted unit/domain
→ type/lint/static
→ contracts/generated clients/bindings
→ migrations/database integration
→ cross-service/integration
→ targeted runtime/startup/health/readback
→ visual/device/a11y/performance when claimed
→ full workspace/runtime only when impact requires it
```

أي تعديل بعد دليل يؤثر على claim يبطل ذلك الدليل ويستلزم إعادة تشغيله.

### 13. Package result updates

في Package mode حدّث ملفات الوحدة والحزمة بالحقيقة الفعلية فقط. لا تكتب `PASS` لفحص لم يُنفذ، ولا تحول blocker داخلي إلى `BLOCKED_EXTERNAL`.

بعد كل وحدة مكتملة:

```text
RESULT.json = actual changed paths / resulting SHA / decision / evidence / blockers
EXECUTION-ORDER.json = current status
COVERAGE.json = only if impact assessment changed
MANIFEST.json = current implementation/verification state
```

### 14. Commit/push

نفّذ commit منطقيًا حسب concern عندما يسمح `DELIVERY`. قبل push أعد حل رأس الفرع وصالح أي حركة جديدة. لا تخلط إصلاحًا غير مرتبط داخل نفس commit فقط لتقليل العدد.

### 15. القرار النهائي

استخدم القاموس الحالي فقط:

- `PASS`: الادعاء المحدد مثبت.
- `FIX_REQUIRED`: عيب داخلي مطلوب الإصلاح بقي مفتوحًا.
- `NEEDS_EVIDENCE`: التنفيذ قد يكون صحيحًا لكن دليل مطلوب مفقود/stale/unavailable.
- `BLOCKED_EXTERNAL`: اعتماد خارجي حقيقي يمنع الباقي.
- `READY_FOR_REVIEW`: التنفيذ والأدلة جاهزة لمراجعة مستقلة/محمية.
- `PROTOCOL_VIOLATION`: تم خرق قاعدة تنفيذ حاكمة.
- لا تصدر `CLOSED_WITH_EVIDENCE` إلا إذا كانت كل scopes والاعتمادات المطلوبة مثبتة على نفس candidate وفق Delivery policy.

إذا كانت الحزمة جاهزة للإغلاق وشروط validator متحققة شغّل فقط:

```powershell
node plans/diagnose-implementing/validate-package.mjs <PACKAGE_PATH> --strict --closure
```

وجود validator PASS لا يمنح approval محميًا غير موجود.

## التقرير

```text
repository
target_branch
start_sha
final_sha
package_or_task
root_causes_fixed
changed_paths
removed_parallel_or_legacy_paths
checks_with_actual_results
runtime/readback evidence
unavailable_or_stale evidence
required independent/protected reviews
final_decision
```
