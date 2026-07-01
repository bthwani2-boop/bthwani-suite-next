# 05 — مصفوفات backend/database/API/SSOT/visibility/auth/risk

**Package:** Unified Operational Journey Protocol — v3 modular strict  
**File:** `05/09`  
**Repository:** `<REPO_REMOTE>`  
**Remote ref:** `<REF>`  
**Source path:** `tools/plan/command_operational_journey_unified`  
**GitHub file SHA observed:** `<RESOLVED_COMMIT_SHA>`  
**Scope:** مصفوفات طبقات الباك إند، قاعدة البيانات، API client، SSOT، الظهور، الصلاحيات، والاختبار المستند إلى المخاطر.

> قاعدة حاكمة: هذا الملف جزء من حزمة واحدة مكوّنة من 11 ملفًا (بعد إضافة Amendment). لا يُستخدم منفردًا لإعلان PASS. أي قبول يجب أن يرجع إلى `00_INDEX_AND_COVERAGE.md` ثم يطبّق كل الملفات ذات العلاقة، بما فيها `10_EXECUTION_PLAN_NO_SKIP_GATE.md`.

---
## 17) matrices إلزامية — تابع

### 17.5 backend_layer_matrix

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

### 17.6 database_truth_matrix

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

### 17.6.1 partner_store_database_truth_matrix

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

### 17.7 api_client_policy_matrix

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
- أي اختلاف بين OpenAPI وclient types = `FIX_REQUIRED`.

### 17.8 ssot_matrix

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

أي مصدرين لنفس:

```text
status
permission
lifecycle
readiness
visibility
financial reference
operational truth
```

= `FIX_REQUIRED`.

### 17.9 publishability_visibility_matrix

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

قاعدة حاكمة:

```text
approved أو active وحدها لا تكفي. كل بوابة ظهور يجب إثباتها.
```

### 17.9.1 store_client_visibility_gate_matrix

إلزامي كلما دخل عرض Store للعميل في نطاق الرحلة.

```yaml
store_client_visibility_gate_matrix:
  listDshStores:
    must_filter_by_partner_readiness:
    must_filter_by_store_status:
    must_filter_by_catalog_approval:
    must_filter_by_serviceability:
    must_filter_by_marketing_visibility:
    must_hide_when_partner_deactivated:
    must_hide_when_client_hidden:
    verification_command:
  getDshHomeDiscovery:
    must_filter_by_partner_readiness:
    must_filter_by_store_status:
    must_filter_by_catalog_approval:
    must_filter_by_serviceability:
    must_filter_by_marketing_visibility:
    must_hide_when_partner_deactivated:
    must_hide_when_client_hidden:
    verification_command:
  getDshStoreById:
    same_visibility_policy_as_list:
    verification_command:
```

قاعدة حاكمة:

كل endpoint يعرض Stores للعميل يجب أن يطبق نفس بوابات الظهور. لا يكفي أن يكون `listDshStores` صحيحًا إذا كان `getDshHomeDiscovery` أو `getStoreById` يتجاوز نفس البوابات.

### 17.10 auth_permission_matrix

```yaml
auth_permission_matrix:
  - actor:
    role:
    surface:
    backend_auth_middleware:
    actor_session_mapping:
    role_to_surface_mapping:
    allowed_actions:
    forbidden_actions:
    forbidden_role_test: PASS | FAIL
    unauthenticated_case: PASS | FAIL
    forbidden_case: PASS | FAIL
    ui_401_403_handling: PASS | FAIL
    permission_source_owner:
    verification_command:
```

قواعد:

- permission truth لا تكون داخل UI surface.
- role policy لا تكون داخل UI surface.
- UI يعرض الحالة، ولا يملك القرار.

### 17.11 risk_based_test_matrix

```yaml
risk_based_test_matrix:
  state_machine_changed:
    affected: true | false
    test_path:
    verification_command:
  api_contract_changed:
    affected: true | false
    test_path:
    verification_command:
  database_changed:
    affected: true | false
    test_path:
    verification_command:
  permission_changed:
    affected: true | false
    test_path:
    verification_command:
  visibility_changed:
    affected: true | false
    test_path:
    verification_command:
  financial_reference_changed:
    affected: true | false
    test_path:
    verification_command:
  multi_surface_changed:
    affected: true | false
    test_path:
    verification_command:
  runtime_bootstrap_changed:
    affected: true | false
    test_path:
    verification_command:
  guard_or_tooling_changed:
    affected: true | false
    test_path:
    verification_command:
```

غياب test مناسب لخطر داخل النطاق = `FIX_REQUIRED`.
