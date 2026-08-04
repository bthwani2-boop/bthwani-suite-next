# FOUNDATION-00 — خط الأساس الحاكم قبل تنفيذ الرحلات

```yaml
repository: bthwani2-boop/bthwani-suite-next
branch: smsm
last_assessed_sha: 9ee33187eac5d44832f9cb7a43d48117e5922b1c
current_package_sha: 9ee33187eac5d44832f9cb7a43d48117e5922b1c
status: FIX_REQUIRED
journey_execution_allowed: false
journey_assessment_allowed: true
merge_allowed: false
```

> `status` stays `FIX_REQUIRED` deliberately. PHASE-01..05 closed with evidence
> on this head, but PHASE-06 did not: the authenticated DSH↔WLT financial
> readback is unproven, and a newly found systemic authorization defect
> (`FND-D06`) is open. Technical progress is not product acceptance.

## الهدف

إنشاء خط أساس أخضر وقابل لإعادة التشغيل بحيث يمكن عزو أي فشل لاحق إلى الرحلة المفتوحة، لا إلى خلل عام في الأدوات أو المهاجرات أو Runtime أو العقود.

## الموجود المثبت

| المجال | الموجود | الدليل الحالي | الحكم |
|---|---|---|---|
| Authority | `AGENTS.md` وauthority precedence وdirect-work policy | قرئت على رأس `smsm` | موجود وحاكم |
| Product model | DSH تشغيل، WLT مال، Surface→DSH | `governance/product/platform-model.yaml` | موجود لكن القبول النهائي ما زال يحتاج Same-SHA evidence |
| Journey package | 107 ملفات مستقلة وحزمة سطحية جديدة | commits `e814b2e`, `54fdc916`, `2f34e305` | موجود كخطة، وليس تنفيذًا |
| OpenAPI generation | materialization نجح في CI الأخير المشاهد | run 30844831824 | موجود جزئيًا |
| Governance gates | governance schema/agent/authority/registry/SDLC نجحت | run 30844831824 | PASS محدود |
| Architecture snapshots | نجحت على SHA `54fdc916` | GitHub Actions | PASS محدود |
| CodeQL | كان قيد التنفيذ/نجح سابقًا على رؤوس قريبة | يحتاج إعادة إثبات على الرأس النهائي | NEEDS_EVIDENCE |

## الناقص المثبت

| gap_id | النقص | الأثر | التصحيح المطلوب |
|---|---|---|---|
| FND-001 | ملفات الرحلات الحالية لا تحتوي بعد جردًا فعليًا للموجود/الناقص/الخاطئ لكل طبقة | لا يمكن استخدامها كملف تنفيذ مستقل | توسيع `J001..J107` وفق عقد Dossier الجديد |
| FND-002 | لا توجد مصفوفة مكتملة تربط كل route/screen/control/state برحلة وشريحة | احتمال أزرار بلا أثر وأسـطح غير مغطاة | توليد ledger فعلي وفشل gate عند أي عنصر غير مصنف |
| FND-003 | CI الحالي أحمر | لا يمكن بدء كتابة الرحلات بأمان | إغلاق الأسباب أدناه وإعادة التشغيل على SHA واحد |
| FND-004 | نتائج التجريب اليدوي غير موجودة لكل رحلة وسطح | لا يوجد دليل UX/Runtime | تنفيذ Runbooks وتخزين الأدلة المرتبطة بالSHA |
| FND-005 | لا يوجد إثبات Restore/rollback/runtime complete للمنصة كلها | خطر إغلاق كاذب | تمارين recovery وsame-SHA runtime evidence |

## الخاطئ أو المتعارض المثبت

### FND-D01 — Compiler API للحراس — **مغلق بدليل**

- السبب الجذري الحقيقي أوسع من التشخيص الأصلي: حزمة `typescript@7` لا تُصدِّر Compiler API من JavaScript إطلاقًا (`createProgram`/`createSourceFile`/`SyntaxKind`/`ScriptTarget` كلها `undefined`)، ولم يكن هناك مالك واحد للـAPI فنسخ كل حارس تطبيعه الخاص.
- المعالجة: `tools/guards/lib/typescript-compiler.mjs` هو المستورد الوحيد لحزمة مترجم، يؤكد وجود الواجهة عند التحميل، ويملك `scriptKindFor` الذي كان مكررًا ثلاث مرات.
- الدليل: ستة حراس PASS، و12/12 اختبار، واختبار انحدار يفشل إذا استورد أي حارس حزمة مترجم مباشرة (مسجَّل في `ci-policy.yml`).

### FND-D02 — Immutable diff residue — **مغلق بدليل**

- `tools/trash/` لم يعد موجودًا.
- `git diff --check` نظيف مقابل merge-base على الرأس الحالي.

### FND-D03 — Migration verification مشترك — **مغلق بدليل**

السبب الجذري لم يكن runner ولا legacy-ledger، بل commit تنظيف واحد غير ذرّي (`f085bf81e`) حذف
`dsh-972` و`wlt-905` وترك مداخل المانيفست ACTIVE. أُعيدت المهاجرتان بالبايت المطابق لـsha256 المثبت.

الدليل على قاعدة بيانات جديدة بعد `runtime:full:reset`:

- `dsh_runtime`: 166 جدولًا؛ `dsh_captain_financial_eligibility` موجود بأعمدة `wlt_decision_id` و`wlt_reason_code` و`wlt_policy_version` و`evaluated_at`؛ والـtrigger والدالتان من dsh-972 موجودة.
- **سيادة مالية مثبتة**: أعمدة `wallet_id` و`wallet_status` و`available_balance_minor_units` و`currency` **غائبة** من DSH كما يقصد dsh-972.
- `wlt_runtime`: 53 جدولًا؛ جدولا `wlt_dispatch_financial_eligibility_{policies,decisions}` موجودان.
- `dsh_platform_dispatch_balance_policy` **محذوف** — ما يثبت أن إزالة القارئ الميت كانت صحيحة.

