# عقد ملف التشخيص والتنفيذ والإغلاق لكل رحلة

هذا العقد إلزامي لكل ملف `J001..J107`. الملخص العام أو سرد أسماء الشرائح لا يكفي. يجب أن يصبح ملف الرحلة مرجعًا تنفيذيًا وتشخيصيًا مستقلًا يمكن لمهندس أو مختبر تشغيله دون الرجوع إلى افتراضات خارجية.

## 1. الهوية والحكم

يجب تسجيل:

```yaml
journey_id:
title:
canonical_owner:
participating_domains: []
actors: []
service_identities: []
required_surfaces: []
explicitly_excluded_surfaces: []
dependencies: []
execution_order:
current_sha:
assessment_status: NOT_ASSESSED|ASSESSED|FIX_REQUIRED|IN_PROGRESS|NEEDS_EVIDENCE|PASS
closure_status: OPEN|BLOCKED_EXTERNAL|CLOSED_WITH_EVIDENCE
```

كل Surface مستبعد يحتاج سبب Product Truth ودليل. عبارة «غير مطلوب» وحدها مرفوضة.

## 2. النتيجة التشغيلية والمنطق الكامل

يجب وصف الرحلة كسيناريو متسلسل:

1. من يبدأها ولماذا.
2. شروط الدخول السابقة.
3. أول Surface ومدخل الرحلة.
4. كل قرار وصلاحية وحالة انتقال.
5. كل كتابة وقراءة وأثر محفوظ.
6. انتقال الحقيقة بين الخدمات والأسطح.
7. النتيجة النهائية المرئية لكل Actor.
8. ماذا يحدث عند الفشل أو الانقطاع أو التكرار أو النتيجة المجهولة.
9. شروط الخروج ومن يستهلك النتيجة لاحقًا.

يجب إضافة مخطط نصي:

```text
ACTOR
→ SURFACE ENTRY
→ SESSION + TRUSTED CONTEXT
→ UI CONTROL
→ GENERATED CLIENT OPERATION
→ API GATEWAY/BFF/DSH FACADE
→ DOMAIN HANDLER
→ STATE MACHINE
→ DATABASE TRANSACTION
→ OUTBOX/EVENT/JOB/PROVIDER
→ READ MODEL
→ EVERY REQUIRED SURFACE
→ MANUAL + AUTOMATED EVIDENCE
```

## 3. التشخيص الحالي: الموجود والناقص والخاطئ

### 3.1 الموجود المثبت

جدول إلزامي، ولا يسجل عنصر بلا مسار ورمز ودليل:

| الطبقة | الموجود | المسار/الرمز | حالة الاستخدام | دليل SHA | الحكم |
|---|---|---|---|---|---|
| Product Truth | | | ACTIVE/DEAD/PARTIAL | | |
| OpenAPI | | | | | |
| Generated client | | | | | |
| Backend | | | | | |
| Database | | | | | |
| Events/jobs | | | | | |
| Shared frontend brain | | | | | |
| Surface UI | | | | | |
| Runtime/CI/tests | | | | | |

إذا لم يُفحص العنصر يسجل `UNPROVEN`، ولا يحول إلى «موجود» أو «غير موجود» بالافتراض.

### 3.2 الناقص

| gap_id | العنصر الناقص | أثره التشغيلي | الأسطح المتأثرة | الخطورة | سبب الإثبات | التصحيح المطلوب |
|---|---|---|---|---|---|---|

### 3.3 الخاطئ أو المتعارض

يشمل: مصدر حقيقة موازٍ، route ميت، عقد يدوي، handler غير مربوط، جدول بلا مالك، زر بلا أثر، حالة UI كاذبة، صلاحية شكلية، fallback غير حاكم، direct WLT access، dead code، أو وثيقة متعارضة.

| defect_id | الموجود الخاطئ | السبب الجذري | لماذا لا يكفي ترقيعه | القرار: إصلاح/استبدال/دمج/حذف | خطة الترحيل | دليل عدم التراجع |
|---|---|---|---|---|---|---|

### 3.4 المطلوب إضافته

