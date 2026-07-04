# 09 — القبول النهائي، الأمر المختصر، وقاعدة الخاتمة

**Package:** Unified Operational Journey Protocol — v3 modular strict  
**File:** `09/09`  
**Repository:** `<REPO_REMOTE>`  
**Remote ref:** `<REF>`  
**Source path:** `tools/plan/command_operational_journey_unified`  
**GitHub file SHA observed:** `<RESOLVED_COMMIT_SHA>`  
**Scope:** معيار القبول النهائي، نسخة الاستخدام السريع، وقاعدة الخاتمة.

> قاعدة حاكمة: هذا الملف جزء من حزمة واحدة مكوّنة من 12 ملفًا. لا يُستخدم منفردًا لإعلان PASS. أي قبول يجب أن يرجع إلى `00_INDEX_AND_COVERAGE.md` ثم يطبّق كل الملفات ذات العلاقة، بما فيها `10_EXECUTION_PLAN_NO_SKIP_GATE.md` و`11_CODE_FIRST_FULLSTACK_SURFACE_COVERAGE_MODE.md`.

---
## 28) معيار القبول النهائي

لا يوجد قبول نهائي إلا إذا تحقق الآتي داخل النطاق:

```text
كل منطق في مالكه الصحيح
كل surface UI فقط
كل shared brain مسؤول عن المنطق المشترك
لا API مباشر من الشاشات
لا state/permission/validation/lifecycle داخل surfaces
لا تكرار غير مبرر
لا كود ميت داخل النطاق
لا mock/demo/preview كحقيقة تشغيلية
لا تسرب مالي خارج WLT
لا تسرب من أي نوع آخر خارج مالكه الصحيح (منطق/state/أسرار/process.env/raw API response)
لا تناقض بين الأدلة والادعاء
لا CI PASS غير مثبت
لا route أو handler أو client مكسور
لا migration أو database proof ناقص عند الحاجة
لا gaps معلنة أو مخفية داخل الرحلة
لا تبعثر لنفس المسؤولية بلا canonical_owner واحد
لا عنصر داخل النطاق بلا zero_defect_closure_matrix مكتمل (انظر 06#24.1)
لا FIX_REQUIRED معلّق بلا تنفيذ فعلي (حذف/نقل/دمج/إضافة/تعديل) عند task_mode: implementation_or_closure (انظر 06#24.2)
لا تقرير تشخيص بديل عن التنفيذ الفعلي عند task_mode: implementation_or_closure
صفر أخطاء، صفر تناقض، صفر تكرار، صفر فجوات، صفر ضجيج، صفر ضعف/نقص منطقي أو تشغيلي، صفر تشتت، صفر فشل، صفر عيوب — لكل عنصر داخل النطاق
كل الفحوصات المناسبة PASS
كل الأدلة من نفس ref/head ونفس resolved_commit_sha
لا مصدرين للحقيقة نفسها SSOT
لا PASS بلا evidence عملي واضح
لا إجراء Git/GitHub change تلقائي من طرف الوكيل
لا Antigravity command عام أو غير قابل للتنفيذ المباشر
لا خلط بين Partner وStore في الاسم أو الدور أو الحالة أو الصلاحية
لا Partner lifecycle داخل Store visibility بلا mapping صريح
لا Store publication داخل Partner activation بلا owner واضح
لا ظهور Partner في app-client
لا self-activation من app-partner
لا نشر Store للعميل من app-field
كل endpoint يعرض Stores للعميل يطبق نفس visibility gates
كل رحلة onboarding تحدد Partner-owned truths وStore-owned truths قبل التنفيذ
لا قبول إذا لم توجد affected_surface_inventory معرّفة ومثبتة لكل تطبيق/سطح/صفحة/شاشة/route/قسم لوحة تحكم/feature محتمل التأثر
لا قبول إذا تم إنتاج أدلة وملفات evidence كثيرة مكررة بدلاً من إصلاح وتصحيح الكود الحي
لا قبول إذا بقي أي تطبيق أو شاشة أو صفحة أو route أو قسم لوحة تحكم (control-panel section) أو feature داخل نطاق الـ Feature/Topic دون فحص كامل وتوصيل وإثبات
قرار IMPLEMENTATION_PASS يتطلب تعديلاً كودياً حياً وتحققاً كودياً أو تشغيلياً مختصراً وحاسماً، ويُمنع إعلانه بناءً على كتابة تقارير أو أدلة نظرية فقط دون كود حي
```

