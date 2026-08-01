# الخطة المرجعية الملزمة لإغلاق DSH وWLT وجميع الأسطح

> **حالة الوثيقة:** خطة تنفيذ مرجعية جديدة مبنية على أدلة فرع `ala` الحالية، وتُلغي صلاحية خطة `14_FULL_SURFACE_CLOSURE_PLAN.md` كمرجع إغلاق نهائي. تبقى الخطة السابقة مادة تاريخية/مسودة فقط إلى أن تُحذف أو تُؤرشف في Commit مستقل.
>
> **حالة التنفيذ الفعلية:** `NOT_CLOSED`.
>
> **قاعدة صارمة:** اكتمال هذه الوثيقة لا يعني اكتمال المنصة. لا يُعلن الإغلاق إلا عندما تنجح جميع البوابات على SHA واحد نهائي، وتُرفق أدلة قابلة لإعادة التشغيل من ذلك الـSHA نفسه.

---

## 0. هوية المرجع التنفيذي

```yaml
repository: bthwani2-boop/bthwani-suite-next
work_branch: ala
pinned_head_at_diagnosis: 62deda65446d4582bea5cecea4f68c7168410eb7
base_branch: master
pull_request: 199
pull_request_state_at_diagnosis: draft
execution_mode: remote_first
force_push: forbidden
merge: forbidden_without_explicit_authorization
production_changes: forbidden
historical_evidence_as_current_truth: forbidden
closure_claim_without_same_sha_evidence: forbidden
current_closure_state: NOT_CLOSED
```

يُعاد تثبيت `ala` من GitHub Remote:

1. قبل بدء أي دفعة كتابة.
2. قبل كل Commit.
3. بعد كل Push.
4. قبل تشغيل بوابة الإغلاق.
5. قبل كتابة SHA داخل أي سجل دليل.
6. قبل إعلان إغلاق أي رحلة أو مرحلة.

إذا تحرك الفرع بعد التثبيت، يُوقف الإعلان فقط، ثم يُعاد التشخيص والمزامنة بأمان دون `force push` أو الكتابة فوق عمل أحدث.

---

# 1. الحقيقة المعمارية المستهدفة

## 1.1 نموذج المنصة

بثواني منصة تشغيل وتجارة وتسليم ومال متعددة الأسطح، وليست نسخة SaaS مستقلة لكل شريك، وليست مجموعة Tenants يملك كل واحد منها نسخة أو حقيقة تشغيلية منفصلة.

الحقيقة المستهدفة:

```text
DSH = الحقيقة التشغيلية الحاكمة للتجارة والطلبات والتنفيذ والتسليم والشركاء والمتاجر والكتالوج.
WLT = الحقيقة المالية الحصرية للدفع والدفتر والمحافظ وCOD والاسترداد والعمولات والتسويات والصرف والمصالحة.
Frontend Surfaces = مستهلكات وعارضات وأدوات إدخال؛ لا تملك قرارًا تشغيليًا أو ماليًا حاكمًا.
DSH API = الواجهة التشغيلية الوحيدة التي تتعامل معها أسطح DSH، بما في ذلك القراءة/الطلب المالي المطلوب للرحلة.
WLT API = واجهة داخلية مالية محكومة تُستهلك من DSH والخدمات المصرح لها فقط، ولا تُستهلك مباشرة من تطبيقات DSH.
```

## 1.2 إزالة SaaS وTenant دون إتلاف مفاهيم صحيحة

يجب تصنيف كل ظهور للكلمات والمفاهيم التالية قبل حذفه:

```text
saas
SaaS
tenant
tenancy
multi-tenant
tenant_id
tenantId
subscription
plan
billing
operator_context
organization
workspace
```

التصنيف الإلزامي لكل نتيجة:

```yaml
PARTNER_SAAS_RESIDUE: يحذف أو يعاد تصميمه.
TENANT_ISOLATION_RESIDUE: يحذف أو يستبدل بحدود ملكية وصلاحية صحيحة.
CUSTOMER_COMMERCIAL_SUBSCRIPTION: لا يحذف تلقائيًا؛ يُراجع كمنتج تجاري للعملاء داخل WLT.
PARTNER_COMMERCIAL_AGREEMENT: يبقى عقدًا تجاريًا إن كان مطلوبًا، ولا يتحول إلى Tenant architecture.
INTERNAL_OPERATOR_SCOPE: قد يبقى فقط إذا كان نطاق تشغيل/تدقيق داخليًا مثبتًا، وليس Tenant مقنعًا.
GENERIC_LIBRARY_TERM: يُراجع ولا يُحذف إذا كان جزءًا تقنيًا غير دلالي ولا يسبب حقيقة موازية.
HISTORICAL_EVIDENCE: يؤرشف ولا يُعامل كحقيقة حالية.
```

لا يجوز حذف `subscription` بالجملة؛ الفرق إلزامي بين اشتراك عميل تجاري مشروع وبين Partner SaaS أو Tenant billing غير المرغوب.

## 1.3 حدود ملكية الحقيقة

### DSH يملك حصريًا

- الشريك، المتجر، حالة التشغيل، الملكية التشغيلية، مناطق الخدمة والتغطية.
- الكتالوج المركزي، Assortment، التوفر، المخزون التشغيلي، الأسعار المعروضة قبل التثبيت.
- السلة، Checkout Intent التشغيلي، الطلب، عناصره، حالاته، أسباب الانتقال، النسخة السعرية المثبتة.
- قبول/رفض/تجهيز/استلام/تسليم/إلغاء/عودة/إنقاذ الطلب.
- التوزيع والتكليف والسعة والتوفر والتسليم الذاتي والطلبات الخاصة.
- أدلة التشغيل التي تحتاجها WLT، مع مراجع مالية فقط لا حقائق مالية مكررة.
- التذاكر والحوادث والدعم والتقييم والإشعارات التشغيلية.

### WLT يملك حصريًا

- Payment sessions، authorization، capture، provider truth.
- Ledger، journals، balances، wallets، financial receipts.
- COD records، custody، collections، reconciliation.
- Refunds، provider outcomes، compensation المالية.
- Commission policies/records/adjustments.
- Settlements، payout destinations، payout requests، payout provider proof.
- Promotion funding والالتزامات المالية والمنتجات التجارية المالية الفعالة.
- كل حقل مالي حساس غير لازم تشغيليًا، بما في ذلك التفاصيل البنكية الخام.

