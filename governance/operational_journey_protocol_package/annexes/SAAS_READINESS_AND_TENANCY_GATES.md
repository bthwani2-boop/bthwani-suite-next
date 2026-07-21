# SaaS Readiness and Tenancy Gates

Classification: CONDITIONAL_MANDATORY_ANNEX
Machine-readable state: `governance/saas/saas-governance.json`
Schema: `governance/saas/saas-governance.schema.json`
Canonical decisions: `governance/contracts/decision-vocabulary.json`

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
saas_readiness_mode: SAAS_READY_DEFERRED
commercial_activation_state: BLOCKED_BY_POLICY
canonical_decision: NEEDS_EVIDENCE
```

`SAAS_READY_DEFERRED` and `BLOCKED_BY_POLICY` are state values, not closure decisions. They never replace the canonical decision vocabulary.

Current meaning:

- Preserve the unified multi-surface full-stack model.
- Add trusted tenant boundaries and isolation where future retrofit would be expensive.
- Do not claim tenant isolation, SaaS readiness, or commercial activation without same-commit evidence.
- Do not add subscriptions, billing, self-service signup, white-labeling, custom domains, marketplace extensions, or database-per-tenant while commercial activation is blocked.

## Tenant Definition

A tenant is the platform operator or organization that owns an isolated operating context.

A tenant is not automatically the same as a Partner, Store, User, City, or Service.

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

Missing `saas_context` for tenant-owned data is `FIX_REQUIRED`.

## Required Matrices

Applicable journeys must complete:

- `tenant_context_propagation_matrix`;
- `tenant_isolation_matrix`;
- `tenant_resource_isolation_matrix`;
- tenant-aware `auth_permission_matrix`;
- tenant-aware `object_authorization_record`;
- WLT tenant financial isolation proof when WLT or financial references are affected.

A matrix is planning or evidence structure only. It does not prove runtime isolation by itself.

## Security Rules

- Tenant context must be derived from trusted identity or session context.
- Client-supplied `tenantId` is never trusted as authority; it may only be a selector validated against trusted authority.
- Privileged operator cross-tenant access requires delegated tenant context, permission, reason, expiry, audit event, and no self-approval.
- Global data must be explicitly classified as `GLOBAL`; unexplained null tenant ownership is forbidden.
- Cache keys, idempotency keys, outbox events, audit events, media references, and financial references must carry or derive the same trusted tenant boundary when tenant-owned.
- Cross-tenant negative tests and independent isolation-security approval are mandatory before any isolation claim.

## Deferred Commercial Features

Do not build or activate in `SAAS_READY_DEFERRED` mode:

- commercial subscription billing;
- paid plan matrix;
- self-service tenant signup;
- white-label customization;
- custom domains;
- per-tenant deployment;
- marketplace extensions;
- automated invoicing;
- complex usage metering;
- database-per-tenant;
- multi-region tenant placement.

Adding one of these features requires an explicit Product Truth contract, SaaS impact declaration, architecture approval, security and finance impact routing, and formal SDLC evidence.

## Activation Gate

Commercial SaaS activation requires all of the following on the same immutable commit and environment:

```yaml
saas_activation_gate:
  tenant_owned_entities_classified: PROVEN
  tenant_context_propagation_verified: PROVEN
  cross_tenant_negative_tests_passed: PROVEN
  cross_tenant_data_leakage_zero: PROVEN
  critical_vulnerabilities_zero: PROVEN
  unaccepted_high_vulnerabilities_zero: PROVEN
  tenant_backup_restore_verified: PROVEN
  tenant_export_deletion_verified: PROVEN
  per_tenant_observability_available: PROVEN
  quotas_noisy_neighbor_protection_verified: PROVEN
  wlt_tenant_financial_isolation_verified: PROVEN
  independent_security_review_passed: PROVEN
  incident_and_rollback_runbooks_verified: PROVEN
  legal_privacy_commercial_model_approved: PROVEN
```

The readiness state may then move to `SAAS_ACTIVE` and the commercial activation state to `ACTIVE` only when the requested SDLC journey also reaches the applicable canonical decision. The state transition itself is not a decision.

Allowed canonical decisions for this annex:

```text
PASS
FIX_REQUIRED
NEEDS_EVIDENCE
BLOCKED_EXTERNAL
PROTOCOL_VIOLATION
CLOSED_WITH_EVIDENCE
```

`PASS` is scope-specific. `CLOSED_WITH_EVIDENCE` remains subject to every applicable product, runtime, QA, security, finance, isolation, governance, CI, release, and production scope.

## Acceptance condition

Accepted only when the machine-readable SaaS state validates against its schema, applicable tenant boundaries and security rules are traceable to live code or explicit planned scope, deferred commercial constraints remain enforced, every readiness state is distinct from the canonical decision, and commercial activation cannot occur without complete same-commit evidence and independent approvals.
