# 04 — مصفوفات المشروع والأسطح ولوحة التحكم وسلسلة الربط

**Package:** Unified Operational Journey Protocol — v3 modular strict  
**File:** `04/09`  
**Repository:** `<REPO_REMOTE>`  
**Remote ref:** `<REF>`  
**Source path:** governance/operational_journey_protocol_package (self-contained)  
**GitHub file SHA observed:** `<RESOLVED_COMMIT_SHA>`  
**Scope:** مدخل matrices الإلزامية، project/surface/control-panel/binding matrices.

> قاعدة حاكمة: هذا الملف جزء من حزمة واحدة مكوّنة من 11 ملفًا (بعد إضافة Amendment). لا يُستخدم منفردًا لإعلان PASS. أي قبول يجب أن يرجع إلى `00_INDEX_AND_COVERAGE.md` ثم يطبّق كل الملفات ذات العلاقة، بما فيها `10_EXECUTION_PLAN_NO_SKIP_GATE.md`.

---
## 17) matrices إلزامية

أي رحلة لا تحتوي matrices التالية تصنف `FIX_REQUIRED`:

```text
project_area_matrix
entity_boundary_matrix عند دخول Partner أو Store في النطاق
surface_code_coverage_matrix
surface_entity_language_matrix عند دخول Partner أو Store في النطاق
control_panel_section_code_matrix
binding_chain_matrix
backend_layer_matrix عند دخول backend في النطاق
database_truth_matrix عند دخول database في النطاق
partner_store_database_truth_matrix عند دخول Partner أو Store في database في النطاق
api_client_policy_matrix عند دخول API/client في النطاق
ssot_matrix
publishability_visibility_matrix عند دخول الظهور/النشر في النطاق
store_client_visibility_gate_matrix عند دخول Store visibility للعميل في النطاق
auth_permission_matrix عند دخول الصلاحيات في النطاق
risk_based_test_matrix
topic_file_organization_matrix
consolidation_matrix
journey_sequence_matrix
evidence_matrix
```

### 17.1 project_area_matrix

```yaml
project_area_matrix:
  dsh:
    role: IN_SCOPE | READ_ONLY | NOT_APPLICABLE | FORBIDDEN
    reason:
    paths:
      - services/dsh
    verification_command:
  wlt:
    role:
    reason:
    paths:
      - services/wlt
    verification_command:
  apps_runtime:
    role:
    reason:
    paths:
      - apps
    verification_command:
  packages:
    role:
    reason:
    paths:
      - packages
    verification_command:
  tools:
    role:
    reason:
    paths:
      - tools
    verification_command:
  scripts:
    role:
    reason:
    paths:
      - tools/scripts
      - tools/guards
    verification_command:
  ci:
    role:
    reason:
    paths:
      - .github/workflows
    verification_command:
  docker:
    role:
    reason:
    paths:
      - docker
      - docker-compose.yml
    verification_command:
  docs:
    role:
    reason:
    paths:
      - docs
    verification_command:
  database:
    role:
    reason:
    paths:
      - database
    verification_command:
  contracts:
    role:
    reason:
    paths:
      - services/dsh/contracts
      - services/wlt/contracts
    verification_command:
  root_config:
    role:
    reason:
    paths:
      - package.json
      - pnpm-workspace.yaml
      - nx.json
    verification_command:
```

قواعد:

- أي مجال غير مذكور = `FIX_REQUIRED`.
- أي `NOT_APPLICABLE` بلا سبب ودليل عدم التأثر = `FIX_REQUIRED`.

### 17.1.1 entity_boundary_matrix

إلزامي كلما دخل Partner أو Store في نطاق الرحلة (انظر `03_SCOPE_TOPOLOGY_OWNERSHIP_DONOR.md` قسم 11.1).

