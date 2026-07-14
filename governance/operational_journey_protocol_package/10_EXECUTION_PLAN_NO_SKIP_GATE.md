# 10 — Execution Plan No-Skip Gate & Docker/Hosting/Runtime Matrix

**Package:** Unified Operational Journey Protocol — v3 modular strict + Amendment v2
**File:** 10 of 12
**Repository:** `<REPO_REMOTE>`
**Remote ref:** `<REF>`
**Source path:** governance/operational_journey_protocol_package (self-contained, tools/plan archived)
**Amendment date:** `2026-07-06`
**Scope:** يسد فجوة السماح بالقفز/التجاهل أثناء كتابة أمر التنفيذ وخطة التنفيذ والتشخيص والتحليل والتنفيذ، ويضيف Docker/hosting/runtime كطبقة إلزامية لا يجوز إسقاطها، ويحمل guards/أوامر تحقق كانت موجودة فقط في `command_old_new` ولم تُنقل بقوة كافية إلى `07`.

> قاعدة حاكمة: هذا الملف جزء من حزمة واحدة مكوّنة الآن من 12 ملفًا. لا يُستخدم منفردًا لإعلان PASS. أي قبول يجب أن يرجع إلى `00_INDEX_AND_COVERAGE.md` ثم يطبّق كل الملفات ذات العلاقة، بما فيها `11_CODE_FIRST_FULLSTACK_SURFACE_COVERAGE_MODE.md` وهذا الملف.

---

## 31) Execution Plan No-Skip Gate

أي وكيل يكتب أمر تنفيذ أو خطة تنفيذ أو تقرير تشخيص أو تقرير تحليل أو ينفذ رحلة تشغيلية يجب أن يثبت أنه لم يتجاهل أي بند من البروتوكول.

```yaml
execution_plan_completeness_gate:
  applies_to:
    - command_generation
    - execution_plan_generation
    - diagnosis
    - analysis
    - implementation
    - verification
    - final_report
  required_rule: >
    كل أمر تنفيذ أو خطة تنفيذ يجب أن تحتوي protocol_coverage_checklist
    تربط كل ملف من ملفات الحزمة (00-11) بخطوة تنفيذ أو سبب استبعاد مثبت.
  mandatory_outputs:
    - protocol_file_coverage_matrix
    - execution_step_coverage_matrix
    - skipped_item_matrix
    - out_of_scope_justification_matrix
    - entity_boundary_matrix
    - surface_entity_language_matrix
    - partner_store_database_truth_matrix
    - store_client_visibility_gate_matrix
  failure_conditions:
    - أي ملف من ملفات البروتوكول (00-11) غير مذكور
    - أي بند مستبعد بلا سبب ودليل عدم التأثر
    - أي خطوة تنفيذ بلا verification_command
    - أي خطة لا تغطي Docker/runtime/CI/database/backend/API/shared/surfaces عند دخولها في النطاق
    - أي استخدام لعبارات عامة مثل "حسب الحاجة" أو "عند اللزوم" أو "لاحقًا" دون معيار حسم
    - أي رحلة DSH فيها Partner أو Store ولا تحتوي entity_boundary_matrix
    - أي app-client يعرض Partner أو يعتمد على Partner label بدل Store
    - أي app-field يملك activation أو client visibility decision
    - أي app-partner يملك self-activation
    - أي endpoint discovery/list/get يعرض Store للعميل دون نفس visibility gates
    - أي status أو schema أو route يخلط بين Partner lifecycle وStore publication
  result_if_failed: PROTOCOL_VIOLATION
```

تجاهل أي نقطة من البروتوكول أثناء الكتابة أو التخطيط أو التشخيص أو التحليل أو التنفيذ أو التحقق أو التقرير النهائي يعتبر `PROTOCOL_VIOLATION`، وليس `FIX_REQUIRED` فقط، إذا كان التجاهل بلا تصريح ودليل عدم التأثر.

عبارات عامة (`حسب الحاجة` / `عند اللزوم` / `لاحقًا` / `غير داخل النطاق` / `لا يبدو مؤثرًا`) لا تُقبل إلا مرفقة بكل الحقول التالية:

```yaml
justified_exclusion:
  path_or_scope:
  reason:
  evidence:
  verification_command:
  impact_if_skipped:
  decision:
```

أي رحلة تشغيلية لا تفحص Docker/runtime/hosting/ports/env/database/backend/API/shared/surfaces/tests/guards/CI عند دخولها في النطاق = `FIX_REQUIRED`.

أي ملف مرتبط بالرحلة يبقى بعد التنفيذ وفيه كود ميت أو تناقض أو تكرار أو منطق في غير مالكه أو مسار غير صحيح أو تنظيم خاطئ أو naming سيئ أو dependency غير مبررة أو mock/demo/preview runtime truth = `FIX_REQUIRED`.

لا يجوز إعلان `IMPLEMENTATION_PASS` حتى تكون:

