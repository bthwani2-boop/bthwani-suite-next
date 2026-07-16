# SaaS Readiness and Tenancy Gates

Classification: CONDITIONAL_MANDATORY_ANNEX

## Applies When

Apply this annex when any condition is true:

```yaml
applies_when:
  - saas_impact != NONE
  - tenant_owned_data == true
  - cross_tenant_operation == true
  - future_saas_boundary_affected == true
```

## Current Mode

```yaml
platform_mode: BTHWANI_NATIVE_PLATFORM
saas_readiness: SAAS_READY_DEFERRED
commercial_saas_activation: BLOCKED_BY_POLICY
```

Meaning:

- Preserve the unified multi-surface full-stack model.
- Add tenant boundaries and isolation where future SaaS would be expensive to retrofit.
- Do not add commercial SaaS features such as subscriptions, billing, self-service signup, white-labeling, custom domains, or database-per-tenant in this mode.

## Tenant Definition

Tenant is the platform operator or organization that owns an isolated operating context.

Tenant is not automatically the same as Partner, Store, User, City, or Service.

Expected future relationship:

```text
Tenant / Platform Operator
one or many Partners
one or many Stores
Actors, customers, captains, field users, and operators
```

## Required Topic Fields

Applicable journeys must define `saas_context` in `topic_definition` with:

```yaml
saas_context:
  mode: NOT_APPLICABLE | SAAS_READY_DEFERRED | SAAS_ACTIVE
  tenant_entity_defined: true | false
  tenant_context_source:
  tenant_selection_authority:
  tenant_owned_entities:
  global_entities:
  tenant_isolation_model:
  cross_tenant_access_policy:
  privileged_cross_tenant_workflow:
  tenant_data_classification:
  tenant_data_residency:
  tenant_export_required: true | false
  tenant_deletion_required: true | false
  tenant_backup_restore_required: true | false
  tenant_observability_required: true | false
  tenant_quota_required: true | false
  entitlement_impact: NONE | READ_ONLY | REQUIRED
  subscription_impact: NONE | READ_ONLY | REQUIRED
  metering_impact: NONE | READ_ONLY | REQUIRED
  billing_impact: NONE | READ_ONLY | REQUIRED
  saas_activation_gate_required: true | false
```

Missing `saas_context` for tenant-owned data returns `FIX_REQUIRED`.

## Required Matrices

Applicable journeys must complete:

- `tenant_context_propagation_matrix`
- `tenant_isolation_matrix`
- `tenant_resource_isolation_matrix`
- tenant-aware `auth_permission_matrix`
- tenant-aware `object_authorization_record`
- WLT tenant financial isolation proof when WLT or financial references are affected

## Security Rules

- Tenant context must be derived from trusted identity/session context.
- Client-supplied `tenantId` is not trusted unless it is only a selector validated against trusted authority.
- Privileged operator cross-tenant access requires delegated tenant context, permission, reason, expiry, audit event, and no self-approval.
- Global data must be explicitly classified as `GLOBAL`; unexplained null tenant ownership is forbidden.

## Deferred Features

Do not build in `SAAS_READY_DEFERRED` mode:

- commercial subscription billing
- paid plan matrix
- self-service tenant signup
- white-label customization
- custom domains
- per-tenant deployment
- marketplace extensions
- automated invoicing
- complex usage metering
- database-per-tenant
- multi-region tenant placement

## Activation Gate

Commercial SaaS activation requires:

```yaml
saas_activation_gate:
  tenant_owned_entities_classified: true
  tenant_context_propagation_verified: true
  cross_tenant_negative_tests_passed: true
  cross_tenant_data_leakage: 0
  critical_vulnerabilities: 0
  unaccepted_high_vulnerabilities: 0
  tenant_backup_restore_verified: true
  tenant_export_deletion_verified: true
  per_tenant_observability_available: true
  quotas_noisy_neighbor_protection_verified: true
  wlt_tenant_financial_isolation_verified: true
  independent_security_review_passed: true
  incident_and_rollback_runbooks_verified: true
  legal_privacy_commercial_model_approved: true
```

Allowed decisions:

```text
SAAS_ACTIVATION_APPROVED
SAAS_READY_DEFERRED
FIX_REQUIRED
HARD_BLOCKED_EXTERNAL_ONLY
```

## Acceptance condition

Accepted only when applicable tenant boundaries, isolation matrices, security rules, deferred commercial constraints, and activation decision are explicit and traceable to live code or planned governance scope.
