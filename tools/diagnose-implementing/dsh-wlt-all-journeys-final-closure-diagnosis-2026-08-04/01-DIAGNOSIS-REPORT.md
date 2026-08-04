# تقرير التشخيص — إغلاق DSH/WLT وجميع الرحلات

> هذه الحزمة أداة دعم مشتقة وقابلة للحذف. تصف الرأس `f085bf81eb27ef10ea2155e19d0e77d4cb15b8e6` ولا تتجاوز العقود أو الكود الحي أو الحوكمة المركزية أو حالة الريموت اللاحقة.

## 1. القرار التنفيذي

```yaml
repository: bthwani2-boop/bthwani-suite-next
target_branch: smsm
pinned_start_sha: f085bf81eb27ef10ea2155e19d0e77d4cb15b8e6
mode: DIAGNOSIS_AND_PLAN_ONLY
diagnosis_status: DIAGNOSIS_COMPLETE
plan_status: READY_FOR_REVIEW
execution_authorization: NOT_AUTHORIZED
verdict: NO_GO
journey_execution_allowed: false
```

ثبت أن المستودع لا يملك خط أساس أخضر على الرأس نفسه. لا يجوز بدء J001 قبل إغلاق FOUNDATION-00؛ ولا يجوز اعتبار نجاح العقود المركزية أو CodeQL دليلًا على runtime أو الأسطح أو الرحلات.

## 2. ما نُفذ في هذه المرحلة

- ثُبت رأس `smsm` عند `f085bf81eb27ef10ea2155e19d0e77d4cb15b8e6` واستخدم Git Bundle رسميًا من CI للرأس نفسه.
- جُردت 3,558 ملفات متتبعة مع الحجم والأسطر والبصمة والنطاق.
- جُردت 24 مجموعة تطابق بايتي، 110 ملفات كبيرة، وصفر ملف فارغ وصفر `.gitkeep`.
- روجعت حالة CI والعقود والمهاجرات والـruntime والحراس وحزمة J001..J107.
- لم يُعدل أو يُحذف أو يُنقل أي ملف مشروع؛ جميع الإضافات محصورة في مجلد هذه الحزمة.

## 3. سلطة القرار

1. طلب المستخدم الحالي يحدد مرحلة التشخيص والخطة فقط.
2. `governance/authority/authority-precedence.json` و`AGENTS.md` يحكمان التنفيذ.
3. `tools/BThwani-unified-execution-command-final-authoritative.md` يحدد دورة التنفيذ والـsame-SHA proof.
4. `governance/operational_journey_protocol_package/smsm-dsh-wlt-journeys/00-AUTHORITY-EXECUTION-ORDER.md` يفرض FOUNDATION ثم رحلة واحدة وSL-01..SL-24.
5. `contracts/openapi/index.yaml` هو نقطة تجميع OpenAPI المركزية المثبتة.
6. manifests الخدمة هي سلطة ترتيب migrations؛ هذه الحزمة لا تستبدلها.

## 4. خط الأساس الحالي

| المجال | النتيجة على `f085bf81eb27ef10ea2155e19d0e77d4cb15b8e6` | الحكم |
| --- | --- | --- |
| Git Bundle | PASS | شجرة التشخيص مطابقة للرأس |
| Architecture Snapshot | PASS | لا يثبت التشغيل |
| Lockfile Snapshot | PASS | لا يثبت البناء الكامل |
| CodeQL | PASS | لا يثبت العقود أو runtime |
| DSH Database Contract | FAIL | migration مسجلة وملفها مفقود |
| Contextual CI | FAIL | immutable diff وmigrations وguards وruntime |
| SonarQube | SKIPPED | ليس دليل نجاح |

## 5. نقاط صحيحة يجب الحفاظ عليها

- `contracts/openapi/index.yaml` يملك المصدر المركزي؛ 6 contexts و68 ملف عقد مملوك، وصفر مصدر مركزي موازٍ وصفر duplicate operation ownership.
- generated bundles والعملاء الستة متطابقون مع مصادرهم في الفحص الحالي.
- identity وworkforce وplatform-control وproviders backend/database اجتازت فحوصها الحالية.
- Next.js في control-panel موحد على `next.config.mjs`.
- DSH package لم يعد noop ويملك أوامر build/test/lint فعلية.
- ازدواج TypeScript 7 للبناء وTypeScript 6 alias للـCompiler API مقصود؛ العيب هو عدم التزام بعض الحراس بالـalias.
- لا توجد ملفات متتبعة فارغة أو `.gitkeep` على الرأس الحالي.

## 6. الأسباب الجذرية الأعلى أولوية

1. cleanup commit حذف migrations وendpoints دون إغلاق manifests والعقود والمستهلكين في نفس الوحدة.
2. بوابات AST لا تملك loader مركزيًا يفرض نسخة Compiler API المعتمدة.
3. CI يسمح لفشل مبكر بحجب فحوص تالية، ثم يرفع artifacts غير كافية للعزو.
4. عقد mutation المالي ممثل بموافقة شاملة بدل سجل عمليات دقيق.
5. حالة FOUNDATION والرحلات لا تتجدد تلقائيًا مع SHA الحالي.
6. أدوات hygiene تخلط بين duplicate intentional وduplicate يدوي، وبين CLI دائم وdead code.

