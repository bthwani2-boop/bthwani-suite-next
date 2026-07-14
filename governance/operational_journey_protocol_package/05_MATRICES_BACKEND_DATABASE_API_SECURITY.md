# 05 — مصفوفات backend/database/API/SSOT/visibility/auth/risk

**Package:** Unified Operational Journey Protocol — v3 modular strict + Amendment v2
**File:** `05 of 12`
**Repository:** `<REPO_REMOTE>`
**Remote ref:** `<REF>`
**Source path:** governance/operational_journey_protocol_package (self-contained)
**GitHub file SHA observed:** `<RESOLVED_COMMIT_SHA>`
**Scope:** مصفوفات طبقات الباك إند، قاعدة البيانات، API client، SSOT، الظهور، الصلاحيات، والاختبار المستند إلى المخاطر.

> قاعدة حاكمة: هذا الملف جزء من حزمة واحدة مكوّنة من 12 ملفًا. لا يُستخدم منفردًا لإعلان PASS. أي قبول يجب أن يرجع إلى `00_INDEX_AND_COVERAGE.md` ثم يطبّق كل الملفات ذات العلاقة، بما فيها `10_EXECUTION_PLAN_NO_SKIP_GATE.md` و`11_CODE_FIRST_FULLSTACK_SURFACE_COVERAGE_MODE.md`.

---

## 17) matrices إلزامية — تابع

### 17.5) backend_layer_matrix

```yaml
backend_layer_matrix:
  routes:
    paths:
    owns:
    must_not_own:
    verification_command:
  auth_middleware:
    paths:
    owns:
    must_not_own:
    verification_command:
  handlers:
    paths:
    owns:
    must_not_own:
    verification_command:
  validation:
    paths:
    owns:
    must_not_own:
    verification_command:
  services:
    paths:
    owns:
    must_not_own:
    verification_command:
  domain_policy:
    paths:
    owns:
    must_not_own:
    verification_command:
  repositories:
    paths:
    owns:
    must_not_own:
    verification_command:
  transactions:
    paths:
    owns:
    must_not_own:
    verification_command:
  migrations:
    paths:
    owns:
    must_not_own:
    verification_command:
  audit_events:
    paths:
    owns:
    must_not_own:
    verification_command:
  error_mapping:
    paths:
    owns:
    must_not_own:
    verification_command:
```

قواعد:

- routes لا تملك business logic.
- handler لا يملك business decision النهائي إذا كان هناك service/domain policy.
- repository لا يملك lifecycle decision.
- service/domain policy يملك القرار التشغيلي.
- error mapping يجب أن يطابق contract.
- أي خلط طبقي بلا سبب موثق = `FIX_REQUIRED`.

---

### 17.6) database_truth_matrix

```yaml
database_truth_matrix:
  tables:
    - name:
      classification: CANONICAL | READ_MODEL | PROJECTION | LEGACY_TO_RETIRE | BUG
      schema_path:
      verification_command:
  migrations:
    - migration_file:
      status: PRESENT | MISSING | OUTDATED | BROKEN | NOT_REQUIRED
      verification_command:
  frontend_backend_type_alignment:
    db_model_path:
    backend_model_path:
    openapi_schema_path:
    frontend_type_path:
    alignment_status: PASS | FAIL
    verification_command:
```

قواعد:

- أي حقيقة تشغيلية يجب أن تمتلك مصدرًا واحدًا فقط.
- أي جدول ثانٍ لنفس الحقيقة يجب تصنيفه.
- أي اختلاف بين database constraints وbackend model وOpenAPI schema وfrontend types = `FIX_REQUIRED`.

---

### 17.6.1) partner_store_database_truth_matrix

إلزامي كلما دخل Partner أو Store في database في نطاق الرحلة.

```yaml
partner_store_database_truth_matrix:
  partner_truth:
    canonical_table:
    required_columns:
    forbidden_columns:
    lifecycle_status_columns:
    verification_command:
  store_truth:
    canonical_table:
    required_columns:
    forbidden_columns:
    publication_visibility_columns:
    verification_command:
  relationship_truth:
    canonical_join:
    nullable_allowed_for_legacy: true | false
    nullable_allowed_for_new_onboarding: true | false
    backfill_required: true | false
    verification_command:
  duplicate_truth_check:
    duplicate_partner_identity_in_store: PASS | FAIL
    duplicate_store_visibility_in_partner: PASS | FAIL
    duplicate_activation_status: PASS | FAIL
    required_action:
```