### DSH يحتفظ فقط بمراجع مالية آمنة

```text
wlt_payment_session_id
wlt_refund_id
wlt_commission_id
wlt_settlement_id
wlt_payout_destination_id
wlt_payout_request_id
masked_account_number
masked_iban
masked_mobile_number
financial_status_projection
last_financial_sync_at
```

لا يحتفظ DSH بأرقام حسابات أو IBAN أو أرقام صرف خام، ولا يعيد بناء رصيد أو عمولة أو تسوية أو استرداد من بياناته المحلية.

### الأسطح لا تملك

- قرار الصلاحية أو النطاق.
- السعر النهائي أو إجمالي الدفع.
- قرار الدفع أو الاسترداد أو العمولة أو التسوية أو الصرف.
- حالة الطلب الحاكمة.
- قرار التوفر أو الإسناد أو المصالحة.
- أي Cache محلي يُعامل كمصدر حقيقة دائم.

---

# 2. نطاق الإغلاق الكامل

## 2.1 النطاق المباشر

```text
services/dsh/backend
services/dsh/contracts
services/dsh/database
services/dsh/frontend/shared
services/dsh/frontend/app-client
services/dsh/frontend/app-partner
services/dsh/frontend/app-captain
services/dsh/frontend/app-field
services/dsh/frontend/control-panel
services/wlt/backend
services/wlt/contracts
services/wlt/database
services/wlt/frontend/shared/dsh
apps/app-client/runtime
apps/app-partner/runtime
apps/app-captain/runtime
apps/app-field/runtime
apps/control-panel/runtime
contracts/master.openapi.yaml
contracts/openapi/index.yaml
العملاء المولدون
shared/data-runtime
shared/media-runtime
shared/app-shell
shared/control-panel
CI والحوكمة والحراس اللازمة لإثبات هذا النطاق
```

## 2.2 الاعتماديات الحدودية المشمولة عند وجود اتصال مثبت

```text
core/identity
core/workforce
core/media أو shared/media-runtime
core/providers
core/platform-control
notifications
infra/docker
runtime scripts
observability
security policy
```

لا يُعاد بناء هذه الخدمات بالكامل إلا إذا ثبت أنها تمنع رحلة DSH/WLT، لكن كل عقد أو صلاحية أو حدث أو حقل تعتمد عليه الرحلة يدخل النطاق الكامل للرحلة.

## 2.3 الأسطح المؤجلة أو الهيكلية

`apps/webapp` و`apps/website` وأي Shell فارغ يجب تصنيفه صراحةً إلى واحد من:

```yaml
ACTIVE_SURFACE: يجب ربطه واختباره.
FUTURE_DECLARED_SURFACE: يبقى Shell موثقًا ولا يدخل ادعاء الإغلاق التشغيلي.
DEAD_SCAFFOLD: يحذف.
DUPLICATE_SURFACE: يدمج أو يحذف.
```

وجود `.gitkeep` وحده لا يثبت سطحًا عاملًا ولا يُعد فجوة إلا إذا كان السطح معلنًا كمنتج حالي.

---

# 3. التشخيص المثبت على SHA المرجعي

## 3.1 النتيجة العامة

تشغيل `BThwani Contextual CI` على SHA:

```text
62deda65446d4582bea5cecea4f68c7168410eb7
```

انتهى بالفشل. لذلك `FOUNDATION-00` غير مغلق، ولا يمكن اعتبار أي سجل سابق دليل إغلاق حالي.

## 3.2 الفجوات الحرجة المثبتة

| ID | الشدة | الفجوة المثبتة | السبب الجذري | الأثر |
|---|---:|---|---|---|
| DIAG-001 | P0 | Guard Registry يفشل | وجود `codeql.yml` و`sonarqube.yml` دون تطابق مع جرد Workflows الحاكم | تتوقف بقية فحوص الحوكمة وتُحجب عيوب لاحقة |
| DIAG-002 | P0 | WLT upgrade migrations تفشل | `wlt-115` يحذف `wlt_payout_outbox` ثم `wlt-902` ينشئ Trigger يكتب فيه ويعلق عليه | قاعدة حالية لا يمكن ترقيتها؛ Runtime الكامل يفشل |
| DIAG-003 | P0 | DSH backend tests تفشل | اختبار `partnerwltoutbox` ما زال يكتب `bank_account_number` وحقولًا خامًا حذفتها مهاجرة DSH | اختبار/كود متقادم مع نموذج الملكية المالية الجديد |
| DIAG-004 | P0 | Runtime proof يفشل | `runtime:up` يتوقف عند مهاجرة WLT المتناقضة | لا يوجد إثبات تشغيل فعلي للمنصة على SHA الحالي |
| DIAG-005 | P1 | Immutable diff يفشل | مسافات زائدة، CRLF/line-ending drift، وأسطر فارغة إضافية في ملفات Go/سياسات | Node graph وبقية التحقق العميق لا يبدأان |
| DIAG-006 | P1 | Static diagnostics تفشل | اعتماديات غير مستخدمة في تطبيقات الجوال والجذر وDSH، وتصنيف peer dependency غير منضبط | ضجيج، حجم تثبيت زائد، واحتمال ملكية اعتماد خاطئة |
| DIAG-007 | P1 | 115 تحذير Logic Coverage | شاشات وصفحات كثيرة بلا Controller/Adapter/Data Hook ظاهر | لا يمكن إثبات أن كل سطح حي ومربوط بدل كونه Mock/Static/Dead |
| DIAG-008 | P1 | أدلة Diagnostics متقادمة داخل المستودع | `.diagnostics` مبنية على SHA أقدم وموسومة `DISCOVERY_ONLY` | خطر استخدام اكتشاف تاريخي كحقيقة حالية |
| DIAG-009 | P1 | Journey Registry غير مكتمل | لا توجد مصفوفة قابلة للتدقيق تربط الرحلة بالعقد والبيانات والكود والأسطح والاختبارات والدليل | لا يمكن إثبات تغطية كل الرحلات أو كشف الأيتام |
| DIAG-010 | P1 | خطة الإغلاق السابقة غير مثبتة | `pinned_head_at_planning` و`base_sha_at_planning` كانا فارغين، والخطة سبقت نتائج CI الحالية | لا تصلح كمرجع إغلاق نهائي |
| DIAG-011 | P1 | PR #199 واسع وغير مراجع | نحو 292 ملفًا و38 Commit وحالة Draft بلا موافقات | صعوبة العزل والمراجعة والرجوع وتحديد سبب الفشل |
| DIAG-012 | P1 | التباس مصطلحي معماري | بقايا SaaS/tenant مع وجود Subscription وOperator Context لأغراض مختلفة | حذف خاطئ أو إبقاء Tenant مقنع أو مصادر حقيقة متوازية |
| DIAG-013 | P1 | بوابات كثيرة لم تُنفذ | فشل الحراس وImmutable diff أدى إلى `skipped` لعشرات الخطوات | العيوب الحالية ليست بالضرورة القائمة النهائية؛ توجد عيوب كامنة محتملة |
| DIAG-014 | P2 | تحذيرات تنظيمية | 16 أصل صورة كبير مكرر وتحذير تسمية حارس | تضخم مستودع وضجيج تدريجي، لكنه ليس مانع P0 حاليًا |

