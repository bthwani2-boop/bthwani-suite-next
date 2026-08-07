# الأمر الثالث — المراجعة المستقلة العدائية والإغلاق المثبت

> **الغرض:** مراجعة Commit/Range/حزمة منفذة من منظور مستقل قدر الإمكان، والتحقق مما إذا كانت النتيجة تستحق `PASS` أو `READY_FOR_REVIEW` أو `NEEDS_EVIDENCE` أو قرار منع آخر، وصولًا إلى `CLOSED_WITH_EVIDENCE` فقط عندما تتحقق شروطه الحاكمة فعلًا.
>
> **حد السلطة:** هذا Prompt مادة تنفيذ مشتقة وليس سلطة. لا يخلق موافقة ولا يمنح المراجع صفة بشرية/أمنية/مالية/إصدارية لا يملكها. تُحسم السلطة من تعليمات المهمة الحالية ثم `governance/authority/authority-precedence.json` و`AGENTS.md` والحوكمة والعقود الحية على SHA المرشح.

## 0. المدخلات

```text
المستودع: <OWNER/REPOSITORY>
الفرع/المرجع: <BRANCH_OR_REF>
Candidate SHA: <40_SHA | RESOLVE_CURRENT_HEAD>
Baseline SHA أو Range: <BASE_SHA | NONE>
Package path: <tools/diagnose-implementing/... | NONE>
Claimed outcome: <CLAIM>
Required evidence scopes: <AUTO_FROM_CHANGE_IMPACT | EXPLICIT_LIST>
Review authorization: <READ_ONLY_REVIEW>
```

الوضع الافتراضي لهذا الأمر **READ ONLY**. لا يصلح المصدر أثناء التحقق. إذا اكتُشف خلل داخلي، أصدر `FIX_REQUIRED` مع Finding قابل للتنفيذ وأعده إلى أمر التنفيذ الثاني؛ بعد الإصلاح تبدأ جولة مراجعة جديدة على SHA جديد. يمنع أن يصلح verifier الكود ثم يعتبر أدلته السابقة صالحة.

---

## 1. ثبّت المرشح ولا تراجع هدفًا متحركًا

1. تحقق من المستودع والفرع المحددين.
2. حل الرأس الحالي واحفظ `OBSERVED_HEAD_SHA`.
3. إذا أُعطي `Candidate SHA` فتأكد أنه موجود وأن علاقته بالفرع/الـRange مفهومة.
4. ثبّت المرشح باسم `REVIEWED_SHA` واستخدمه لكل قراءة ودليل.
5. إذا تحرك الفرع أثناء المراجعة، لا تنقل PASS تلقائيًا إلى الرأس الجديد؛ أكمل حكم المرشح المثبت أو أعد المراجعة على المرشح الجديد صراحة.
6. أي دليل من SHA مختلف يصنف `STALE_EVIDENCE` ما لم يكن الدليل بطبيعته خارجيًا وغير مرتبط بالمصدر ومسموحًا بذلك عقديًا.

لا Force Push، لا Merge، لا Release، لا Deploy، ولا source mutation في Review mode.

---

## 2. Capability Preflight

أعلن بصدق ما يمكن للمضيف تنفيذه:

```text
CAN_READ_EXACT_SHA
CAN_READ_DIFF
CAN_EXECUTE_SHELL
CAN_RUN_GUARDS
CAN_RUN_TESTS
CAN_RUN_BUILD
CAN_RUN_RUNTIME
CAN_ACCESS_DATABASE
CAN_ACCESS_DEVICE_OR_BROWSER
CAN_READ_CI
CAN_VERIFY_GITHUB_RULES
CAN_SUPPLY_INDEPENDENT_APPROVAL
```

عدم توفر قدرة لا يتحول إلى PASS. استخدم `NEEDS_EVIDENCE` عندما قد يكون التنفيذ صحيحًا لكن الإثبات المطلوب غير متاح، و`BLOCKED_EXTERNAL` فقط عندما يوجد مانع خارجي حقيقي يمنع التقدم المطلوب.