- `protocol_coverage_checklist` كاملة
- `execution_plan_coverage_matrix` كاملة
- `docker_hosting_runtime_matrix` مكتملة أو N/A بدليل
- `dead_code_and_duplication_matrix` مكتملة
- `file_decision_matrix` مكتملة لكل ملف مرتبط
- `evidence_matrix` مكتملة لكل طبقة داخل النطاق

### قاعدة التبسيط والمخارج المبكرة

1. **Compact output is the default. Expanded matrices are exceptional.**
2. **تبقى المصفوفات والتقارير التفصيلية مطلوبة فقط بشكل استثنائي عند**:
   وجود خطر عالٍ يستدعي تفصيلًا إضافيًا لا يمكن إثباته في السجل المختصر.
3. **منع المخارج المبكرة**: حالات `FIX_REQUIRED` و`BLOCKED_NEEDS_EVIDENCE` ليست مخارج مبكرة في `implementation_or_closure`؛ يجب على الوكيل السعي دائمًا لتصحيح الكود وتنفيذ الحلول بدلاً من مجرد التقرير السريع بوجود عوائق.

---

## 32) Docker / Hosting / Runtime Infrastructure Matrix

Docker والاستضافة والبيئة التشغيلية طبقة مستقلة إلزامية لأي رحلة تشغيلية، ولا يجوز الاكتفاء بحقل `docker` العام داخل `project_area_matrix` (انظر `04_MATRICES_PROJECT_SURFACE_CONTROL_BINDING.md`).

```yaml
docker_hosting_runtime_matrix:
  docker:
    affected: true | false
    compose_files:
    dockerfiles:
    services:
    ports:
    volumes:
    networks:
    env_files:
    healthchecks:
    verification_command:
  database_container:
    affected:
    image:
    port_mapping:
    volume:
    migration_command:
    seed_command:
    health_status_command:
  backend_container_or_process:
    affected:
    boot_command:
    env_required:
    health_endpoint:
    smoke_command:
  frontend_runtime:
    affected:
    surface:
    boot_command:
    env_required:
    port:
    api_base_url_binding:
  hosting_or_deployment:
    affected:
    target:
    config_paths:
    secrets_required:
    build_command:
    deployment_check:
  failure_conditions:
    - docker path غير مفحوص مع أن الرحلة تشغيلية
    - port/env/volume/network غير موثق
    - healthcheck غير موجود أو غير مثبت
    - runtime يعمل محليًا لكن Docker/hosting مكسور
    - Docker يعمل لكن API/frontend binding مكسور
  result_if_failed: FIX_REQUIRED
```

---

## 33) أوامر تحقق محصودة — البوابات الموحدة الحالية

البوابات التالية هي الأوامر التحقق الإلزامية الفعلية بعد توحيد الحراس:

```powershell
git status --short
git diff --check
pnpm install --frozen-lockfile

pnpm run foundation:gate
pnpm run journey:gate

Push-Location "services\dsh\backend"
go test ./...
go build ./...
Pop-Location

Push-Location "core\identity\backend"
go test ./...
go build ./...
Pop-Location
```

قواعد استخدام هذه الأوامر:

- `foundation:gate` إلزامي في كل رحلة بلا استثناء.
- `journey:gate` إلزامي في كل رحلة تمس surface أو shared أو WLT.
- Go backends تُشغَّل فقط إذا كانت داخل نطاق الرحلة الفعلي.

إذا فشل أي أمر: `FIX_REQUIRED`. إذا كان الأمر غير موجود في `package.json` أو workspace: طبّق نفس قاعدة الأمر المفقود في `07` (القسم 19) — لا يجوز تحويله إلى PASS.

---

## 35) تحديث قاعدة عدم إسقاط البنود

```yaml
change_control_for_protocol_package_v2:
  package_file_count: 12
  amendment_file: 10_EXECUTION_PLAN_NO_SKIP_GATE.md
  amendment_reason: سد فجوة القفز أثناء كتابة الأوامر/الخطط + غياب طبقة Docker/hosting مستقلة + عدم حصاد guards من command_old_new
  update_all_impacted_files: required
  update_manifest: required
  no_silent_deletion: required
  no_unmapped_section: required
  result_if_broken: FIX_REQUIRED
```


## Execution Plan Required Matrices and Failure Conditions

يجب إضافة هذه المصفوفات إلى mandatory_outputs:
- frontend_backend_parity_matrix
- contract_field_traceability_matrix
- request_response_alignment_matrix
- state_status_alignment_matrix
- error_semantics_alignment_matrix
- orphan_frontend_feature_matrix
- orphan_backend_capability_matrix
- frontend_backend_runtime_journey_matrix

شروط الفشل:
- أي UI feature بلا backend chain.
- أي backend capability بلا contract مطابق.
- أي contract operation بلا backend implementation.
- أي generated client method لا يستخدمه shared brain عند الحاجة.
- أي request أو response أو enum أو permission أو error mismatch.
- أي نجاح مثبت في طبقة واحدة فقط.