## 7. سجل النتائج

| Finding | الأولوية | النتيجة | مهمة المعالجة | الحالة |
| --- | --- | --- | --- | --- |
| FND-0001 | P0 | لا يوجد خط أساس أخضر على الرأس المثبت | TASK-0018 | OPEN |
| FND-0002 | P0 | سجل مهاجرات DSH يشير إلى ملف محذوف | TASK-0003 | OPEN |
| FND-0003 | P0 | سجل مهاجرات WLT يشير إلى ملف محذوف | TASK-0004 | OPEN |
| FND-0004 | P1 | بقايا whitespace تمنع Node graph قبل الفحص الحقيقي | TASK-0001 | OPEN |
| FND-0005 | P0 | حراس AST يستخدمون TypeScript 7 بدل alias Compiler API المعتمد | TASK-0002 | OPEN |
| FND-0006 | P0 | ثمانية عشر عقد route غير متطابق مع تسجيل DSH الفعلي | TASK-0006 | OPEN |
| FND-0007 | P0 | إثبات runtime يتوقف قبل DSH/WLT readback | TASK-0008 | OPEN |
| FND-0008 | P0 | FOUNDATION قديم وجميع الرحلات 107 مفتوحة وغير مقيمة | TASK-0016 | OPEN |
| FND-0009 | P1 | القالب الدائم يتعارض مع قاعدة تسمية tools | TASK-0010 | OPEN |
| FND-0010 | P1 | تشخيص Knip يخلط الأدوات الدائمة بمرشحات الحذف | TASK-0011 | OPEN |
| FND-0011 | P1 | تسع شاشات لم يثبت ربطها التشغيلي | TASK-0009 | OPEN |
| FND-0012 | P0 | ملف موافقة واحد يعطل حماية جميع mutations في WLT shared DSH | TASK-0007 | OPEN |
| FND-0013 | P1 | مساعدات DSH HTTP متطابقة في ملكيتين ويستهلكها WLT مباشرة | TASK-0012 | OPEN |
| FND-0014 | P2 | أربع وعشرون مجموعة تطابق بايتي غير مصنفة تشغيليًا | TASK-0013 | OPEN |
| FND-0015 | P2 | مئة وعشرة ملفات كبيرة تمثل hotspots غير مفحوصة المسؤولية | TASK-0014 | OPEN |
| FND-0016 | P2 | حزمة التشخيص السابقة قديمة وغير مطابقة للقالب الدائم | TASK-0017 | OPEN |
| FND-0017 | P1 | أثر Journey Gate الحالي لا يشرح الفشل | TASK-0005 | OPEN |
| FND-0018 | P0 | لا يوجد إثبات نهائي متعدد الأسطح لكل الرحلات على SHA واحد | TASK-0018 | OPEN |

## 8. نموذج الحقيقة المستهدف

- DSH يملك الحقيقة التشغيلية والـfacade المرتبط بتجارب DSH.
- WLT يملك الحقيقة المالية والـledger ونتائج provider/reconciliation.
- الأسطح لا تكتب مباشرة في WLT لوظائف DSH؛ تستخدم عقد DSH facade المصرح.
- OpenAPI المركزي والعقود المملوكة والعملاء المولدون هي سلطة النقل.
- manifests والمهاجرات المملوكة هي سلطة مخطط البيانات وترتيبه.
- كل surface route/screen/control/action له binding قابل للتتبع أو قرار حذف مثبت.
- كل رحلة تُغلق على SHA واحد بعد 24 شريحة وقبول يدوي وruntime readback حيث تنطبق.

## 9. العناصر المرشحة للحذف أو الدمج

لا يوجد حذف تلقائي. `evidence/candidate-register.csv` يسجل شروط كل قرار. يحظر حذف migration أو contract أو negative test أو compatibility layer قبل census للمستهلكين وخطة ترحيل وrollback وفحص مراجع بعد آخر كتابة.

## 10. نقاط لم تُثبت

- سلوك الإنتاج غير مفحوص وغير مصرح به في هذه المرحلة.
- لم تُنفذ بعد تجربة يدوية لكل route/control/state في الأسطح الخمسة.
- لم يُحسم بعد لكل واحدة من 18 route هل الصحيح إعادة التنفيذ أم حذف العقد؛ يتطلب consumer census لكل operation.
- لم تُصنف كل مجموعة duplicate كنسخة لازمة أو قابلة للدمج.
- لم يُقاس التعقيد والتغير لكل ملف كبير؛ الحجم وحده ليس حكمًا.

## 11. نتيجة الاستعداد للرحلات

```yaml
open_findings: 18
current_contract_mismatches: 18
current_unverified_screen_bindings: 9
current_open_journeys: 107
current_planned_journey_slices: 2568
same_sha_full_runtime: false
same_sha_all_required_ci: false
journey_execution_allowed: false
```

الانتقال إلى الرحلات ممنوع حتى تنتهي PHASE-00..PHASE-06 وتنجح بوابة FOUNDATION على الرأس بعد آخر كتابة.
