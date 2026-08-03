# FOUNDATION-00 — خط الأساس الحاكم قبل تنفيذ الرحلات

```yaml
repository: bthwani2-boop/bthwani-suite-next
branch: smsm
last_assessed_sha: 54fdc9162dea44476005ae1ca6adc2ab7f4b9623
current_package_sha: 2f34e305af03abc26354c8145f1193b0dafdfcf4
status: FIX_REQUIRED
journey_execution_allowed: false
journey_assessment_allowed: true
merge_allowed: false
```

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

### FND-D01 — `no-broken-imports` يفشل قبل فحص الواردات

- الملف: `tools/guards/no-broken-imports.mjs`.
- العارض: `TypeError: Cannot read properties of undefined (reading 'Latest')` عند `ts.ScriptTarget.Latest`.
- السبب المرجح المثبت من الكود: default import لـ`typescript` لا يعيد namespace المتوقع في بيئة Node/TypeScript الحالية.
- المعالجة: استخدام namespace import أو تحميل متوافق ثم إضافة self-test يمنع crash ويثبت parsing لكل TS/TSX/JS/MJS/CJS.
- يمنع: Journey Gate وPROJECT-WIDE verification.

### FND-D02 — Immutable diff residue

أظهر CI whitespace/EOF residue في:

- `services/dsh/backend/internal/store/governance.go`.
- `services/dsh/contracts/dsh.workforce-scopes.openapi.yaml`.
- `services/dsh/frontend/shared/workforce/workforce-scopes.api.ts`.
- `tools/trash/m`.

`tools/trash/m` يبدو artifact تشخيصيًا داخل المسار الحي؛ يجب إثبات عدم الاستهلاك ثم حذفه، لا إصلاح whitespace فقط.

### FND-D03 — Migration verification مشترك

مهاجرات Identity/Workforce/DSH/WLT/Providers/Platform-control فشلت في خط CI السابق قبل اختبارات Go. النمط المشترك يدل على خلل runner/test contract أو legacy-ledger handling، لا ستة أخطاء مستقلة حتى يثبت العكس.

### FND-D04 — Runtime proof

Runtime كان يفشل سابقًا عند catalog readback رغم صحة الحاويات. تم تعديل bootstrap، لكن نجاح readback الكامل على الرأس النهائي لم يثبت بعد.

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