## 3.3 تفاصيل السبب الجذري لـWLT

المسار الحالي غير متسق:

```text
wlt-098  ينشئ/يستخدم payout outbox
...
wlt-115  يستبدل trigger بنسخة audit-only ثم يحذف wlt_payout_outbox
...
wlt-902  يعيد إنشاء trigger يكتب في wlt_payout_outbox ويضع COMMENT ON TABLE عليها
```

النتيجة في ترقية قاعدة سابقة:

```text
ERROR: relation "wlt_payout_outbox" does not exist
```

المعالجة المفضلة قبل الدمج، لأن `wlt-115` تغيير جديد في هذا الفرع:

1. عدم إبقاء حذف الجدول في رقم يسبق `wlt-902`.
2. استبدال `wlt-115` بمهاجرة جديدة بعد `wlt-902`، مثل `wlt-903_drop_unconsumed_payout_outbox.sql`.
3. يجب أن تستبدل المهاجرة الجديدة Trigger بنسخة audit-only أولًا، ثم تحذف الجدول، ثم تصحح التعليقات والدوال والاختبارات.
4. تحديث `manifest.json` وChecksums واختبارات fresh/install/upgrade/replay.
5. إذا ثبت أن `wlt-115` طُبقت في أي بيئة مشتركة، يُمنع تغيير تاريخها ويُصمم مسار توافق Forward-only منفصل بعد جرد البيئات. لا يُفترض ذلك دون دليل.

## 3.4 تفاصيل السبب الجذري لـDSH/WLT ownership

المهاجرات أزالت الحقول البنكية الخام من DSH، لكن اختبار:

```text
services/dsh/backend/internal/partnerwltoutbox/outbox_db_test.go
```

ما زال ينفذ تحديثًا لـ:

```text
bank_account_number
bank_iban
payout_mobile_number
```

التصحيح ليس إعادة الأعمدة. التصحيح هو:

- حذف استعمال الحقول الخام من الاختبار وكل fixtures والكود والعقود.
- إبقاء `payout_destination_id` والحقول المقنعة فقط في DSH.
- إثبات أن إنشاء/تعديل وجهة الصرف يتم داخل WLT عبر واجهة DSH المحكومة.
- إضافة اختبار يمنع رجوع الحقول الخام إلى Schema أو OpenAPI أو الواجهات.

## 3.5 حدود التشخيص الحالي

هذه النتائج مؤكدة، لكنها ليست نهاية التشخيص؛ عدة مراحل في CI لم تعمل بسبب Fail-fast. لذلك تُنفذ الخطة بطريقة **كشف تدريجي للعيوب الكامنة**:

```text
إزالة أول مانع
→ إعادة تشغيل البوابة نفسها
→ تسجيل كل فشل جديد
→ إصلاحه
→ إعادة التشغيل
→ عدم الانتقال حتى يصبح نطاق المرحلة أخضر
```

لا يجوز تحويل `skipped` إلى `PASS`، ولا اعتبار نجاح خطوة سابقة دليلًا على نجاح الخطوات التي لم تعمل.

---

# 4. نموذج الأسباب الجذرية

الفجوات الحالية ليست أخطاء منفصلة؛ ترجع إلى ستة أسباب نظامية:

1. **غياب مرجع معماري واحد قابل للاختبار:** توجد وثائق، لكن بعض الحراس والسجلات والخطط لا تتزامن معها.
2. **تغيير الملكية دون إغلاق المستهلكين:** حُذفت حقول/جداول دون تحديث كل الاختبارات والمهاجرات اللاحقة والمستهلكين.
3. **أدلة غير مرتبطة بـSHA:** اكتشافات قديمة بقيت داخل المستودع وتبدو كأنها حقيقة حالية.
4. **PR واسع يخفي الترتيب السببي:** إصلاحات متباعدة دخلت معًا، فصار الفشل يظهر بعيدًا عن التغيير المسبب.
5. **بوابات Fail-fast دون Ledger مركزي:** الفشل المبكر يحجب قائمة العيوب التالية، ولا توجد دورة إلزامية لتحديث الخطة بعد كل كشف.
6. **عدم وجود Traceability كاملة:** لا يوجد ربط آلي شامل بين الرحلة والعقد والمهاجرة والـHandler والسطح والاختبار والدليل.

معالجة هذه الأسباب جزء من الإغلاق، وليست أعمال تجميلية.

---

# 5. قواعد التنفيذ الملزمة

## 5.1 الحلقة الوحيدة المسموحة

```text
PIN
→ DIAGNOSE
→ DEFINE ROOT CAUSE
→ DEFINE OWNER OF TRUTH
→ FIX
→ FORMAT
→ VERIFY TARGETED
→ VERIFY DEPENDENCIES
→ COMMIT ATOMICALLY
→ PUSH
→ RE-PIN
→ RECORD SAME-SHA EVIDENCE
→ CONTINUE
```

## 5.2 محظورات

