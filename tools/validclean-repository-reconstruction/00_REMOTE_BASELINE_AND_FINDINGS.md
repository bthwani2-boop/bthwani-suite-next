# 00 — خط الأساس البعيد والنتائج الأولية

## 1. تثبيت GitHub

```yaml
repository: bthwani2-boop/bthwani-suite-next
default_branch: master
source_candidate_abdo: 98ab47dd59e5fc6f615cbe96094ec61fa0c8ffa3
source_candidate_cleaning: 731133fc0d727510cbc4e3b2896abd7f55fca7a0
merge_base: 98ab47dd59e5fc6f615cbe96094ec61fa0c8ffa3
cleaning_ahead_by: 10
chosen_source: abdo
created_branch: validclean
plan_state: PLAN_ONLY_AWAITING_OWNER_APPROVAL
```

## 2. لماذا لم يُختر cleaning؟

`cleaning` ليس مجرد تنظيف محدود. المقارنة البعيدة تثبت حذف مئات الملفات، منها مجموعات واسعة من:

- اختبارات Identity والمصادقة والتفعيل والجلسات وحدود المستأجر.
- اختبارات Workforce والجاهزية والتكليفات.
- اختبارات DSH للكتالوج والسلة والطلب والإسناد والتوصيل والعزل والـOutbox.
- اختبارات Platform Control وProviders.
- اختبارات تطبيق العميل ولوحة التحكم وRuntime والأمن.
- عقود Product Truth وسجلات السلطة والحراس والمهارات وسياسات GitHub.
- محاكيات مالية وملفات تشغيل وبنية تحتية.

كما أن `AGENTS.md` في `cleaning` ما زال يفرض الرجوع إلى:

```text
governance/authority/authority-precedence.json
governance/contracts/decision-vocabulary.json
governance/product/PRODUCT_TRUTH_POLICY.md
governance/authority/single-owner-mode.json
```

بينما المقارنة تثبت حذف هذه الملفات من `cleaning`. هذا تناقض سلطة مباشر، ويجعل مسار الحوكمة غير قابل للتنفيذ كما هو مكتوب.

القرار: نستخدم `abdo` كقاعدة خام محفوظة، ونستفيد من نوايا التنظيف الصحيحة في `cleaning` فقط بعد مراجعتها ملفًا ملفًا وإثبات بدائل الحماية.

## 3. نتائج مثبتة مباشرة على abdo

### VC-P0-001 — فهرسان رئيسيان نشطان لـOpenAPI

يوجد ملفان يعلنان الدور نفسه والحالة نفسها:

```text
/openapi.yaml
/contracts/master.openapi.yaml
```

كلاهما يحمل:

```yaml
x-bthwani-contract-state: CONTRACT_ACTIVE
x-bthwani-contract-role: MASTER_INDEX_ONLY
```

لكنهما مختلفان في الإصدار وقائمة العقود. هذه ازدواجية مصدر حقيقة عقدي مؤكدة.

المعالجة المخططة:

```text
contracts/master.openapi.yaml = الفهرس الوحيد
→ ترحيل المراجع الصحيحة
→ تحديث كل المستهلكين
→ حذف /openapi.yaml
→ حارس يمنع MASTER_INDEX_ONLY ثانٍ
```

### VC-P0-002 — رمز تفعيل شامل 000000 داخل مالك Identity

`core/identity/backend/internal/identity/repository.go` يحتوي داخل `ConsumeActivation` مسارًا خاصًا للرمز `000000` يقوم بتفعيل الممثل وإنشاء جلسة دون استهلاك تحدي تفعيل صالح.

هذه ليست بيانات اختبار خارجية؛ إنها شعبة حية داخل Repository المالك للمصادقة.

المعالجة المخططة:

```text
حذف المسار من Repository
→ اختبار Repository سلبي مباشر
→ حظر دلالي لأي رمز شامل أو Master OTP
→ إبقاء Challenge flow واحد فقط
```

### VC-P0-003 — خريطة actor type إلى surface ليست المصدر الوحيد فعليًا

`activationSurfaceByActorType` تعلن أنها المصدر الوحيد لكنها تحتوي `field` و`captain` فقط، ثم يضيف `ConsumeActivation` حالتي `client` و`partner` بشروط منفصلة.

المعالجة المخططة: خريطة مركزية واحدة تصدر وتستهلك وتختبر جميع الأنواع المسموح بها.

### VC-P0-004 — Tenant محلي ثابت داخل Bootstrap Identity

`BootstrapLocalActors` يكتب `tenant_id = 'local-dsh'` مباشرة لكل الممثلين المحليين. هذا قد يكون مقبولًا فقط ضمن Bootstrap تطوير معزول وغير قابل للوصول في الإنتاج، لكنه حاليًا يحتاج إثبات فصل صارم بين Dev وRuntime الحقيقي ومنع تحوله إلى fallback.