---

## 3. حل السلطة قبل فحص التنفيذ

اقرأ على `REVIEWED_SHA`:

```text
governance/authority/authority-precedence.json
AGENTS.md
governance/GOVERNANCE.md
السياسات الست المنطبقة
machine-readable contracts المنطبقة
Product Truth / platform model عند الحاجة
guard registry + guard sets + guard assurance
single-owner contract عند الحاجة
release/SDLC contracts عند الحاجة
```

افصل:

```text
NORMATIVE TRUTH = ما يجب أن يكون ومن يملك القرار.
IMPLEMENTATION TRUTH = ما يوجد في الكود والعقود والبيانات.
RUNTIME TRUTH = ما تم إثباته أثناء التشغيل.
EVIDENCE TRUTH = ماذا أثبت كل فحص فعلًا وعلى أي SHA.
```

أي Prompt/Plan/Report/Runbook/Derived package يستخدم للاستدلال فقط ولا يرفع رتبته بنفسه.

---

## 4. افحص الـDiff أولًا ثم وسّع حسب الأثر

ابدأ من:

```text
BASE_SHA..REVIEWED_SHA
```

وصنّف كل تغيير إلى:

```text
product / authority / governance / guard
identity-security-isolation
contract-generated-client
backend-domain
migration-data
financial-DSH-WLT
shared-brain
surface-ui
runtime-infrastructure
CI-release
cleanup-docs
```

ثم احسب المستهلكين والتبعيات والأثر غير المباشر. لا تفترض أن «ملفات قليلة = مخاطرة قليلة»، ولا تفحص المستودع كله دون سبب.

استعمل مبدأ:

```text
AFFECTED FIRST + RISK EXPANSION
```

وسع إذا مسّ التغيير مصدر حقيقة مركزيًا أو عقدًا مشتركًا أو هوية/صلاحية/عزلًا أو Migration أو WLT أو Shared Brain أو عدة أسطح أو Release/Production.

---

## 5. مصفوفة ادعاء ← دليل

قبل تشغيل أي فحص، حدد ما الذي يحتاجه الادعاء:

| Claim | Minimum evidence class |
| --- | --- |
| schema/registry consistency | static/schema guard |
| import/binding/ownership | static binding + affected checks |
| product acceptance | product evidence/approval حسب العقد |
| endpoint behavior | same-commit runtime request/response |
| persisted mutation | runtime + database/readback |
| cross-surface journey | runtime journey + all required surface readbacks |
| authorization/isolation | negative security/runtime evidence |
| WLT financial truth | finance-specific evidence + WLT readback/reconciliation |
| migration safety | migration execution/invariants/backfill evidence |
| visual behavior | visual/manual/runtime evidence |
| accessibility behavior | runtime a11y + manual review when required |
| CI claim | actual same-commit CI result |
| release/production | release/deployment/production evidence + authority |
| final closure | all applicable scopes + approvals on same immutable candidate |

لا تسمح لـStatic أن يثبت Runtime، أو Build أن يثبت Security، أو Screenshot أن يثبت persisted effect، أو Merge أن يثبت Approval، أو Deployment أن يثبت Production verification.

---

## 6. راجع Guard system كعقد لا كقائمة أوامر

المصادر الحاكمة:

```text
governance/guards/guard-registry.json
governance/guards/guard-sets.json
governance/guards/guard-assurance.json
package.json
CI workflows
```

لكل Guard تستخدمه تحقق من:

```text
registered ID
execution route موجود
source موجود
exit level صحيح
membership في set إذا لزم
assurance entry موجودة للحراس الحاكمة
proves / doesNotProve معروفان
الفشل لا يتم ابتلاعه
direct/CI execution لا يعدل المصدر
```

اختر أقل مجموعة كافية. لا تشغل كل الحراس لمجرد أن المهمة وصفت بأنها عميقة.