- لا Force Push.
- لا تعديل إنتاج.
- لا Merge دون تصريح صريح.
- لا إعادة أعمدة أو APIs قديمة لمجرد جعل اختبار قديم ينجح.
- لا إضافة Allowlist لإخفاء فشل غير مفهوم.
- لا تعطيل Guard أو Test لأن إصلاحه صعب.
- لا كتابة Mock كدليل Runtime.
- لا اعتماد على Screenshot أو تقرير يدوي بدل اختبار قابل للإعادة.
- لا جمع إصلاحات غير مترابطة في Commit واحد.
- لا إعلان `100%` إذا بقي `warning` غير مصنف أو `skipped` أو `not run` داخل النطاق.
- لا استدعاء WLT مباشرة من تطبيقات DSH.
- لا تخزين حقيقة مالية في DSH أو الواجهات.

## 5.3 استراتيجية Commits وPush

كل Commit يجب أن يغلق سببًا جذريًا واحدًا أو شريحة رأسية واحدة، ويُدفع مباشرة بعد نجاح فحوصه المستهدفة. أمثلة:

```text
fix(ci): reconcile workflow registry
fix(wlt-db): restore upgrade-safe payout outbox ordering
fix(dsh-test): remove raw payout fields from reconciliation fixture
chore(repo): normalize immutable diff
chore(deps): remove or re-home unused runtime dependencies
feat(governance): generate journey traceability registry
```

إذا تحرك `ala` بعد أي Push، يُعاد PIN قبل الكتابة التالية.

---

# 6. مراحل الإغلاق وترتيبها الإلزامي

لا تبدأ مرحلة لاحقة قبل إغلاق بوابة المرحلة السابقة، إلا إذا كان العمل قراءة فقط ولا يغير الكود.

## المرحلة A — تثبيت الأساس وكشف كل الموانع

### A-00 — تثبيت المرجع وإبطال الأدلة القديمة

المهام:

1. تثبيت SHA الحالي وSHA الأساس وPR في سجل تنفيذ جديد.
2. وسم الخطة السابقة `SUPERSEDED_DRAFT` أو نقلها إلى تاريخ الحوكمة في Commit منفصل.
3. إزالة `.diagnostics` المؤقتة من التتبع أو نقل الأدلة الدائمة فقط إلى مسار Evidence مربوط بـSHA.
4. منع أي مولد تشخيص من تعديل المصدر داخل CI.
5. إنشاء Ledger حي للفجوات المكتشفة، بحالات: `OPEN`, `IN_PROGRESS`, `BLOCKED_EXTERNAL`, `VERIFIED`, `CLOSED`.

بوابة الإغلاق:

```yaml
pinned_sha_recorded: PASS
old_plan_superseded: PASS
historical_diagnostics_not_current_truth: PASS
evidence_policy: PASS
live_gap_ledger: PASS
```

### A-01 — إصلاح Guard Registry

المهام:

1. تصنيف `codeql.yml` و`sonarqube.yml` إلى Required/Manual/Removed.
2. إذا كان Workflow صالحًا، تسجيله في `governance/github/workflow-registry.json` مع الغرض والمالك والمشغلات والصلاحيات.
3. إذا كان SonarQube غير مهيأ أو لا يملك مصدرًا موثوقًا، يمنع بقاؤه كحارس وهمي؛ إما يُستكمل أو يُحذف.
4. تشغيل `guard:guard-registry` حتى PASS.
5. إعادة تشغيل Policy Governance كاملًا؛ كل خطوة كانت `skipped` يجب أن تعمل أو تُصنف N/A بسبب واضح.

بوابة الإغلاق:

```yaml
guard_registry: PASS
workflow_inventory: PASS
workflow_permissions: PASS
workflow_syntax: PASS
pinned_actions: PASS
policy_job_no_skips_due_to_prior_failure: PASS
```

### A-02 — إصلاح Immutable Source

المهام:

1. تشغيل Formatter القياسي لكل Go/TS/JSON/MD/SQL متأثر.
2. توحيد LF وفق `.gitattributes` وعدم خلط CRLF داخل ملفات Go.
3. إزالة trailing whitespace والأسطر الفارغة النهائية غير المسموحة.
4. تشغيل immutable diff محليًا وفي CI.
5. عدم السماح لأي Script بتعديل الملفات أثناء التحقق.

بوابة الإغلاق:

```yaml
immutable_diff: PASS
formatting: PASS
ci_source_mutation: NONE
node_graph_unblocked: PASS
```

### A-03 — إصلاح WLT Migration Graph

المهام:

1. تنفيذ معالجة `wlt-115`/`wlt-902` الموضحة في التشخيص.
2. فحص كل Rename/Drop/Create/Trigger/Function في WLT بحثًا عن مراجع لاحقة.
3. اختبار السيناريوهات:
   - Fresh database.
   - Upgrade من آخر SHA في `master`.
   - Upgrade من قاعدة جزئية قبل كل Migration متأثرة.
   - Re-run آمن.
   - Roll-forward بعد فشل منتصف الترقية.
4. اختبار Manifest وترتيب الملفات وChecksums.
5. تشغيل اختبارات WLT وبنائه بعد نجاح المهاجرات.

بوابة الإغلاق:

```yaml
wlt_fresh_migrations: PASS
wlt_master_to_head_upgrade: PASS
wlt_replay: PASS
wlt_manifest: PASS
wlt_schema_contracts: PASS
wlt_go_test: PASS
wlt_go_build: PASS
```

### A-04 — إصلاح DSH Backend Baseline

المهام:

1. إزالة الحقول المالية الخام من اختبار `partnerwltoutbox` وكل المستهلكين.
2. البحث الكامل عن الحقول المحذوفة في Go/SQL/OpenAPI/TS/fixtures/docs.
3. إضافة Guard أو Schema test يمنع عودتها.
4. تشغيل DSH migrations ثم `go test ./...` ثم build.
5. معالجة كل فشل جديد يظهر بعد الاختبار الحالي، دون Allowlist.

بوابة الإغلاق:

```yaml
dsh_fresh_migrations: PASS
dsh_master_to_head_upgrade: PASS
dsh_raw_financial_fields_absent: PASS
dsh_go_test: PASS
dsh_go_build: PASS
```