قواعد:

- partner identity لا تُكرر داخل store إلا كـ denormalized read model موثق.
- store visibility لا تُحكم من Partner وحده إذا كان endpoint يعرض stores.
- أي جدولين يملكان نفس lifecycle أو visibility بدون owner واحد = `FIX_REQUIRED`.

---

### 17.7) api_client_policy_matrix

```yaml
api_client_policy_matrix:
  contract_path:
  client_generation_enabled: true | false
  generated_client_path:
  shared_client_path:
  manual_fetch_used: true | false
  manual_fetch_justification:
  contract_type_alignment: PASS | FAIL
  error_mapping_alignment: PASS | FAIL
  verification_command:
```

قواعد:

- generated client هو الأصل عند وجود OpenAPI client generation.
- shared manual client مسموح فقط بسبب موثق.
- direct fetch داخل shared api.ts يجب أن يكون adapter معزولًا بلا business logic.
- fetch/axios داخل surface = `FIX_REQUIRED`.
- any difference between OpenAPI and client types = `FIX_REQUIRED`.

---

### 17.8) ssot_matrix

```yaml
ssot_matrix:
  - truth_name:
    canonical_owner:
    canonical_path:
    consumers:
      - path:
    duplicate_sources:
      - path:
    conflict_status: PASS | FAIL
    required_action:
    verification_command:
```

أي مصدرين لنفس status, permission, lifecycle, readiness, visibility, financial reference, or operational truth = `FIX_REQUIRED`.

---

### 17.9) publishability_visibility_matrix

```yaml
publishability_visibility_matrix:
  - entity:
    final_state_required:
    backend_filters:
    database_fields:
    readiness_flags:
    approval_flags:
    serviceability_flags:
    catalog_or_content_flags:
    marketing_visibility_flags:
    api_query_path:
    api_response_schema:
    surface_rendering_path:
    positive_case_visible: PASS | FAIL
    negative_case_hidden: PASS | FAIL
    verification_command:
```

قاعدة حاكمة: approved أو active وحدها لا تكفي. كل بوابة ظهور يجب إثباتها بالكامل.

---

### 17.9.1) store_client_visibility_gate_matrix

إلزامي كلما دخل عرض Store للعميل في نطاق الرحلة.

```yaml
store_client_visibility_gate_matrix:
  listDshStores:
    must_filter_by_partner_readiness: true
    must_filter_by_store_status: true
    must_filter_by_catalog_approval: true
    must_filter_by_serviceability: true
    must_filter_by_marketing_visibility: true
    must_hide_when_partner_deactivated: true
    must_hide_when_client_hidden: true
    must_filter_by_permissions: true
    must_hide_when_deleted_or_suspended: true
    verification_command: "git grep -n 'listDshStores'"
  getDshHomeDiscovery:
    must_filter_by_partner_readiness: true
    must_filter_by_store_status: true
    must_filter_by_catalog_approval: true
    must_filter_by_serviceability: true
    must_filter_by_marketing_visibility: true
    must_hide_when_partner_deactivated: true
    must_hide_when_client_hidden: true
    must_filter_by_permissions: true
    must_hide_when_deleted_or_suspended: true
    verification_command: "git grep -n 'getDshHomeDiscovery'"
  getDshStoreById:
    same_visibility_policy_as_list: true
    verification_command: "git grep -n 'getDshStoreById'"
```

بوابات الظهور الإلزامية (Visibility Gates):

1. partner readiness (جاهزية الشريك للتشغيل)
2. partner active/approved state (اعتماد وتفعيل الشريك)
3. store publication status (حالة نشر المتجر)
4. store client visibility flag (علامة ظهور المتجر للعملاء)
5. catalog/content readiness (جاهزية كتالوج المنتجات)
6. serviceability (التغطية الجغرافية والتوصيلية للمتجر)
7. marketing visibility (الحالة التسويقية والظهور في البحث)
8. permissions (صلاحيات الوصول)
9. not deleted / not suspended (عدم حذف أو إيقاف الشريك أو المتجر)
10. same visibility policy for list/get/discovery endpoints (تطابق الفلترة بين جميع نقاط الوصول للعميل)

قاعدة حاكمة: كل endpoint يعرض Stores للعميل يجب أن يطبق نفس بوابات الظهور. لا يكفي أن يكون `listDshStores` صحيحًا إذا كان `getDshHomeDiscovery` أو `getDshStoreById` يتجاوز نفس البوابات.