إذا كان Shell متاحًا، شغّل الفحوص المنطبقة من الأوامر المسجلة فقط. لا تخترع أسماء Guards. إذا لم يتوفر Shell، لا تدع أنها اجتازت.

---

## 7. مراجعة السبب الجذري والملكية

لكل Root Cause ادعى التنفيذ إصلاحه اسأل عدائيًا:

1. هل عولج **مالك الحقيقة** أم العرض الظاهر فقط؟
2. هل بقي Writer موازٍ أو Contract موازٍ أو State machine موازية؟
3. هل نُقل كل Consumer قبل إزالة القديم؟
4. هل توجد Fallbacks أو Compatibility bridges بلا owner/expiry/removal trigger؟
5. هل أضيف abstraction جديد بلا حاجة بينما كان REUSE/EXTEND/MERGE ممكنًا؟
6. هل ظهر مصدر حقيقة جديد داخل Surface أو test fixture أو config؟
7. هل يوجد مسار Legacy ما زال Runtime-reachable؟
8. هل تغيرت ownership semantics في docs فقط دون التنفيذ أو العكس؟

الناتج المقبول:

```text
ONE CANONICAL OWNER
ONE WRITE AUTHORITY
ONE CONTRACT SOURCE
NO UNBOUNDED PARALLEL TRUTH
```

---

## 8. منصة بثواني وحدود المجالات

تحقق من `governance/product/platform-model.yaml` والعقود الحالية بدل حفظ قيم من Prompt.

راجع خصوصًا الفصل بين:

```text
Platform Context
Operator Context
Partner
Store
Actor / Service Identity
Assignment
```

وافحص الحدود:

```text
Identity → auth/session/roles/permissions/identity
Workforce → workforce profile/assignment/readiness
DSH → commerce/partner/store/catalog/order/fulfillment/dispatch/delivery operational truth
WLT → financial truth and mutation
Platform Control → sovereign platform state/policy rollout
Providers/Media → owner-specific capabilities
Shared Brains → reusable orchestration/read models, not a second truth
Surfaces → presentation/interaction, not domain ownership
```

أي Surface أو DSH path يحسب/يعدل authoritative ledger/balance/settlement truth بدل WLT هو Finding ما لم يثبت عقد حاكم أحدث خلاف ذلك.

---

## 9. Contracts/API/Generated clients

تحقق من الاتجاهين:

```text
DECLARED CONTRACT ⊆ IMPLEMENTED OR EXPLICITLY UNSUPPORTED
IMPLEMENTED ROUTES ⊆ DECLARED OR REVIEWED EXCEPTION
```

وافحص:

- operation IDs/routes/errors/enums/nullability/validation.
- generated-client provenance وعدم تعديل generated output يدويًا.
- stale handwritten types/adapters.
- backwards/forwards compatibility حسب نافذة الإصدار الفعلية.
- contract composition لا يكرر ownership أو يخفى route حيًا.

عند Mobile/API change راجع mixed-version behavior؛ لا تفترض تحديث التطبيقات فورًا.

---

## 10. PostgreSQL/Migration review

عند تأثر البيانات، تحقق أن التغيير لا يعدل Migration مطبقة وأن مسار التطور الآمن موثق ومثبت عند الحاجة:

```text
EXPAND
→ compatible writers/readers
→ BACKFILL
→ verify invariants
→ switch writers
→ switch readers
→ remove temporary fallback
→ CONTRACT
```

راجع:

```text
transactionality / locks / indexes
batching / retry / idempotency
empty and populated database
conflicting/orphan/duplicate data
partial failure/restart
rollback or roll-forward
consumer migration before removal
```

نجاح SQL parse وحده لا يثبت data migration safety.

---

## 11. Security/Privacy/Isolation review

عند الانطباق حاول إثبات وجود ثغرة عبر:

```text
missing auth
session/token misuse
role/permission bypass
IDOR/object authorization
cross-partner/store/context leakage
client-supplied trusted context
privilege escalation
secret/PII leakage
unsafe logs
injection/path traversal/SSRF/upload abuse
replay/idempotency weakness
rate-limit/abuse gap
workflow permission escalation
```