### A-05 — إغلاق Static Diagnostics

المهام:

1. لكل اعتماد غير مستخدم: حذفه، أو نقله إلى مالكه الصحيح، أو إثبات استعماله الفعلي.
2. معالجة تكرار `@react-native-async-storage/async-storage` بين الجذر وتطبيقات الجوال.
3. حسم ملكية `@react-native-community/netinfo` بين الجذر و`shared/data-runtime`.
4. حذف `@tanstack/react-query` من `services/dsh` إذا لم يكن مستخدمًا، أو توصيل الاستعمال المعلن.
5. تنظيف `knip.json` من ignore entries القديمة بعد إثبات عدم الحاجة.
6. إبقاء strict dead-code scan منفصلًا، لكن يمنع إنشاء Closure claim مع نتائج غير مصنفة.

بوابة الإغلاق:

```yaml
knip_unused_dependencies: 0
knip_unresolved_peer_ownership: 0
new_dead_code: 0
configuration_hints_reviewed: PASS
static_diagnostics: PASS
```

### A-06 — إثبات Runtime الكامل

بعد إغلاق A-01 إلى A-05:

1. تشغيل runtime profile الكامل.
2. التحقق من Health/Readiness لكل خدمة.
3. تشغيل Smoke journeys لا مجرد فتح Containers.
4. حفظ `runtime-proof.json` على SHA نفسه.
5. إيقاف Runtime وتنظيف الموارد دون ترك حالة تؤثر في إعادة التشغيل.

بوابة الإغلاق:

```yaml
runtime_up: PASS
all_health: PASS
all_readiness: PASS
smoke_journeys: PASS
runtime_down: PASS
same_sha_runtime_evidence: PASS
```

---

## المرحلة B — تثبيت الحقيقة المعمارية والمصطلحات

### B-00 — معجم حاكم واحد

إنشاء/تصحيح معجم يحدد:

- Partner، Store، Client، Captain، Field، Operator، Actor.
- Operator Context ودوره الحقيقي إن بقي.
- الفرق بين Customer Subscription وPartner SaaS.
- Financial Reference مقابل Financial Truth.
- Service ownership وSurface ownership.

يُربط المعجم بحارس يمنع المصطلحات المحظورة في المسارات النشطة، مع Allowlist تاريخية محدودة ومبررة فقط.

### B-01 — جرد SaaS/Tenant كامل

يُنشأ تقرير آلي يشمل:

```text
code
contracts
SQL migrations and schema
seed data
permissions
routes
UI labels
navigation
analytics
CI
governance
documentation
fixtures/tests
```

لكل نتيجة: المالك، التصنيف، القرار، التغيير، الاختبار، SHA الإغلاق.

### B-02 — تدقيق Operator Context

لا يُحذف `operator_context_id` تلقائيًا. لكل جدول/عقد/صلاحية:

1. هل يمثل Tenant؟ إن نعم، يُزال أو يعاد تصميمه.
2. هل يمثل سياق تشغيل داخليًا مطلوبًا للتدقيق أو الفصل بين وحدات بثواني؟ إن نعم، يبقى بوصف واضح.
3. هل هو مجرد مفتاح شامل أضيف آليًا بلا سلوك؟ يُزال.
4. هل يؤدي إلى تكرار بيانات الشريك أو المتجر؟ يُصحح.

### B-03 — بوابة الحقيقة المعمارية

```yaml
partner_saas_residue: 0
unclassified_tenant_terms: 0
tenant_id_in_active_schema: 0
surface_financial_truth: 0
dsh_raw_financial_truth: 0
direct_surface_to_wlt_calls: 0
operator_context_entries_unclassified: 0
```

---

## المرحلة C — العقود والبيانات والعملاء المولدون

### C-00 — فهرس OpenAPI مركزي وحيد

`contracts/openapi/index.yaml` يجب أن يكون فهرس التجميع الوحيد، و`contracts/master.openapi.yaml` Bundle مولد/متحقق لا مصدرًا يدويًا موازيًا.

لكل خدمة:

```text
service-owned source contract
→ canonical index registration
→ deterministic bundle
→ generated client
→ consumer import
→ contract test
```

### C-01 — عقود DSH

يجب فحص كل Path/OperationId/Schema/Security/Error:

- لا Endpoint مالي يكرر ملكية WLT.
- Endpoints المالية التي تحتاجها الأسطح تكون Facade داخل DSH.
- لا حقول بنكية خام.
- كل mutation له idempotency contract.
- كل transition له preconditions وconflict errors.
- Pagination/filter/sort/time semantics موحدة.
- Actor/permission requirements صريحة.

### C-02 — عقود WLT

- داخلية ومحكومة Service-to-Service.
- لا تُولد مباشرة لتطبيقات DSH.
- تستخدم مراجع DSH الثابتة ولا تنسخ الطلب كاملًا بلا حاجة.
- كل mutation مالية لها receipt وidempotency وaudit correlation.
- كل provider state غير مؤكد يدخل reconciliation بدل التخمين.

### C-03 — Generated Clients

- توليد حتمي من العقود الحاكمة.
- لا تعديل يدوي.
- Provenance يتضمن SHA وDigest.
- لا Client مكرر داخل Surface.
- لا Fetch يدوي يلتف على العميل المولد إلا Exception مراجع.

### C-04 — بوابة العقود

```yaml
canonical_index: PASS
parallel_openapi_truth: 0
operation_id_duplicates: 0
unowned_paths: 0
unbound_generated_clients: 0
manual_generated_edits: 0
direct_wlt_mobile_client: 0
contract_bundle_provenance: PASS
```

---

## المرحلة D — DSH Backend والقاعدة

إغلاق المجالات التالية كل منها كشريحة مستقلة:

1. Partner onboarding and integrity.
2. Store ownership and lifecycle.
3. Central catalog and assortment.
4. Pricing, availability, serviceability.
5. Cart and checkout intent.
6. Order lifecycle and state machine.
7. Partner acceptance/rejection/preparation.
8. Dispatch, capacity, assignment, rescue.
9. Pickup and proof.
10. Delivery and proof.
11. Cancellation and return-to-store.
12. Special requests.
13. Support/incidents/ratings.
14. Operational notifications/outbox.
15. DSH→WLT evidence and reconciliation projections.