---

### 17.10) auth_permission_matrix

```yaml
auth_permission_matrix:
  - actor:
    role:
    surface:
    backend_auth_middleware:
    backend_enforcement_path:
    frontend_guard_path:
    actor_session_mapping:
    role_to_surface_mapping:
    allowed_actions:
    forbidden_actions:
    forbidden_states:
    forbidden_role_test: PASS | FAIL
    unauthenticated_case: PASS | FAIL
    forbidden_case: PASS | FAIL
    ui_401_403_handling: PASS | FAIL
    audit_required: true | false
    permission_source_owner:
    verification_command:
```

قواعد:

- permission truth لا تكون داخل UI surface.
- role policy لا تكون داخل UI surface.
- UI يعرض الحالة، ولا يملك القرار.

---

### 17.11) risk_based_test_matrix

```yaml
risk_based_test_matrix:
  - risk: "state_machine_changed"
    affected_layer: "shared_brain"
    failure_mode: "invalid transitions or state lockups"
    minimum_test: "unit test for state transitions"
    runtime_smoke_required: true
    guard_required: "guard:unified-fullstack-brain"
    priority: "P0"
    verification_command: "pnpm run test"
  - risk: "api_contract_changed"
    affected_layer: "contracts / backend / client"
    failure_mode: "broken JSON payload structure or missing fields"
    minimum_test: "contract check & generated types compilation check"
    runtime_smoke_required: true
    guard_required: "guard:no-broken-imports"
    priority: "P0"
    verification_command: "pnpm run typecheck"
  - risk: "database_changed"
    affected_layer: "database migrations / models"
    failure_mode: "broken queries or null constraint violations"
    minimum_test: "migration dry-run and model integration test"
    runtime_smoke_required: true
    guard_required: "guard:matrix:v3"
    priority: "P0"
    verification_command: "pnpm run foundation:gate"
  - risk: "permission_changed"
    affected_layer: "backend_auth_middleware / shared_brain"
    failure_mode: "unauthorized action execution or privilege escalation"
    minimum_test: "unit test for unauthorized actors & 403 response check"
    runtime_smoke_required: true
    guard_required: "guard:dsh-frontend-shared-boundary-imports"
    priority: "P1"
    verification_command: "pnpm run test"
  - risk: "visibility_changed"
    affected_layer: "backend query filters"
    failure_mode: "inactive or unapproved store shown to client"
    minimum_test: "negative visibility gate smoke test"
    runtime_smoke_required: true
    guard_required: "guard:no-preview-demo-mock-runtime"
    priority: "P0"
    verification_command: "pnpm run test"
  - risk: "financial_reference_changed"
    affected_layer: "wlt_for_dsh / finance_or_wlt"
    failure_mode: "financial mutation executed in DSH scope"
    minimum_test: "strict code inspection for mutation APIs"
    runtime_smoke_required: false
    guard_required: "guard:no-financial-mutation-outside-wlt"
    priority: "P0"
    verification_command: "pnpm run guard:no-financial-mutation-outside-wlt"
```

قواعد:

- غياب اختبار مناسب لخطر داخل النطاق = `FIX_REQUIRED`.


## Contract and State Traceability Matrices

```yaml
contract_field_traceability_matrix:
  - business_field:
    database_column:
    backend_domain_field:
    backend_transport_field:
    openapi_field:
    generated_client_field:
    frontend_view_model_field:
    ui_render_or_input:
    direction: READ | WRITE | READ_WRITE
    transformations:
    validation:
    alignment: PASS | FAIL
```

```yaml
request_response_alignment_matrix:
  - operation_id:
    frontend_request:
    generated_request:
    openapi_request:
    backend_decoder:
    backend_validator:
    service_input:
    request_alignment:

    repository_result:
    service_output:
    backend_response:
    openapi_response:
    generated_response:
    frontend_adapter:
    response_alignment:
```

```yaml
state_status_alignment_matrix:
  - entity:
    database_states:
    backend_states:
    contract_enums:
    generated_client_enums:
    shared_frontend_states:
    surface_labels:
    transition_owner:
    mismatch_count:
    result:
```

```yaml
error_semantics_alignment_matrix:
  - operation:
    backend_error:
    http_status:
    contract_error_code:
    generated_client_behavior:
    shared_controller_mapping:
    surface_state:
    retry_allowed:
    result:
```