```yaml
entity_boundary_matrix:
  partner:
    domain_meaning:
    canonical_backend_model:
    canonical_database_tables:
    canonical_openapi_schemas:
    canonical_frontend_types:
    owned_statuses:
    owned_actions:
    forbidden_actions:
    allowed_surfaces:
    forbidden_surfaces:
    verification_command:
  store:
    domain_meaning:
    canonical_backend_model:
    canonical_database_tables:
    canonical_openapi_schemas:
    canonical_frontend_types:
    owned_statuses:
    owned_actions:
    forbidden_actions:
    allowed_surfaces:
    forbidden_surfaces:
    verification_command:
  relationship:
    cardinality: "Partner 1 -> N Stores"
    join_field:
    legacy_nullability_policy:
    new_flow_requirement:
    verification_command:
  conflation_check:
    partner_used_as_store: PASS | FAIL
    store_used_as_partner: PASS | FAIL
    mixed_activation_visibility_status: PASS | FAIL
    ambiguous_labels_absence: PASS | FAIL
    ambiguous_routes_absence: PASS | FAIL
    ambiguous_types_absence: PASS | FAIL
    required_action:
```

قواعد:

- أي استخدام لـ Partner بمعنى Store = `FIX_REQUIRED`.
- أي استخدام لـ Store بمعنى Partner = `FIX_REQUIRED`.
- أي status واحد يحاول تمثيل اعتماد الشريك وظهور المتجر معًا بلا فصل صريح = `FIX_REQUIRED`.
- أي UI label يسبب لبسًا بين ملف الشريك والمتجر الظاهر للعميل = `FIX_REQUIRED`.

### 17.2 surface_code_coverage_matrix

يجب ذكر كل سطح حتى لو كان خارج النطاق:

```yaml
surface_code_coverage_matrix:
  app-client:
    role: REQUIRED | READ_ONLY | FORBIDDEN | NOT_APPLICABLE
    reason:
    surface_path:
    entry_file:
    imports_shared_brain: PASS | FAIL | N/A
    uses_shared_controller_or_view_model: PASS | FAIL | N/A
    direct_api_absence: PASS | FAIL | N/A
    local_business_logic_absence: PASS | FAIL | N/A
    local_state_machine_absence: PASS | FAIL | N/A
    local_permission_logic_absence: PASS | FAIL | N/A
    duplicated_domain_types_absence: PASS | FAIL | N/A
    raw_api_mapping_absence: PASS | FAIL | N/A
    process_env_absence: PASS | FAIL | N/A
    storage_operational_logic_absence: PASS | FAIL | N/A
    verification_command:
  app-partner:
    role:
    reason:
    surface_path:
    entry_file:
    imports_shared_brain:
    uses_shared_controller_or_view_model:
    direct_api_absence:
    local_business_logic_absence:
    local_state_machine_absence:
    local_permission_logic_absence:
    duplicated_domain_types_absence:
    raw_api_mapping_absence:
    process_env_absence:
    storage_operational_logic_absence:
    verification_command:
  app-field:
    role:
    reason:
    surface_path:
    entry_file:
    imports_shared_brain:
    uses_shared_controller_or_view_model:
    direct_api_absence:
    local_business_logic_absence:
    local_state_machine_absence:
    local_permission_logic_absence:
    duplicated_domain_types_absence:
    raw_api_mapping_absence:
    process_env_absence:
    storage_operational_logic_absence:
    verification_command:
  app-captain:
    role:
    reason:
    surface_path:
    entry_file:
    imports_shared_brain:
    uses_shared_controller_or_view_model:
    direct_api_absence:
    local_business_logic_absence:
    local_state_machine_absence:
    local_permission_logic_absence:
    duplicated_domain_types_absence:
    raw_api_mapping_absence:
    process_env_absence:
    storage_operational_logic_absence:
    verification_command:
  control-panel:
    role:
    reason:
    surface_path:
    entry_file:
    imports_shared_brain:
    uses_shared_controller_or_view_model:
    direct_api_absence:
    local_business_logic_absence:
    local_state_machine_absence:
    local_permission_logic_absence:
    duplicated_domain_types_absence:
    raw_api_mapping_absence:
    process_env_absence:
    storage_operational_logic_absence:
    verification_command:
```