إذا فشل بند واحد داخل النطاق:

```text
RESULT: FIX_REQUIRED
```

إذا تعذر الإثبات:

```text
RESULT: BLOCKED_NEEDS_EVIDENCE
```

---

## 29) نسخة مختصرة للاستخدام السريع

```text
نفّذ مراجعة/تنفيذًا عمليًا وجنائيًا للرحلة التالية من GitHub Remote إلى الكود الحي، وفق بروتوكول الرحلة التشغيلية الموحدة v2-strict، دون اعتماد على المحلي أو الذاكرة أو أي ادعاء غير مثبت.

REPO_REMOTE: <REPO_REMOTE>
REPO_LOCAL: <REPO_LOCAL>
LOCAL_BRANCH: <LOCAL_BRANCH>
REF: <REF>
BASE_REF: <N/A أو base ref>
DONOR_REMOTE_READ_ONLY: bthwani2-boop/bthwani-suite
DONOR_LOCAL_READ_ONLY: C:\bthwani-suite
JOURNEY / TOPIC: <اسم الرحلة أو التوبك>
TASK: <analysis_only | implementation_or_closure | merge_review>
OUT_OF_SCOPE: <ما لا يجب لمسه مع السبب>

طبق REF Resolution Gate من GitHub Remote ولا تستخدم default branch إذا فشل REF. ثبّت resolved_commit_sha. طبّق Human-Gated Git/GitHub Change Control ولا تنشئ branch/commit/push/PR/merge/tag/release دون أمر بشري مستقل. اعتبر النتيجة FIX_REQUIRED حتى تثبت evidence matrix عكس ذلك. عرّف النطاق والمالكين والأسطح وأقسام لوحة التحكم قبل التنفيذ. عرّف حدود Partner وStore قبل التنفيذ: Partner هو كيان الاعتماد والوثائق والهوية والقرار، وStore هو كيان الظهور والكتالوج والطلبات والاكتشاف. لا تستخدمهما كمرادفين. أي خلط في routes أو schemas أو DB أو UI labels أو statuses أو permissions يعتبر FIX_REQUIRED. لا تعتمد على machine-readable كحقيقة حاكمة. التزم بأن services/dsh/frontend/shared هو عقل DSH، وأن services/wlt/frontend/shared/dsh هو عقل WLT-for-DSH، وأن surfaces UI فقط. امنع direct API وbusiness logic وstate machine وpermission policy وprocess.env وraw API mapping داخل surfaces. WLT هو مالك الحقيقة المالية الوحيد، وDSH يعرض references/status/metadata للقراءة فقط. استخدم المانح قراءة فقط لاستخراج القيمة دون نقل بنيته أو فوضاه. غطِّ Backend/API/Database/OpenAPI/API clients/shared/surfaces/runtime/tests/guards/evidence حسب النطاق. شغّل الفحوصات المناسبة، وراجع الأدلة من نفس resolved_commit_sha. أخرج نتيجة واحدة فقط: ANALYSIS_PASS أو IMPLEMENTATION_PASS أو FIX_REQUIRED أو BLOCKED_NEEDS_EVIDENCE أو DO_NOT_MERGE أو MERGE_READY أو PROTOCOL_VIOLATION، مع blockers بصيغة path/problem/root_cause/impact/priority/required_action/verification_command.
```

---

## 30) قاعدة الخاتمة

هذا البروتوكول لا يسمح بالحلول الناقصة المموهة. إذا لم يثبت الشيء بأمر أو مسار أو مخرج أو مصفوفة أو دليل تشغيل مناسب، فهو ليس PASS. وإذا كان الشيء غير قابل للإثبات بسبب نقص في البيئة أو الوصول أو البيانات، فهو `BLOCKED_NEEDS_EVIDENCE` وليس نجاحًا.

أي وكيل لا يستطيع الالتزام بهذه القواعد يجب أن يتوقف ويخرج:

```yaml
result: PROTOCOL_VIOLATION
reason: unable_to_follow_protocol_without_unsafe_or_unverified_claims
```