لا تعتمد على UI hiding كAuthorization.

أي Security finding مانع يستخدم `SECURITY_BLOCK` أو `FIX_REQUIRED` وفق العقد والحالة، ولا يخفض إلى Warning لتسهيل الإغلاق.

---

## 12. DSH/WLT والماليات

عند أي أثر مالي، راجع:

```text
DSH operational fact
→ canonical financial request/reference
→ WLT idempotent mutation
→ ledger/audit
→ readback
→ reconciliation/compensation
→ bounded projection to consuming surfaces
```

اختبر duplicate/replay/race/timeout/lost response/unknown result/retry/outage/restart. لا تعتبر UI amount أو DSH cache دليلًا على Financial truth.

أي تغيير في Financial control يتطلب evidence/approval المناسب ولا يمكن للمنفذ منحه لنفسه.

---

## 13. Multi-surface journey review

لا تراجع السطح المعدل وحده. تتبع كل رحلة متأثرة:

```text
Actor intent
→ Entry/Control
→ Validation/Auth/Scope
→ Canonical API/domain write
→ Persistence/Event/Job
→ Readback
→ كل Surface مستهلك
→ Audit/Observability
```

غطِّ:

```text
success
invalid input
empty/not-ready
denied/wrong scope
conflict/stale state
duplicate interaction
race/idempotency
timeout/unknown result
offline/reconnect
partial failure/restart
retry/recovery/compensation
```

وجود ملف رحلة أو Plan ليس دليل تنفيذ. `tools/plans/smsm-dsh-wlt-journeys/` يستخدم كعدسة اكتشاف فقط وفق تصنيفه المشتق ولا يعدل من هذا الأمر.

---

## 14. UI/UX/Accessibility review

عند تغير Surface، راجع العنصر ضمن الرحلة لا كمظهر مستقل:

```text
route/navigation/deep-link
loading/empty/error/blocked/conflict/offline/unknown-result
form validation/destructive confirmation
real effect/readback
RTL/localization
keyboard/focus/screen reader
large text/responsive
performance where material
state restoration/reconnect
```

لا تقبل زرًا يغيّر Local state فقط عندما المطلوب أثرًا مركزيًا، ولا Screenshot وحده لإثبات رحلة.

---

## 15. Runtime/Resilience/Observability

إذا كان الادعاء تشغيليًا، يلزم same-commit runtime evidence بحسب الأثر:

```text
startup
health/readiness
actor-specific smoke
negative-path smoke
persisted readback
event/job/provider outcome
restart/recovery when relevant
logs/metrics/traces/audit identifiers
```

أي فحص نهائي يغيّر source أو generated committed output يبطل صفة verification؛ ارجع إلى التنفيذ، أنشئ Candidate SHA جديدًا، ثم أعد المراجعة.

---

## 16. Package review

إذا كانت المهمة تستخدم `tools/diagnose-implementing/<TASK_NAME>/`:

1. تحقق أن `COVERAGE.json` مكتمل ولا يوجد `UNASSESSED`.
2. تحقق من backlinks بين coverage والوحدات.
3. لا تسمح بوحدتين لنفس `executionConcern`.
4. تحقق من dependency DAG وعدم وجود دورة.
5. تحقق من `RESULT.json` لكل Unit والـSHA والفحوص الفعلية.
6. ابحث عن stale evidence بعد mutations لاحقة.
7. تحقق من Foundation gate والتبعيات المتأثرة.

عند توفر Shell شغّل:

```powershell
node tools/diagnose-implementing/validate-package.mjs <PACKAGE_PATH> --strict
```

وللإغلاق فقط بعد استيفاء جميع الأدلة:

```powershell
node tools/diagnose-implementing/validate-package.mjs <PACKAGE_PATH> --strict --closure
```

لا تستخدم `--disposal`.

نجاح Validator يثبت عقد الحزمة الذي يفحصه فقط؛ لا يصنع Runtime evidence أو protected approval مفقودة.