قواعد:

- ممنوع حذف أي سطح.
- `N/A` مسموح فقط إذا كان الدور `FORBIDDEN` أو `NOT_APPLICABLE` مع reason.
- أي surface يحتوي business logic أو direct API أو state machine أو permission logic = `FIX_REQUIRED`.

### 17.2.1 surface_entity_language_matrix

إلزامي كلما دخل Partner أو Store في نطاق الرحلة.

```yaml
surface_entity_language_matrix:
  app-field:
    partner_labels_allowed:
    store_labels_allowed:
    forbidden_labels:
    allowed_partner_actions:
    allowed_store_actions:
    forbidden_actions:
    verification_command:
  control-panel:
    partner_section_labels:
    store_section_labels:
    allowed_partner_decisions:
    allowed_store_decisions:
    forbidden_mixed_decisions:
    verification_command:
  app-partner:
    partner_status_labels:
    store_management_labels:
    forbidden_self_activation_labels:
    verification_command:
  app-client:
    visible_entity: StoreOnly
    forbidden_partner_exposure: PASS | FAIL
    verification_command:
```

قواعد:

- app-client يجب أن يكون Store-only.
- app-field يجب أن يقول ملف شريك / بيانات متجر أول، لا تفعيل متجر.
- control-panel يجب أن يفصل بين قسم الشركاء وقسم المتاجر.
- app-partner لا يعرض أي زر أو نص يوحي بأن الشريك يفعّل نفسه.

### 17.3 control_panel_section_code_matrix

يجب ذكر كل قسم:

