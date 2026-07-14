# 04 — مصفوفات المشروع والأسطح ولوحة التحكم وسلسلة الربط

**Package:** Unified Operational Journey Protocol — v3 modular strict + Amendment v2
**File:** `04 of 12`
**Repository:** `<REPO_REMOTE>`
**Remote ref:** `<REF>`
**Source path:** governance/operational_journey_protocol_package (self-contained)
**GitHub file SHA observed:** `<RESOLVED_COMMIT_SHA>`
**Scope:** مدخل matrices الإلزامية، project/surface/control-panel/binding matrices.

> قاعدة حاكمة: هذا الملف جزء من حزمة واحدة مكوّنة من 12 ملفًا. لا يُستخدم منفردًا لإعلان PASS. أي قبول يجب أن يرجع إلى `00_INDEX_AND_COVERAGE.md` ثم يطبّق كل الملفات ذات العلاقة، بما فيها `10_EXECUTION_PLAN_NO_SKIP_GATE.md` و`11_CODE_FIRST_FULLSTACK_SURFACE_COVERAGE_MODE.md`.

---

## 17) matrices إلزامية

أي رحلة لا تحتوي matrices التالية تصنف `FIX_REQUIRED`:

```text
project_area_matrix
entity_boundary_matrix عند دخول Partner أو Store في النطاق
surface_code_coverage_matrix
surface_entity_language_matrix عند دخول Partner أو Store في النطاق
control_panel_section_code_matrix
control_panel_partner_store_section_matrix عند دخول Partner أو Store في النطاق
control_panel_permission_section_matrix
control_panel_runtime_route_section_matrix
control_panel_empty_error_blocked_states_matrix
binding_chain_matrix
```

### 17.1) project_area_matrix

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

### 17.1.1) entity_boundary_matrix

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

---

### 17.2) surface_code_coverage_matrix

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
    loading_empty_error_success_contract: PASS | FAIL | N/A
    blocked_disabled_retry_offline_contract: PASS | FAIL | N/A
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
    loading_empty_error_success_contract:
    blocked_disabled_retry_offline_contract:
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
    loading_empty_error_success_contract:
    blocked_disabled_retry_offline_contract:
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
    loading_empty_error_success_contract:
    blocked_disabled_retry_offline_contract:
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
    loading_empty_error_success_contract:
    blocked_disabled_retry_offline_contract:
    verification_command:
```

قواعد:

- ممنوع حذف أي سطح.
- `N/A` مسموح فقط إذا كان الدور `FORBIDDEN` أو `NOT_APPLICABLE` مع reason.
- أي surface يحتوي business logic أو direct API أو state machine أو permission logic = `FIX_REQUIRED`.

---

### 17.3) surface_entity_language_matrix

إلزامي كلما دخل Partner أو Store في نطاق الرحلة.

```yaml
surface_entity_language_matrix:
  app-field:
    partner_labels_allowed: true
    store_labels_allowed: true
    forbidden_labels: "أي زر تفعيل شريك أو نشر متجر للعملاء"
    allowed_partner_actions: "إنشاء onboarding Partner وجمع بيانات Store الأول"
    allowed_store_actions: "إدخال بيانات المتجر التشغيلية الأولية فقط"
    forbidden_actions: "تفعيل Partner، نشر Store للعملاء، أو تغيير client visibility"
    verification_command:
  control-panel:
    partner_section_labels: "اعتماد الشركاء، تدقيق الهوية والوثائق"
    store_section_labels: "نشر المتاجر، بوابات الظهور الجغرافي والعملاء"
    allowed_partner_decisions: "الموافقة/الرفض النهائي لاعتماد الشريك"
    allowed_store_decisions: "تعديل حالة النشر والظهور للمتجر مستقلًا عن الشريك"
    forbidden_mixed_decisions: "اعتماد شريك يؤدي تلقائيًا لنشر متجر غير جاهز محتواه"
    verification_command:
  app-partner:
    partner_status_labels: "حالة الانضمام، حالة الوثائق، حالة الاعتماد"
    store_management_labels: "إدارة ساعات العمل والكتالوج بعد الموافقة"
    forbidden_self_activation_labels: "زر تفعيل الشريك ذاتيًا (Self-Activation Forbidden)"
    verification_command:
  app-client:
    visible_entity: StoreOnly
    forbidden_partner_exposure: "ممنوع كشف حالة الشريك القانونية أو بياناته الخاصة للعميل"
    verification_command:
```

قواعد:

- app-client لا يرى Partner إطلاقًا؛ يرى Stores فقط.
- app-field ينشئ onboarding Partner ويجمع بيانات Store أول، ولا يفعّل Partner ولا ينشر Store.
- app-partner يرى حالة Partner onboarding ويدير Store فقط بعد السماح، ولا يملك self-activation.
- control-panel يملك قرارات اعتماد Partner وقرارات نشر/إخفاء Store حسب الصلاحيات.
- app-captain لا يخلط Partner/Store إلا كقراءة تشغيلية عند وجود علاقة مثبتة.

---

### 17.4) control_panel_section_code_matrix

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
- القسم `PRIMARY` هو مالك القرار داخل لوحة التحكم، وقسم آخر لا ينفذ قرار PRIMARY إلا إذا كان مصرحًا له داخل shared policy.

---

### 17.4.1) control_panel_partner_store_section_matrix

إلزامي للتحقق من الفصل الكودي التام بين قسم الشريك وقسم المتجر:

```yaml
control_panel_partner_store_section_matrix:
  partners_section:
    route_path: "/control-panel/partners"
    ui_views: "PartnerList, PartnerDetail, DocumentVerifier"
    business_actions: "approvePartner, rejectPartner, suspendPartner"
    owner_model: "Partner"
  stores_section:
    route_path: "/control-panel/stores"
    ui_views: "StoreList, StoreDetail, CatalogViewer"
    business_actions: "publishStore, hideStore, updateMarketingVisibility"
    owner_model: "Store"
  cross_section_contamination_check:
    forbidden_mixed_components_absence: PASS | FAIL
    verification_command:
```

### 17.4.2) control_panel_permission_section_matrix

مصفوفة فحص حظر تنفيذ قرارات الأقسام خارج نطاق الصلاحيات:

```yaml
control_panel_permission_section_matrix:
  partners:
    required_role: "partner_admin"
    ui_visibility: "visible for partner_admin only"
    enforced_at: "control-panel-permission-gate"
  catalog:
    required_role: "catalog_manager"
    ui_visibility: "visible for catalog_manager and admins"
    enforced_at: "control-panel-permission-gate"
  finance_or_wlt:
    required_role: "finance_auditor"
    ui_visibility: "visible for finance_auditor only"
    enforced_at: "control-panel-permission-gate"
  verification_status: PASS | FAIL
```

### 17.4.3) control_panel_runtime_route_section_matrix

مصفوفة بوابات مسارات التشغيل لكل قسم:

```yaml
control_panel_runtime_route_section_matrix:
  route_check:
    - path: "/control-panel/partners/:id"
      lazy_loaded: true
      unauthorized_redirect: "/403"
    - path: "/control-panel/stores/:id"
      lazy_loaded: true
      unauthorized_redirect: "/403"
  route_containment_status: PASS | FAIL
  verification_command:
```

### 17.4.4) control_panel_empty_error_blocked_states_matrix

مصفوفة تغطية حالات واجهة الاستجابة (Empty/Error/Blocked/Forbidden) لكل قسم:

```yaml
control_panel_empty_error_blocked_states_matrix:
  states_coverage:
    partners:
      empty_state_present: true
      error_state_present: true
      forbidden_state_present: true
      loading_state_present: true
    stores:
      empty_state_present: true
      error_state_present: true
      forbidden_state_present: true
      loading_state_present: true
  coverage_status: PASS | FAIL
```

---

### 17.5) binding_chain_matrix

أي رحلة فيها backend/API/frontend يجب أن تثبت سلسلة الربط الكاملة:

```text
database -> backend model -> service/domain policy -> route/handler -> OpenAPI -> generated/shared client -> shared brain -> surface UI
```

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

أي حلقة مفقودة أو قفز في السلسلة = `FIX_REQUIRED`.


## Frontend-Backend Parity Matrices

`yaml
frontend_backend_parity_matrix:
  - surface:
    route:
    screen_or_page:
    control:
    user_intent:

    frontend_handler:
    shared_controller:
    generated_client_method:
    openapi_operation_id:

    backend_http_method:
    backend_route:
    backend_handler:
    backend_service:
    repository_method:
    database_tables:

    frontend_request_type:
    openapi_request_schema:
    backend_request_type:
    request_alignment: PASS | FAIL

    backend_response_type:
    openapi_response_schema:
    generated_response_type:
    frontend_view_model:
    response_alignment: PASS | FAIL

    frontend_statuses:
    contract_statuses:
    backend_statuses:
    database_statuses:
    status_alignment: PASS | FAIL

    frontend_permission:
    backend_permission:
    permission_alignment: PASS | FAIL

    frontend_errors:
    contract_errors:
    backend_errors:
    error_alignment: PASS | FAIL

    mutation_effect:
    state_readback:
    affected_surfaces:
    cache_invalidation:
    runtime_test:

    final_status:
      VERIFIED_BOUND | FIXED_AND_VERIFIED | BLOCKED_EXTERNAL_EVIDENCE
`

`yaml
orphan_frontend_feature_matrix:
  - surface:
    feature:
    control_or_route:
    backend_binding_found:
    contract_binding_found:
    database_effect_found:
    action:
`

`yaml
orphan_backend_capability_matrix:
  - endpoint:
    handler:
    service:
    intended_consumers:
    actual_consumers:
    contract_exposed:
    authorization:
    runtime_usage:
    action:
`

> قاعدة: أي زر بلا endpoint صالح، أو endpoint داخل النطاق بلا مستهلك حي أو غرض موثق، يصنف FIX_REQUIRED.