لكل مجال:

```yaml
schema_owner: defined
state_machine: explicit
invalid_transitions: tested
authorization: tested
idempotency: tested
concurrency: tested
outbox_or_sync_semantics: tested
recovery: tested
openapi: bound
surface_consumers: known
observability: present
```

---

## المرحلة E — WLT Backend والقاعدة

إغلاق المجالات التالية:

1. Payment session creation and provider handoff.
2. Authorization/capture/result unknown.
3. Ledger kernel and immutable journal.
4. Wallet balance derivation.
5. COD creation/custody/collection/handover.
6. Refund lifecycle and provider reconciliation.
7. Commission policy/version/record/adjustment.
8. Settlement source/evidence/closure.
9. Payout destination/request/provider proof.
10. Financial reconciliation and single-claim rules.
11. Promotion funding.
12. Customer commercial subscription فقط إذا كان منتجًا فعليًا.
13. Financial audit and mutation receipts.

المبادئ:

- لا Update/Delete لدفتر أو Audit immutable إلا بآلية تصحيح محكومة.
- المبالغ Integer minor units فقط.
- العملة صريحة.
- Maker-checker للعمليات الحساسة.
- Provider unknown ليس Success ولا Failure نهائيًا.
- كل إعادة محاولة Idempotent.
- كل علاقة DSH/WLT تحمل correlation وstable references.

---

## المرحلة F — حد DSH↔WLT

### F-00 — الوصول

- تطبيقات DSH تتصل بـDSH فقط.
- DSH يتصل بـWLT باستخدام Service Identity قصيرة الصلاحية أو آلية موثقة.
- لا تمرير User token إلى WLT بوصفه Service authorization دون تصميم صريح.
- DSH يعيد Projection آمنة ومقنعة للأسطح.

### F-01 — الاتساق

لكل تكامل يحدد:

```text
command owner
source event/evidence
idempotency key
correlation id
retry policy
timeout
circuit behavior
unknown outcome behavior
reconciliation owner
readback path
audit record
```

### F-02 — منع الازدواجية

- لا جدول مالي موازٍ في DSH.
- لا حساب عمولة أو استرداد في Frontend.
- لا State machine مالية مكررة في DSH.
- لا طلب تشغيل كامل منسوخ في WLT إلا Snapshot مالي مثبت ومبرر.

### F-03 — اختبارات الحد

- Contract tests.
- Consumer/provider compatibility.
- Duplicate delivery.
- Out-of-order delivery.
- Timeout after commit.
- Retry after unknown result.
- Concurrent commands.
- Broken reference.
- Masked readback reconciliation.
- Permission and service-auth rejection.

---

## المرحلة G — Shared Frontend وRuntime Foundations

### G-00 — طبقات الواجهة

الهيكل المستهدف:

```text
Generated API Client
→ Service Adapter
→ Domain Controller/Query/Mutation Hook
→ Screen Model
→ Presentational Components
→ App Runtime Shell
```

الممنوع:

- Fetch مباشر من Screen.
- URL داخلي لـWLT داخل تطبيق DSH.
- Business calculation داخل Component.
- Hardcoded success data أو permanent fallback.
- نسخ Controller لكل Surface دون سبب.

### G-01 — معالجة 115 Logic Coverage Warning

لكل شاشة تحذير، يجب اختيار نتيجة واحدة موثقة:

```yaml
BOUND: مرتبطة Controller/Adapter/Hook واختبارها موجود.
INTENTIONALLY_STATIC: محتوى ثابت فعلًا، مع سبب واختبار Render.
DEFERRED_SURFACE: غير معلنة كجزء من الإغلاق الحالي.
DUPLICATE: تدمج.
DEAD: تحذف.
FALSE_POSITIVE: يُصحح الحارس لا تُضاف Allowlist عمياء.
```

لا يبقى أي تحذير غير مصنف عند الإغلاق.

### G-02 — Offline/Retry/Cache

- Cache ليس مصدر حقيقة.
- Writes تستخدم idempotency keys.
- Offline queues محددة الملكية والعمر والإبطال.
- إعادة المصادقة لا تعيد mutation تلقائيًا دون receipt.
- أخطاء الشبكة و401/403/409/422/429/5xx لها UX واختبارات واضحة.

---

## المرحلة H — إغلاق كل سطح

### H-01 — app-client

الرحلات الإلزامية:

- التسجيل/الدخول/الجلسة.
- الموقع والعنوان وقابلية الخدمة.
- اكتشاف المتاجر والتصنيفات والمنتجات.
- البحث والتصفية.
- تفاصيل المنتج والخيارات.
- السلة والتسعير.
- Checkout واختيار الدفع.
- إنشاء الطلب وتتبع حالته.
- الإلغاء والاسترداد.
- الدعم والشكوى والتقييم.
- الإشعارات.
- الحالات الفارغة/الفشل/إعادة المحاولة/انتهاء الجلسة.

### H-02 — app-partner

- تفعيل الشريك وربط المتجر.
- الملف والوثائق والمراجعة.
- ساعات العمل والتوفر.
- الكتالوج والمنتجات والمخزون/الأسعار التشغيلية.
- صندوق الطلبات وقبول/رفض/تجهيز.
- التسليم الذاتي عند تفعيله.
- الحوادث والدعم.
- القراءة المالية المقنعة عبر DSH.
- العمولات والتسويات والصرف كProjection من WLT عبر DSH.

### H-03 — app-captain

- التفعيل والجاهزية المهنية.
- التوفر والسعة.
- استقبال/قبول/رفض المهمة.
- الوصول للمتجر والاستلام والإثبات.
- الملاحة والتسليم والإثبات.
- فشل التسليم والعودة والإنقاذ.
- COD custody والـhandover كحقيقة WLT مع واجهة DSH.
- الأرباح/المستحقات كProjection آمنة.
- Offline/retry/location permission/background behavior.

### H-04 — app-field

- إنشاء/تفعيل الموظف عبر Control Panel.
- Workforce profile gate.
- نطاق المتاجر/المناطق.
- الزيارات والمهام والأدلة.
- جاهزية الشريك والمتجر.
- التحصيل أو العمولات المسموحة فقط عبر WLT/DSH.
- منع الوصول خارج النطاق.
- التعليق/الإيقاف/انتهاء التكليف.