```yaml
control_panel_section_code_matrix:
  partners:
    role: PRIMARY | SECONDARY | READ_ONLY | FORBIDDEN | NOT_APPLICABLE
    reason:
    section_path:
    entry_file:
    related_routes:
    owned_decisions:
    allowed_actions:
    forbidden_actions:
    read_only_data:
    state_cases_used:
    shared_brain_import:
    shared_controller_or_view_model:
    direct_api_absence: PASS | FAIL | N/A
    local_business_logic_absence: PASS | FAIL | N/A
    local_permission_logic_absence: PASS | FAIL | N/A
    duplicated_domain_types_absence: PASS | FAIL | N/A
    raw_api_mapping_absence: PASS | FAIL | N/A
    process_env_absence: PASS | FAIL | N/A
    storage_operational_logic_absence: PASS | FAIL | N/A
    verification_command:
  catalog:
    role:
    reason:
    section_path:
    entry_file:
    related_routes:
    owned_decisions:
    allowed_actions:
    forbidden_actions:
    read_only_data:
    state_cases_used:
    shared_brain_import:
    shared_controller_or_view_model:
    direct_api_absence:
    local_business_logic_absence:
    local_permission_logic_absence:
    duplicated_domain_types_absence:
    raw_api_mapping_absence:
    process_env_absence:
    storage_operational_logic_absence:
    verification_command:
  operations:
    role:
    reason:
    section_path:
    entry_file:
    related_routes:
    owned_decisions:
    allowed_actions:
    forbidden_actions:
    read_only_data:
    state_cases_used:
    shared_brain_import:
    shared_controller_or_view_model:
    direct_api_absence:
    local_business_logic_absence:
    local_permission_logic_absence:
    duplicated_domain_types_absence:
    raw_api_mapping_absence:
    process_env_absence:
    storage_operational_logic_absence:
    verification_command:
  support:
    role:
    reason:
    section_path:
    entry_file:
    related_routes:
    owned_decisions:
    allowed_actions:
    forbidden_actions:
    read_only_data:
    state_cases_used:
    shared_brain_import:
    shared_controller_or_view_model:
    direct_api_absence:
    local_business_logic_absence:
    local_permission_logic_absence:
    duplicated_domain_types_absence:
    raw_api_mapping_absence:
    process_env_absence:
    storage_operational_logic_absence:
    verification_command:
  marketing:
    role:
    reason:
    section_path:
    entry_file:
    related_routes:
    owned_decisions:
    allowed_actions:
    forbidden_actions:
    read_only_data:
    state_cases_used:
    shared_brain_import:
    shared_controller_or_view_model:
    direct_api_absence:
    local_business_logic_absence:
    local_permission_logic_absence:
    duplicated_domain_types_absence:
    raw_api_mapping_absence:
    process_env_absence:
    storage_operational_logic_absence:
    verification_command:
  platform:
    role:
    reason:
    section_path:
    entry_file:
    related_routes:
    owned_decisions:
    allowed_actions:
    forbidden_actions:
    read_only_data:
    state_cases_used:
    shared_brain_import:
    shared_controller_or_view_model:
    direct_api_absence:
    local_business_logic_absence:
    local_permission_logic_absence:
    duplicated_domain_types_absence:
    raw_api_mapping_absence:
    process_env_absence:
    storage_operational_logic_absence:
    verification_command:
  finance_or_wlt:
    role:
    reason:
    section_path:
    entry_file:
    related_routes:
    owned_decisions:
    allowed_actions:
    forbidden_actions:
    read_only_data:
    state_cases_used:
    shared_brain_import:
    shared_controller_or_view_model:
    direct_api_absence:
    local_business_logic_absence:
    local_permission_logic_absence:
    duplicated_domain_types_absence:
    raw_api_mapping_absence:
    process_env_absence:
    storage_operational_logic_absence:
    verification_command:
  administration:
    role:
    reason:
    section_path:
    entry_file:
    related_routes:
    owned_decisions:
    allowed_actions:
    forbidden_actions:
    read_only_data:
    state_cases_used:
    shared_brain_import:
    shared_controller_or_view_model:
    direct_api_absence:
    local_business_logic_absence:
    local_permission_logic_absence:
    duplicated_domain_types_absence:
    raw_api_mapping_absence:
    process_env_absence:
    storage_operational_logic_absence:
    verification_command:
```

قواعد:

- ممنوع الاكتفاء بكلمة `control-panel` عامة.
- أي قسم غير مذكور = `FIX_REQUIRED`.
- أي قسم `PRIMARY` أو `SECONDARY` أو `READ_ONLY` يجب أن يذكر routes/actions/state/read-only data.
- القسم `PRIMARY` هو مالك القرار داخل لوحة التحكم.
- قسم آخر لا ينفذ قرار PRIMARY إلا إذا كان مصرحًا له داخل shared policy.

### 17.4 binding_chain_matrix

أي رحلة فيها backend/API/frontend يجب أن تثبت سلسلة الربط الكاملة:

```yaml
binding_chain_matrix:
  backend:
    routes:
    handlers:
    services:
    repositories:
    database_tables:
    migrations:
  api_contract:
    openapi_paths:
    request_response_schemas:
    error_schemas:
  api_client:
    client_files:
    generated_or_shared:
    direct_surface_api_absence: PASS | FAIL | N/A
  shared_brain:
    controller:
    state:
    view_model:
    policy:
    validation:
  surfaces:
    app-client:
      role:
      imports_shared_controller: PASS | FAIL | N/A
    app-partner:
      role:
      imports_shared_controller: PASS | FAIL | N/A
    app-field:
      role:
      imports_shared_controller: PASS | FAIL | N/A
    app-captain:
      role:
      imports_shared_controller: PASS | FAIL | N/A
    control-panel:
      role:
      imports_shared_controller: PASS | FAIL | N/A
  verification:
    typecheck:
    tests:
    guards:
    build:
```

أي حلقة مفقودة = `FIX_REQUIRED`.