| addition_id | الإضافة | المالك | الطبقة | التبعيات | الاختبارات | دليل التشغيل |
|---|---|---|---|---|---|---|

## 4. مصفوفة كل Surface

يكرر القسم التالي لكل Surface من: `control-panel`, `app-client`, `app-partner`, `app-captain`, `app-field`.

### `<surface-name>`

#### سبب وجود الرحلة على السطح

يحدد Actor والقرار الذي يتخذه وما إذا كان السطح يكتب أم يقرأ أم يراقب فقط.

#### المدخل والتنقل

- route/deep link.
- tab/section/menu item.
- session/readiness gate.
- back/cancel/resume behavior.
- empty or direct-link behavior.

#### الصفحات والتبويبات والأقسام

| route | screen/page | tab/section | الغرض | مصدر البيانات | permission | الحالة الافتراضية |
|---|---|---|---|---|---|---|

#### الأزرار والأيقونات والنماذج والميزات

| control_id | label/accessibility name | النوع | متى يظهر | متى يتعطل | confirmation | command/query | success readback | negative test |
|---|---|---|---|---|---|---|---|---|

لا يكفي ذكر «زر حفظ». يجب تحديد العملية المولدة، handler، الأثر المحفوظ، وما يظهر بعد النجاح والفشل.

#### الحالات المرئية الإلزامية

- initial/loading/refreshing.
- empty/no-results.
- validation error.
- forbidden/hidden/disabled.
- blocked by business rule.
- conflict/stale version.
- offline/queued/reconnecting.
- partial dependency failure.
- unknown result بعد فقد الرد.
- success/readback.
- terminal/archived/deleted عندما تنطبق.

لكل حالة يجب تحديد النص، الأفعال المتاحة، وما إذا كانت retry آمنة.

#### ما يجب أن يظهر بعد كل انتقال

| الانتقال | قبل الإجراء | أثناءه | نجاحه | فشله | ما يظهر بعد refresh/restart | ما يظهر في بقية الأسطح |
|---|---|---|---|---|---|---|

#### تجربة المستخدم

- ترتيب المعلومات ووضوح السبب والخطوة التالية.
- منع double submit.
- حفظ draft عند الانطباق.
- RTL والعربية والأرقام والعملات والتواريخ.
- keyboard/screen reader/large text/touch target.
- slow network/low memory/device rotation.

## 5. العقد والتقنية والبرمجة

### العقود

- OpenAPI operationIds وschemas وsecurity/error/idempotency.
- generated clients فقط للأسطح.
- منع Request/Response/Status authority اليدوي.
- compatibility policy والتغييرات الكاسرة.

### الباك إند والمنطق

- route registration.
- middleware/trusted context.
- handler/application service/domain service/repository.
- validation وauthorization قبل الأثر.
- transaction boundary وversion locking.
- state machine وallowedActions من الخادم.
- timeouts/retries/result lookup.

### البيانات

- tables/columns/FKs/checks/unique/indexes.
- migration fresh/upgrade/replay/checksum/rollback-forward.
- retention/PII/encryption.
- seed/fixture classification.
- projection rebuild وreconciliation.

### الأحداث والتكاملات

- event owner/version/outbox/inbox.
- ordering/deduplication/replay/DLQ.
- provider adapter/signature/timeout/circuit breaker.
- compensation/reconciliation.

### DSH/WLT

- DSH يملك الحقيقة التشغيلية.
- WLT يملك المبلغ والرصيد والدفتر والدفع والاسترداد والتسوية والأهلية المالية.
- Surface→DSH فقط.
- DSH يخزن references/projections masked ومحدودة العمر فقط.

## 6. نموذج الحالات والانتقالات

| current_state | actor | command | preconditions | next_state | persisted effect | emitted event | visible result | forbidden reasons |
|---|---|---|---|---|---|---|---|---|

يجب إضافة اختبارات لكل انتقال صالح ولكل انتقال ممنوع، وسباقات terminal state وcancellation وreassignment وpolicy changes عند الانطباق.

## 7. خطة التنفيذ المتدرج