### H-05 — control-panel

كل Page/Tab/Section يجب أن يملك:

```text
route ownership
permission
query/controller
loading/empty/error/forbidden states
mutation confirmation
optimistic behavior decision
audit correlation
pagination/filter/export policy
test
```

الأقسام الإلزامية:

- Dashboard/analytics.
- Partners/stores/onboarding/review.
- Catalog governance.
- Orders/dispatch/operations/rescue.
- Captain/field/workforce readiness.
- Support/incidents.
- Marketing/promotion funding.
- Finance read-only/actions عبر DSH facade.
- Platform policies/permissions/audit.

لا تُعتبر صفحة موجودة لمجرد أنها Render؛ يجب إثبات ربطها وملكيتها وحالاتها.

### H-06 — Surface Gate

```yaml
app_client_required_journeys: PASS
app_partner_required_journeys: PASS
app_captain_required_journeys: PASS
app_field_required_journeys: PASS
control_panel_required_journeys: PASS
unclassified_pages: 0
mock_operational_pages: 0
direct_wlt_calls: 0
surface_business_truth: 0
```

---

## المرحلة I — سجل الرحلات الرأسية

يجب إعادة بناء `governance/27_FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md` أو استبداله بسجل مولد قابل للتحقق.

كل رحلة يجب أن تحمل الحقول التالية:

```yaml
journey_id:
name:
actors:
entry_surfaces:
owner_of_truth:
preconditions:
permissions:
api_operations:
database_objects:
state_transitions:
events_and_outbox:
wlt_boundary:
generated_clients:
surface_bindings:
happy_path_tests:
negative_tests:
idempotency_tests:
concurrency_tests:
offline_retry_tests:
runtime_readback:
observability:
evidence_sha:
status:
```

الرحلات الدنيا:

1. Identity/session/activation.
2. Partner onboarding and approval.
3. Store creation/ownership/activation.
4. Catalog proposal/approval/publishing.
5. Serviceability and pricing.
6. Cart and checkout intent.
7. Payment session creation.
8. Order creation.
9. Partner decision/preparation.
10. Dispatch and captain assignment.
11. Pickup proof.
12. Delivery proof.
13. COD custody and collection.
14. Cancellation before/after payment.
15. Refund and reconciliation.
16. Commission creation/adjustment.
17. Settlement creation/closure.
18. Payout destination/request/result.
19. Support/dispute/incident.
20. Notification delivery/readback.
21. Media upload/validation/access.
22. Field readiness and scoped assignment.
23. Analytics/audit readback.
24. Failure recovery and duplicate/reordered events.

أي Path أو Handler أو جدول أو شاشة لا يرتبط برحلة أو Capability مصنفة يُعد `ORPHAN_REVIEW_REQUIRED`.

---

## المرحلة J — الأمن والصلاحيات والخصوصية

### J-00 — Authorization Matrix

لكل Operation:

- Actor type.
- Role.
- Permission.
- Resource ownership.
- Store/area/assignment scope.
- Operator scope إن كان مشروعًا.
- Service identity عند الاتصال الداخلي.
- Deny tests لكل حالة تجاوز.

### J-01 — البيانات الحساسة

- لا أسرار في Git أو Logs أو Error payloads.
- لا بيانات بنكية خام في DSH.
- PII masking.
- Media signed access.
- Audit actor/correlation.
- Token expiry/refresh/revocation.
- Rate limits للعمليات الحساسة.
- Input validation وحدود الأحجام والأنواع.

### J-02 — Supply Chain وCI

- Actions مثبتة بـSHA.
- CodeQL/SonarQube إما مهيآن ومصنفان أو محذوفان.
- Dependency audit.
- Generated provenance.
- Least-privilege workflow permissions.
- لا أسرار مطلوبة لتشغيل PR غير موثوق دون حماية.

---

## المرحلة K — المرونة والمراقبة والأداء

لكل رحلة حرجة:

```text
structured logs
correlation id
metrics
latency/error/saturation signals
business counters
trace boundaries
alert owner
retry/circuit/timeout policy
dead-letter or reconciliation path
runbook
```

اختبارات الأداء الدنيا:

- Catalog/list/search pagination.
- Cart/checkout/order create.
- Partner orders inbox.
- Dispatch assignment.
- Payment/refund/settlement/payout critical queries.
- Control Panel large tables.

لا توضع ميزانية أداء عامة فقط؛ تُحدد P95/P99 وحجم بيانات واستهلاك ذاكرة وحدود فشل لكل مسار حرج.

---

## المرحلة L — الاختبارات والإثبات

### L-00 — هرم الاختبارات

```text
Unit
Database invariant
Migration fresh/upgrade/replay
Contract lint/bundle/provenance
Generated client compile
Backend integration
Service-to-service integration
Frontend controller/component
Surface journey
Cross-surface E2E
Runtime smoke/readback
Security/permission
Concurrency/idempotency
Resilience/failure injection
Performance
```

### L-01 — قاعدة Same-SHA Evidence

حزمة الدليل لكل مرحلة:

```yaml
source_sha:
base_sha:
commands:
exit_codes:
workflow_run_ids:
artifact_digests:
database_version:
contract_digests:
generated_client_digests:
runtime_profile:
journeys_executed:
failures: []
waivers: []
external_blockers: []
```

لا يقبل الدليل إذا:

- لا يحتوي SHA.
- أُنتج قبل آخر Push.
- يعتمد على ملفات معدلة غير ملتزمة.
- يحتوي Skipped غير مبرر.
- يخفي تحذيرات غير مصنفة.
- لا يمكن إعادة تشغيله من مستودع نظيف.

---

# 7. بوابات الإغلاق النهائية

## GATE-0 — Repository Foundation

```yaml
contextual_ci: PASS
policy_governance: PASS
static_diagnostics: PASS
node_verification: PASS
backend_dsh: PASS
backend_wlt: PASS
runtime_proof: PASS
immutable_source: PASS
```

## GATE-1 — Architecture Truth

