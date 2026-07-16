# 09 — القبول النهائي، الأمر المختصر، وقاعدة الخاتمة

**Package:** Unified Operational Journey Protocol — v3 modular strict + Amendment v2
**File:** 09 of 12
**Repository:** `<REPO_REMOTE>`
**Remote ref:** `<REF>`
**Source path:** governance/operational_journey_protocol_package (self-contained)
**GitHub file SHA observed:** `<RESOLVED_COMMIT_SHA>`
**Scope:** معيار القبول النهائي، نسخة الاستخدام السريع، وقاعدة الخاتمة.

> قاعدة حاكمة: هذا الملف جزء من حزمة واحدة مكوّنة من 12 ملفًا. لا يُستخدم منفردًا لإعلان PASS. أي قبول يجب أن يرجع إلى `00_INDEX_AND_COVERAGE.md` ثم يطبّق كل الملفات ذات العلاقة، بما فيها `10_EXECUTION_PLAN_NO_SKIP_GATE.md` و`11_CODE_FIRST_FULLSTACK_SURFACE_COVERAGE_MODE.md`.

---

## 28) معيار القبول النهائي

```yaml
live_code_closure_gate:
  docs_only_changes_allowed_for_closure: false
  governance_only_changes_allowed_for_closure: false
  diagnostics_only_changes_allowed_for_closure: false
  checklist_only_changes_allowed_for_closure: false
  generated_output_only_changes_allowed_for_closure: false
```

لا يوجد قبول نهائي إلا إذا تحقق الآتي داخل النطاق:

- كل منطق في مالكه الصحيح.
- كل surface UI فقط.
- كل shared brain مسؤول عن المنطق المشترك.
- لا API مباشر من الشاشات (لا direct API call).
- لا state/permission/validation/lifecycle داخل surfaces.
- لا تكرار غير مبرر.
- لا كود ميت داخل النطاق.
- لا mock/demo/preview كحقيقة تشغيلية.
- لا تسرب مالي خارج WLT.
- لا تسرب من أي نوع آخر خارج مالكه الصحيح (منطق/state/أسرار/process.env/raw API response).
- لا تناقض بين الأدلة والادعاء.
- لا CI PASS غير مثبت.
- لا route أو handler أو client مكسور.
- لا migration أو database proof ناقص عند الحاجة.
- لا gaps معلنة أو مخفية داخل الرحلة.
- لا تبعثر لنفس المسؤولية بلا canonical_owner واحد.
- لا عنصر داخل النطاق بلا zero_defect_closure_matrix مكتمل (انظر 06#24.1).
- لا FIX_REQUIRED معلّق بلا تنفيذ فعلي (حذف/نقل/دمج/إضافة/تعديل) عند task_mode: implementation_or_closure (انظر 06#24.2).
- لا تقرير تشخيص بديل عن التنفيذ الفعلي عند task_mode: implementation_or_closure.
- صفر أخطاء، صفر تناقض، صفر تكرار، صفر فجوات، صفر ضجيج، صفر ضعف/نقص منطقي أو تشغيلي، صفر تشتت، صفر فشل، صفر عيوب — لكل عنصر داخل النطاق.
- كل الفحوصات المناسبة PASS.
- كل الأدلة من نفس ref/head ونفس resolved_commit_sha.
- لا مصدرين للحقيقة نفسها SSOT.
- لا PASS بلا evidence عملي واضح.
- لا إجراء Git/GitHub change تلقائي من طرف الوكيل.
- لا Antigravity command عام أو غير قابل للتنفيذ المباشر.
- لا خلط بين Partner وStore في الاسم أو الدور أو الحالة أو الصلاحية.
- لا Partner lifecycle داخل Store visibility بلا mapping صريح.
- لا Store publication داخل Partner activation بلا owner واضح.
- لا ظهور Partner في app-client.
- لا self-activation من app-partner.
- لا نشر Store للعميل من app-field.
- كل endpoint يعرض Stores للعميل يطبق نفس visibility gates.
- كل رحلة onboarding تحدد Partner-owned truths وStore-owned truths قبل التنفيذ.
- لا قبول إذا لم توجد affected_surface_inventory معرّفة ومثبتة لكل تطبيق/سطح/صفحة/شاشة/route/قسم لوحة تحكم/feature محتمل التأثر.
- لا قبول إذا تم إنتاج أدلة وملفات evidence كثيرة مكررة بدلاً من إصلاح وتصحيح الكود الحي.
- لا قبول إذا بقي أي تطبيق أو شاشة أو صفحة أو route أو قسم لوحة تحكم (control-panel section) أو feature داخل نطاق الـ Feature/Topic دون فحص كامل وتوصيل وإثبات.
- قرار IMPLEMENTATION_PASS يتطلب تعديلاً كودياً حياً وتحققاً كودياً أو تشغيلياً مختصراً وحاسماً، ويُمنع إعلانه بناءً على كتابة تقارير أو أدلة نظرية فقط دون كود حي.

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
نفّذ مراجعة/تنفيذًا عمليًا وجنائيًا للرحلة التالية من GitHub Remote إلى الكود الحي، وفق بروتوكول الرحلة التشغيلية الموحدة v3-modular، دون اعتماد على المحلي أو الذاكرة أو أي ادعاء غير مثبت.

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

طبق REF Resolution Gate من GitHub Remote ولا تستخدم default branch إذا فشل REF. ثبّت resolved_commit_sha. طبّق Human-Gated Git/GitHub Change Control ولا تنشئ branch/commit/push/PR/merge/tag/release دون أمر بشري مستقل. اعتبر النتيجة FIX_REQUIRED حتى تثبت evidence matrix عكس ذلك. عرّف النطاق والمالكين والأسطح وأقسام لوحة التحكم قبل التنفيذ. عرّف حدود Partner وStore قبل التنفيذ: Partner هو كيان الاعتماد والوثائق والهوية والقرار، وStore هو كيان الظهور والكتالوج والطلبات والاكتشاف. لا تستخدمهما كمرادفين. أي خلط في routes أو schemas أو DB أو UI labels أو statuses أو permissions يعتبر FIX_REQUIRED. لا تعتمد على machine-readable كحقيقة حاكمة. التزم بأن services/dsh/frontend/shared هو عقل DSH، وأن services/wlt/frontend/shared/dsh هو عقل WLT-for-DSH، وأن الأسطح UI فقط. امنع direct API وbusiness logic وstate machine وpermission policy وprocess.env وraw API mapping داخل surfaces. WLT هو مالك الحقيقة المالية الوحيد، وDSH يعرض references/status/metadata للقراءة فقط. استخدم المانح قراءة فقط لاستخراج القيمة الصحيحة دون نقل بنيته أو فوضاه. غطِّ Backend/API/Database/OpenAPI/API clients/shared/surfaces/runtime/tests/guards/evidence حسب النطاق. شغّل الفحوصات المناسبة، وراجع الأدلة من نفس resolved_commit_sha. أخرج نتيجة واحدة فقط: ANALYSIS_PASS أو IMPLEMENTATION_PASS أو FIX_REQUIRED أو BLOCKED_NEEDS_EVIDENCE أو DO_NOT_MERGE أو MERGE_READY أو PROTOCOL_VIOLATION، مع blockers بصيغة path/problem/root_cause/impact/priority/required_action/verification_command.
```

---

## 30) قاعدة الخاتمة

هذا البروتوكول لا يسمح بالحلول الناقصة المموهة. إذا لم يثبت الشيء بأمر أو مسار أو مخرج أو مصفوفة أو دليل تشغيل مناسب، فهو ليس PASS. وإذا كان الشيء غير قابل للإثبات بسبب نقص في البيئة أو الوصول أو البيانات، فهو `BLOCKED_NEEDS_EVIDENCE` وليس نجاحًا.

أي وكيل لا يستطيع الالتزام بهذه القواعد يجب أن يتوقف ويخرج:

```yaml
result: PROTOCOL_VIOLATION
reason: unable_to_follow_protocol_without_unsafe_or_unverified_claims
```


## Frontend-Backend Acceptance Gate

```yaml
frontend_backend_acceptance_gate:
  unbound_ui_controls: 0
  frontend_only_routes: 0
  backend_only_routes: 0
  request_mismatches: 0
  response_mismatches: 0
  status_mismatches: 0
  permission_mismatches: 0
  error_mapping_mismatches: 0
  generated_client_drift: 0
  untraced_contract_fields: 0
  unverified_runtime_bindings: 0
```

```yaml
numeric_closure:
  unbound_controls: 0
  contract_mismatches: 0
  permission_mismatches: 0
  failed_required_checks: 0
  unresolved_internal_gaps: 0
  duplicate_truth_owners: 0
  runtime_journeys_unverified: 0
```

> قاعدة: لا يسمح بـIMPLEMENTATION_PASS إلا عند تحققها كلها.

## Required CI Acceptance

```yaml
required_ci_acceptance:
  final_protocol_gate: PASS
  standard_ci: PASS
  runtime_gate: PASS | NOT_REQUIRED_WITH_PROOF
  unresolved_internal_gaps: 0
```

## SaaS/Tenancy Acceptance Gate

```yaml
saas_tenancy_acceptance_gate:
  tenant_owned_entities_classified: true
  tenant_context_propagation_verified: true
  cross_tenant_negative_tests_passed: true
  cross_tenant_data_leakage: 0
  privileged_cross_tenant_access_audited: true | NOT_APPLICABLE
  tenant_export_delete_backup_restore_defined: true | NOT_APPLICABLE
  per_tenant_observability_defined: true | NOT_APPLICABLE
  quotas_or_noisy_neighbor_policy_defined: true | NOT_APPLICABLE
  wlt_tenant_financial_isolation_verified: true | NOT_APPLICABLE
  commercial_saas_activation: BLOCKED_BY_POLICY | APPROVED
```

Allowed SaaS decisions:

```text
SAAS_ACTIVATION_APPROVED
SAAS_READY_DEFERRED
FIX_REQUIRED
HARD_BLOCKED_EXTERNAL_ONLY
```

Commercial SaaS activation is forbidden unless the decision is explicitly `SAAS_ACTIVATION_APPROVED`.
