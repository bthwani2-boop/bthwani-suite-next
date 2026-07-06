# 08 — تنفيذ الإصلاح، Antigravity، والتقرير النهائي

**Package:** Unified Operational Journey Protocol — v3 modular strict + Amendment v2
**File:** `08/11`
**Repository:** `<REPO_REMOTE>`
**Remote ref:** `<REF>`
**Source path:** governance/operational_journey_protocol_package (self-contained)
**GitHub file SHA observed:** `<RESOLVED_COMMIT_SHA>`
**Scope:** قواعد التنفيذ في الكود الحي، معيار إخراج أوامر Antigravity، والتقرير النهائي الإلزامي.

> قاعدة حاكمة: هذا الملف جزء من حزمة واحدة مكوّنة من 12 ملفًا. لا يُستخدم منفردًا لإعلان PASS. أي قبول يجب أن يرجع إلى `00_INDEX_AND_COVERAGE.md` ثم يطبّق كل الملفات ذات العلاقة، بما فيها `10_EXECUTION_PLAN_NO_SKIP_GATE.md` و`11_CODE_FIRST_FULLSTACK_SURFACE_COVERAGE_MODE.md`.

---

## 23) قواعد تنفيذ الإصلاح في الكود الحي

عند `implementation_or_closure` فقط:

- الباك إند: routes, handlers, services, repositories, database truth, migrations.
- العقود والمستهلكين: OpenAPI, API clients.
- الواجهة المشتركة: shared brains (DSH and WLT-for-DSH).
- الواجهات السطحية: UI surfaces, routes, navigation.
- الصلاحيات والحالات: permissions, states, transitions.
- التحقق: tests, guards, evidence.

قواعد التنفيذ:

- **قاعدة Code First:** الأولوية دائمًا للكود الحي: تعديل، تصحيح، تنظيف، تنظيم، نقل، دمج، حذف، إضافة، ثم تحقق مختصر وحاسم. ممنوع تحويل التنفيذ إلى كتابة أدلة وتقارير طويلة.
- **قاعدة No report instead of fix:** أي نقص مثبت داخل النطاق لا يترك كـ TODO أو blocker أو مجرد تقرير، بل يتحول فورًا إلى تعديل كود حي.
- **الدليل النهائي المختصر:** يجب أن يكون الدليل حاسمًا ومختصرًا (Minimal Sufficient Evidence) كدليل حاسم واحد (مثل diff أو مخرج أمر أو نتيجة اختبار)، ولا يجوز إنشاء ملفات أدلة (evidence files) كثيرة ومكررة.
- لا تعتمد على mock/demo/preview كحقيقة تشغيلية.
- لا تنشئ نظام تصميم موازٍ. استخدم `@bthwani/ui-kit` و `@bthwani/app-shell` حيث يلزم.
- لا تفتح نطاقًا جديدًا إلا إذا كان blocker مباشرًا للرحلة.
- لا تنقل ملفًا أو تحذفه قبل إثبات علاقاته.
- لا تعدل المانح.
- لا تغيّر API أو migration أو route بلا فحص أثر.

حالات الواجهة المطلوب تغطيتها عند العلاقة:
`loading` | `empty` | `error` | `success` | `blocked` | `disabled` | `retry` | `offline` | `forbidden` | `not_found` | `conflict` | `invalid_transition`.

---

## 26) Antigravity Command Output Standard

إذا كان المطلوب إنتاج أمر لوكيل Google Antigravity أو أي نموذج ذكاء اصطناعي، يجب أن يكون الناتج أمرًا تنفيذيًا مباشرًا لا يحتاج تفسيرًا إضافيًا.

```yaml
antigravity_command:
  title:
  repository: <REPO_REMOTE>
  local_path: <REPO_LOCAL>
  local_branch: <LOCAL_BRANCH>
  remote_ref: <REF>
  resolved_commit_required: true
  base_ref:
  task:
  out_of_scope:
  human_change_control_notice:
  execution_principles:
    - GitHub Remote First
    - REF Resolution Gate
    - Human-Gated Git/GitHub Changes
    - Evidence-Gated Claims
    - Shared Brain Before Surfaces
    - DSH/WLT Financial Boundary
    - No machine-readable as governing truth
    - No mock/demo/preview as runtime truth
  sequential_phases:
    - phase_number: 0
      phase_name: Resolve remote ref
      objective:
      actions:
      files_or_paths_to_check:
      expected_evidence:
      blocking_conditions:
      verification_commands:
      pass_criteria:
    - phase_number: 1
      phase_name: Define scope and ownership
      objective:
      actions:
      files_or_paths_to_check:
      expected_evidence:
      blocking_conditions:
      verification_commands:
      pass_criteria:
    - phase_number: 2
      phase_name: Code and architecture investigation
      objective:
      actions:
      files_or_paths_to_check:
      expected_evidence:
      blocking_conditions:
      verification_commands:
      pass_criteria:
    - phase_number: 3
      phase_name: Implementation if authorized by task mode
      objective:
      actions:
      files_or_paths_to_check:
      expected_evidence:
      blocking_conditions:
      verification_commands:
      pass_criteria:
    - phase_number: 4
      phase_name: Verification and evidence gate
      objective:
      actions:
      files_or_paths_to_check:
      expected_evidence:
      blocking_conditions:
      verification_commands:
      pass_criteria:
    - phase_number: 5
      phase_name: Final report
      objective:
      actions:
      files_or_paths_to_check:
      expected_evidence:
      blocking_conditions:
      verification_commands:
      pass_criteria:
  required_matrices:
    - project_area_matrix
    - surface_code_coverage_matrix
    - control_panel_section_code_matrix
    - binding_chain_matrix
    - ssot_matrix
    - risk_based_test_matrix
    - topic_file_organization_matrix
    - consolidation_matrix
    - journey_sequence_matrix
    - evidence_matrix
  required_commands:
  forbidden_actions:
    - automatic commit
    - automatic push
    - automatic PR
    - automatic merge
    - branch substitution
    - default branch fallback
    - PASS without evidence
  final_report_schema:
```

أي أمر ناتج لا يحقق ذلك = `FIX_REQUIRED`.

---

## 27) التقرير النهائي الإلزامي

اكتب نتيجة واحدة فقط، ثم التقرير بالتنسيق المعتمد التالي:

```yaml
result:
task_mode:
ref: <REF>
base_ref:
local_branch: <LOCAL_BRANCH>
resolved_commit_sha:
journey_or_topic:
final_decision_reason:
scope:
out_of_scope:
topic_definition:
ref_resolution_gate:
remote_evidence_reviewed:
legacy_sources_harvested:
  - tools/plan/command_operational_journey_unified: deleted_and_harvested
  - tools/plan/command_old_new: deleted_and_harvested
self_containment_status: PASS
internal_reference_integrity_status: PASS
human_change_control_status:
project_area_matrix:
ssot_status:
publishability_visibility_status:
auth_permission_status:
what_is_correct:
what_is_wrong:
what_is_missing:
files_changed:
files_rebuilt_from_legacy_history:
files_not_restored_as_active:
donor_value_used:
donor_value_rejected:
backend_api_database_status:
dsh_shared_ownership_status:
wlt_for_dsh_boundary_status:
ui_surfaces_status:
control_panel_sections_status:
runtime_status:
guards_status:
tests_status:
ci_status:
evidence_status:
merge_decision:
remaining_blockers: []
next_required_action:
```

صيغة كل blocker نهائي:

```yaml
- path:
  problem:
  root_cause:
  impact:
  priority: P0 | P1 | P2 | P3
  required_action:
  owner:
  verification_command:
  evidence:
  status_after_fix:
```