### FND-D04 — Runtime proof — **مغلق جزئيًا**

- **مثبت**: الحاويات كلها ترتفع سليمة (identity/workforce/dsh/wlt/minio/mailpit/wiremock)، والمهاجرات تُطبَّق، وتزويد الكوادر المحلي ينجح، وsmoke ينفّذ تدفقات DSH حقيقية بقراءة راجعة فعلية (حَجْب متجر ← عام 404 ← إظهار ← عام 200).
- **غير مثبت**: القراءة الراجعة المصادَق عليها لأهلية DSH↔WLT المالية. المشغّل المحلي لا يملك `dsh.dispatch_financial_eligibility.read/manage` (يرد 403 وهو سلوك fail-closed صحيح)، وكوادر Workforce تسجّل الدخول بـOTP لا بكلمة مرور. مانع بيئة/بذور لا عيب كود.
- **فشل قائم غير متعلق بهذه الجولة**: `dsh-catalog-transition-*` في smoke يتوقع خاصية `proposal` لا يجدها. الملفان (`catalog_proposal_occ_handlers.go` و`diagnose-dsh-smoke-auth-boundary.ps1`) لم تمسّهما هذه الجولة.

### FND-D06 — مسارات سيادية بلا إنفاذ صلاحيات تُرجِع 200 فارغة — **مفتوح (P0)**

اكتُشف أثناء تشغيل Runtime لا بقراءة الكود.

`withPermission` هو ما يوثّق المتصل **ويضع الـactor في سياق الطلب**. المعالجات التي تبدأ بـ
`ActorFromContext` (بحث سياق صامت لا يكتب استجابة) تعود مبكرًا دون كتابة أي شيء عند غياب الـactor،
فينتج **HTTP 200 بجسم فارغ** لأي متصل، موثَّق أو لا — نجاح كاذب وقدرة معطّلة.

- **مُصلَح في هذه الجولة**: ثمانية مسارات سياسة تشغيلية سيادية (zones وsla-rules وcapacity وserviceability) أُعيد لها `withPermission` بثوابت الصلاحيات الموثّقة في `platformpolicies_routes.go`. الدليل: zones بتوكيد → `200 {"zones":[]}`؛ بلا توكيد → `401 UNAUTHENTICATED` (كان 200 فارغًا في الحالتين).
- **باقٍ مفتوحًا**: مسح ثابت وجد نحو 36 مسارًا بنفس النمط، وتأكّد ثلاثة من أربعة عيّنات تجريبيًا:
  `GET /dsh/operator/support/incidents`، `GET /dsh/operator/platform/operational-policy/audit`،
  `GET /dsh/operator/dispatch/heatmap` — كلها 200 بجسم فارغ للموثَّق وغير الموثَّق.
  المجموعة تشمل مسارات مالية: `refunds/{id}/approve|reject` و`me/finance/payout-requests` و`payout-destination`.
  `GET /dsh/operator/catalog/domains` سليم (401/200) أي أن المسح الثابت يعطي إيجابيات كاذبة ويجب التحقق من كل مسار تجريبيًا.
- **المطلوب**: لكل مسار، تحديد الصلاحية الصحيحة من Product Truth لا بالتخمين، ثم حارس انحدار يمنع تسجيل معالج يعتمد `ActorFromContext` بلا غلاف صلاحيات.

### FND-D05 — وثائق الرحلات المختصرة

النسخة الأولى من `J001..J107` تسجل النتيجة والشرائح والتجريب في نحو 21 سطرًا، لكنها لا تفصل كل Surface وتحكم وحالة ولا الحالة الحالية. هذا نقص تصميمي في الحزمة ويعالج الآن، وليس دليل تنفيذ.

## الإضافات المطلوبة

1. Journey dossier عميق داخل كل ملف.
2. ملفات الرؤية النهائية للأسطح الخمسة.
3. completeness guard لملفات الرحلات.
4. coverage ledger مولد من repository inventory.
5. manual acceptance records per journey/surface.
6. same-SHA evidence index.
7. negative guards لمصادر الحقيقة الموازية والمسارات المحذوفة.

## ترتيب إغلاق Foundation

```text
FND-01 Fix no-broken-imports loader + self-test
→ FND-02 Remove/fix immutable-diff residues
→ FND-03 Resolve shared migration-runner failure
→ FND-04 Re-run migrations for all services
→ FND-05 Runtime bootstrap + catalog + DSH/WLT readbacks
→ FND-06 Expand J001..J107 dossiers and activate completeness gate
→ FND-07 Generate route/control/state coverage ledger
→ FND-08 Run static/security/workflow gates
→ FND-09 Same-SHA verification
```

## معايير التحقق

- `git diff --check` PASS.
- `guard:no-broken-imports` parses all code and reports violations instead of crashing.
- fresh/upgrade/replay/checksum/drift/data-preservation migration tests PASS لكل خدمة.
- full runtime profiles healthy/readiness PASS.
- catalog nonzero/readable/media reachable.
- DSH↔WLT facade and financial readback PASS.
- 107 journey documents pass completeness gate.
- zero unclassified routes/screens/controls/states.
- Contextual CI aggregate PASS على SHA واحد.

## قرار Foundation

`FIX_REQUIRED`. يسمح بالتشخيص والتوثيق والإصلاحات الحاكمة فقط. لا يسمح بإعلان أي رحلة `CLOSED_WITH_EVIDENCE` قبل إغلاق هذا الملف.