```text
ASSESS
→ CLASSIFY EXISTING/MISSING/WRONG
→ FIX AUTHORITY/TRUST
→ FIX CONTRACT
→ FIX BACKEND/STATE MACHINE
→ FIX DATABASE/MIGRATIONS
→ FIX EVENTS/INTEGRATIONS
→ FIX SHARED FRONTEND BRAIN
→ FIX EACH SURFACE
→ CLEAN LEGACY/PARALLEL TRUTH
→ TARGETED TESTS
→ MANUAL ACCEPTANCE
→ RUNTIME CROSS-SURFACE READBACK
→ SAME-SHA VERIFY
```

كل خطوة تسجل ملفاتها وسببها ونتيجة التحقق. لا يبدأ Surface UI قبل ثبات العقد والمنطق الخادمي، إلا عندما يكون العمل Discovery غير قابل للكتابة.

## 8. مصفوفة الاختبارات الآلية

| المستوى | السيناريو الإيجابي | السيناريوهات السلبية | concurrency/idempotency | recovery | الأمر | النتيجة |
|---|---|---|---|---|---|---|
| Unit | | | | | | |
| Contract | | | | | | |
| Backend integration | | | | | | |
| Database | | | | | | |
| Event/job/provider | | | | | | |
| Frontend/controller | | | | | | |
| Surface integration | | | | | | |
| Runtime E2E | | | | | | |
| Security | | | | | | |
| Accessibility/performance | | | | | | |

## 9. Runbook التجريب اليدوي

يجب أن يحتوي أرقام حالات اختبار مستقلة:

- `MAN-01` المسار الإيجابي الكامل.
- `MAN-02` صلاحية ناقصة.
- `MAN-03` Object/partner/store/actor خارج النطاق.
- `MAN-04` validation/business block.
- `MAN-05` double click/repeated request.
- `MAN-06` concurrent update/stale version.
- `MAN-07` network loss قبل الإرسال.
- `MAN-08` network loss بعد commit وقبل الرد.
- `MAN-09` dependency/provider unavailable.
- `MAN-10` offline queue/reconnect.
- `MAN-11` refresh/restart/reinstall readback.
- `MAN-12` RTL/accessibility/large text.
- `MAN-13` cross-surface convergence.
- `MAN-14` cleanup/no legacy path.

كل حالة تسجل: الإعداد، Actor، Surface، الخطوات الدقيقة، كل زر ينقر، الطلب المتوقع، الأثر في DB/event، النتيجة المرئية، الأدلة، والقرار.

## 10. الإزالة والترحيل

لا يحذف عنصر قبل توثيق:

- المستهلكين الحاليين.
- البديل الحاكم.
- ترتيب الترحيل.
- data migration/backfill.
- compatibility window إن كانت معتمدة.
- negative guard يمنع عودته.
- تحقق عدم وجود imports/routes/jobs/runtime references.

## 11. دليل الإغلاق

```yaml
closure_evidence:
  sha:
  existing_inventory_complete: false
  missing_inventory_complete: false
  wrong_inventory_complete: false
  additions_complete: false
  required_surfaces_verified: []
  controls_verified: []
  state_transitions_verified: []
  automated_commands: []
  manual_cases: []
  runtime_readbacks: []
  security_results: []
  database_results: []
  removed_parallel_truths: []
  open_items: []
  decision: FIX_REQUIRED|NEEDS_EVIDENCE|CLOSED_WITH_EVIDENCE
```

لا تغلق الرحلة عندما يكون أي جدول فارغًا بسبب عدم القياس، أو يوجد `UNPROVEN`, أو فحص Required متخطى، أو دليل من SHA مختلف.

يُحظر اعتبار أي تغيير برمجي مكتملًا قبل اجتيازه مراجعة **OpenCodeReview** ثم الحراس والاختبارات والتحقق على نفس الـSHA، مع استخدام **LeanCTX** افتراضيًا عند تضخم السياق، وإلزام **Graphify** فقط عند تعذّر حسم الملكية أو الاعتماديات أو أثر التغيير بالفحص المباشر.