المعالجة المخططة:

- فصل Bootstrap dev عن Repository التشغيلي أو فرض بوابة بيئة صارمة.
- منع أي Tenant افتراضي في المسارات الحية.
- اختبار أن غياب السياق الموثوق يفشل مغلقًا.

### VC-P0-005 — سجل تقاعد WLT يغيّر تفسير الحقيقة التعاقدية

`services/wlt/contracts/retired-runtime-operations.json` يسجل عمليات يقول إنها محذوفة من العقد وRuntime، ومنها `POST /wlt/ledger/entries`.

وجود سجل آلي دائم للعمليات المحذوفة يخلق طبقة حقيقة إضافية إذا كانت الحراس أو المحللات تعتمد عليه لاستنتاج العقد الفعلي.

المعالجة المخططة: اختبار عدم وجود المسارات في العقد وRuntime مباشرة، ثم حذف السجل وأي منطق يطرح محتواه من OpenAPI.

### VC-P0-006 — عميل WLT المسمى Generated مكتوب بصورة عامة ويدوية

`services/wlt/clients/generated/wlt-api.ts` يعلن مصادر العقود يدويًا ويعرّف `paths` و`operations` يدويًا، ثم يستخدم:

```text
unknown
Record<string, unknown>
Partial<WltRequestContext>
```

في نطاق مالي حساس. كما أن أمر التوليد الحالي يمرر `services/wlt/contracts/wlt.openapi.yaml` منفردًا رغم تعدد الوحدات المفهرسة.

المعالجة المخططة:

```text
WLT modular entry
→ deterministic bundle
→ openapi-typescript من bundle واحد
→ منع التعديل اليدوي
→ CI delete/regenerate/diff
```

### VC-P1-001 — تضخم واجهة الأوامر وأسماء مستعارة متكررة

`package.json` يحتوي أمثلة متطابقة أو شبه متطابقة:

```text
foundation:gate / guard:foundation
journey:gate / guard:journey
runtime:* / docker:runtime:* / runtime:full:*
graphify / graphify:code
```

لا يعد كل Alias خطأ تلقائيًا، لكنه يحتاج مالكًا ومستهلكًا وفرقًا وظيفيًا. غير ذلك يتحول إلى ضجيج تشغيلي.

### VC-P1-002 — Master OpenAPI يفهرس وحدات الخدمة مباشرة

الفهرس المركزي يسجل عددًا كبيرًا من عقود DSH وWLT الداخلية بدل الاكتفاء بعقد دخول واحد لكل خدمة. هذا يربط Root بتفاصيل الوحدات ويضاعف احتمال الانحراف.

الهدف:

```text
contracts/master.openapi.yaml
├── core/identity/contracts/identity.openapi.yaml
├── core/workforce/contracts/workforce.openapi.yaml
├── core/platform-control/contracts/platform-control.openapi.yaml
├── core/providers/contracts/providers.openapi.yaml
├── services/dsh/contracts/dsh.openapi.yaml
└── services/wlt/contracts/wlt.openapi.yaml
```

كل عقد خدمة هو الذي يركب وحداته الداخلية ويولد Bundle واحدًا.

## 4. نتائج عالية الخطورة من المرفقات تحتاج إعادة تحقق على validclean

لا تُعامل البنود التالية كحقائق مغلقة قبل القراءة المباشرة للكود وتشغيل فحوصها:

- مسارات DSH القديمة والجديدة حية معًا وسجل `LEGACY_COMPATIBILITY`.
- قرار صلاحية يقبل Permission دقيقة أو Role fallback.
- Runtime يعيد تشغيل مرحلة كاملة لإخفاء خلل PostgreSQL readiness.
- `tools/test_logins.csv` أو ملفات مشابهة تحمل حسابات أو رموزًا ثابتة.
- الحارس المالي يكرر قوائم عمليات WLT يدويًا.
- `knip.json` يستثني مناطق واسعة تمنع اكتشاف الضجيج.
- عقود مالية تستخدم `additionalProperties: true` حيث يجب أن تكون صارمة.
- Adapters يدوية متعددة تدعي تمثيل العقود المولدة.
- Migrations بأسماء أو أرقام رحلات وعمليات Repair بعد كتابة غير صحيحة.

كل بند سيصنف بعد التحقق إلى:

```text
PROVEN_DEFECT
VALID_TRANSITION_WITH_EXPIRY
SAFE_DEV_ONLY
FALSE_POSITIVE
NEEDS_MORE_EVIDENCE
```

## 5. حدود الادعاء الحالي

هذا الملف لا يدعي أنه جرد نهائي لكل ملف في المستودع. هو خط أساس مثبت لبدء الجرد الشامل. التشخيص الكامل لكل ملف ومجلد جزء من الشريحة صفر بعد الموافقة، ويجب أن ينتج سجل قرار لكل مسار مع دليل استهلاك وملكية وحالة تقاعد.