---

## 17. المراجعة العدائية النهائية

بعد نجاح الفحوص الأولية قم بجولة ثانية منفصلة وابحث عن شيء يفشل الحل:

```text
hidden writer/consumer
stale import/route/contract
parallel truth
missing negative test
missing migration/backfill
old mobile/new backend incompatibility
new mobile/old backend incompatibility when applicable
missing retry/recovery
cross-surface state divergence
security scope bypass
financial double mutation
stale evidence
non-deterministic guard or swallowed failure
runtime success relying on local/dev-only state
cleanup removed needed compatibility too early
```

اسأل: «ما أصغر counterexample يجعل claim غير صحيح؟» وحاول إثباته.

---

## 18. الموافقات والفصل بين السلطات

اقرأ `governance/authority/single-owner-mode.json` عند الانطباق.

- المالك الوحيد يمكنه فقط ما يسمح به العقد الحالي وفي المجالات المسموحة وبالشروط المسجلة.
- executor/reviewer الآلي لا ينتحل هوية المالك.
- protected domains لا تصبح approved بسبب blanket authorization.
- `READY_FOR_REVIEW` لا يساوي approval.
- missing approval لا يتحول إلى PASS.

عند الحاجة إلى مراجعة بشرية/أمنية/مالية/إصدارية غير متوفرة، سجلها بوصفها evidence/approval مفقودة وفق القرار الحاكم.

---

## 19. شروط القرار

استخدم فقط `governance/contracts/decision-vocabulary.json` الحالي.

### `FIX_REQUIRED`
عند وجود خلل داخلي قابل للإصلاح، تناقض، regression، missing consumer، contract/schema/data defect، security gap، أو فشل required check.

### `NEEDS_EVIDENCE`
عندما لا يوجد Finding مثبت يمنع التنفيذ لكن دليلًا مطلوبًا غير منفذ/غير متاح/قديم/من SHA مختلف.

### `READY_FOR_REVIEW`
عندما نجح التنفيذ والفحص الفني المطلوب حتى هذه النقطة لكن اعتمادًا مستقلًا حاكمًا ما زال مطلوبًا.

### `BLOCKED_EXTERNAL`
عندما يعتمد إثبات/إكمال مطلوب على طرف أو وصول أو Provider أو Infrastructure خارجي لا يمكن تجاوزه بأمان.

### `QA_BLOCK` / `SECURITY_BLOCK` / `RELEASE_BLOCK`
استخدمها عندما يطابق المانع نطاقها الحاكم.

### `PASS`
فقط لنطاق Evidence معلن نجح بالفعل على `REVIEWED_SHA`. لا يعني Merge/Release/Closure.

### `CLOSED_WITH_EVIDENCE`
فقط إذا:

```text
كل applicable evidence scopes PASS
كل protected approvals المنطبقة موجودة وصحيحة
كلها تخص نفس immutable candidate
لا fail
لا blocked
لا pending
لا stale evidence
لا unresolved related defect
لا parallel truth
لا missing consumer/readback
لا branch/candidate mismatch
```

---

## 20. التقرير النهائي

أصدر تقريرًا مركزًا:

```text
repository
branch/ref
reviewed SHA
baseline/range
claimed outcome
change-impact/risk classification
authority sources applied
files/domains/surfaces/journeys affected
root-cause/ownership verdict
contract/data/security/finance/runtime verdicts
selected guards + assurance boundaries
checks actually executed + results
checks not executable + reason
same-commit evidence matrix
stale/rejected evidence
adversarial findings
required approvals + actual state
exact blocking findings or missing evidence
canonical decision
resume action
```

إذا كان القرار `FIX_REQUIRED`، أعطِ Findings دقيقة قابلة للتنفيذ ولا تعدل المصدر في Review mode. إذا عادت المهمة للتنفيذ، استخدم الأمر الثاني على Candidate جديد ثم أعد هذا الأمر من البداية.