```yaml
partner_saas_residue: 0
unclassified_tenant_residue: 0
dsh_operational_truth_parallel_sources: 0
wlt_financial_truth_parallel_sources: 0
direct_surface_to_wlt_calls: 0
raw_financial_data_in_dsh: 0
```

## GATE-2 — Contracts and Data

```yaml
canonical_contract_index: PASS
contract_registry: PASS
route_declaration: PASS
handler_reference: PASS
migration_graph_dsh: PASS
migration_graph_wlt: PASS
fresh_upgrade_replay: PASS
generated_client_provenance: PASS
```

## GATE-3 — Full-stack Surfaces

```yaml
app_client: PASS
app_partner: PASS
app_captain: PASS
app_field: PASS
control_panel: PASS
all_required_pages_bound: PASS
all_required_states_tested: PASS
```

## GATE-4 — Vertical Journeys

```yaml
journey_registry_complete: PASS
required_journeys_closed: PASS
negative_paths: PASS
permissions: PASS
idempotency: PASS
concurrency: PASS
offline_retry: PASS
cross_service_reconciliation: PASS
```

## GATE-5 — Production Readiness

```yaml
security: PASS
observability: PASS
resilience: PASS
performance: PASS
backup_restore_or_recovery: PASS
rollback_or_rollforward: PASS
runbooks: PASS
same_sha_evidence_bundle: PASS
```

## قرار الإغلاق

```text
CLOSED = GATE-0 && GATE-1 && GATE-2 && GATE-3 && GATE-4 && GATE-5
```

أي قيمة من:

```text
FAIL
SKIPPED
NOT_RUN
UNKNOWN
UNCLASSIFIED
STALE_EVIDENCE
```

تعني أن الحالة النهائية تبقى `NOT_CLOSED`.

---

# 8. سجل المخاطر

| الخطر | الاحتمال | الأثر | المعالجة |
|---|---:|---:|---|
| ظهور فشل جديد بعد إزالة Fail-fast blockers | مرتفع | مرتفع | إعادة تشغيل كاملة بعد كل إصلاح وتحديث Ledger |
| حذف مفهوم Subscription صحيح أثناء إزالة SaaS | متوسط | مرتفع | تصنيف دلالي إلزامي قبل الحذف |
| تعديل مهاجرة مطبقة | متوسط | حرج | جرد applied history واستخدام forward-only عند ثبوت التطبيق |
| إبقاء WLT access مباشر في Surface مخفي | متوسط | حرج | بحث Static + network/client registry + runtime interception |
| تكرار حقائق مالية داخل DSH | متوسط | حرج | Schema/contract guards واختبارات منع |
| PR واسع يصعب مراجعته | مرتفع | مرتفع | Commits ذرية، تقارير نطاق، وPR بديل/سلسلة PRs إذا لزم دون Force Push |
| Allowlists تخفي أيتامًا | متوسط | مرتفع | كل Exception بمالك وسبب وانتهاء واختبار |
| نجاح Build دون اكتمال الرحلات | مرتفع | مرتفع | Journey registry وE2E/runtime gates إلزامية |
| أدلة قديمة تُستخدم للإغلاق | مرتفع | مرتفع | Same-SHA policy وحذف diagnostics المؤقتة من التتبع |

---

# 9. ترتيب التنفيذ الفعلي المقترح

```text
1. A-00 تثبيت الدليل وإبطال المسودة القديمة.
2. A-01 Guard Registry ثم إعادة كشف كل Policy failures.
3. A-02 Immutable diff ثم إعادة كشف Node failures.
4. A-03 WLT migration graph.
5. A-04 DSH stale financial test and backend baseline.
6. A-05 Static diagnostics/dependency ownership.
7. A-06 Full runtime proof.
8. B Architecture/SaaS/Tenant classification and closure.
9. C Contracts/OpenAPI/generated clients.
10. D DSH domains.
11. E WLT domains.
12. F DSH↔WLT boundary.
13. G Shared frontend/runtime architecture.
14. H All surfaces.
15. I Vertical journey registry and closure.
16. J Security/privacy.
17. K Observability/resilience/performance.
18. L Same-SHA evidence and final gates.
```

لا يُنفذ تنظيف الصور أو تحسينات شكلية قبل P0/P1 ما لم تكن جزءًا مباشرًا من فشل بوابة.

---

# 10. Definition of Done لكل عنصر

العنصر لا يغلق إلا إذا تحققت جميع النقاط:

1. السبب الجذري موثق، لا العرض فقط.
2. مالك الحقيقة محدد.
3. الكود/العقد/المهاجرة/السطح المتأثر محدث.
4. كل المستهلكين محدثون.
5. اختبارات إيجابية وسلبية موجودة.
6. الصلاحيات والنطاق مختبران.
7. Idempotency والتزامن مختبران عند الحاجة.
8. Migration fresh/upgrade/replay ناجحة عند وجود Schema change.
9. لا تحذير أو Skipped غير مصنف.
10. Commit ذري ودُفع إلى Remote.
11. أُعيد PIN بعد Push.
12. الدليل من SHA النهائي نفسه.
13. لا Regression في البوابات السابقة.
14. Journey Registry وGap Ledger محدثان.

---

# 11. حالة البداية بعد إنشاء هذه الخطة

```yaml
plan_document: CREATED
implementation: NOT_CLOSED
foundation_00: FAIL
policy_governance: FAIL
static_diagnostics: FAIL
node_verification: FAIL
wlt_backend_and_database: FAIL
dsh_backend_and_database: FAIL
runtime_proof: FAIL
architecture_truth_gate: NOT_RUN_ON_CLEAN_BASELINE
full_surface_gate: NOT_RUN_ON_CLEAN_BASELINE
vertical_journey_gate: NOT_RUN_ON_CLEAN_BASELINE
production_readiness_gate: NOT_RUN_ON_CLEAN_BASELINE
```

هذه الحالة متعمدة وصادقة: الخطة الجديدة تغطي نطاق الإغلاق، لكنها لا تحول الفشل الحالي إلى نجاح وثائقي. يبدأ الإغلاق الحقيقي بإصلاح `A-01` ثم يستمر وفق الترتيب الإلزامي حتى تصبح جميع البوابات خضراء على SHA نهائي واحد.
