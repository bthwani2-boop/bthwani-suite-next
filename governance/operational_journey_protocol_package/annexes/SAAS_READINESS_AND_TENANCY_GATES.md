# SaaS Readiness and Tenancy Gates

Classification: CONDITIONAL_MANDATORY_ANNEX

Machine-readable state: `governance/saas/saas-governance.json`

Schema: `governance/saas/saas-governance.schema.json`

Activation authorization: `governance/saas/activation-authorization.json`

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

## Current Mode — SINGLE SOURCE OF TRUTH IS THE MACHINE-READABLE FILE

**Zero-ambiguity rule: this prose block must always match `governance/saas/saas-governance.json` exactly. If they ever disagree, the JSON file wins and this file is stale and must be corrected immediately — never the reverse.**

```yaml
platform_mode: BTHWANI_NATIVE_PLATFORM
saas_readiness_mode: SAAS_READY_DEFERRED
commercial_activation_state: ELIGIBLE_FOR_REVIEW
activation_authorization_status: AUTHORIZED
activation_authorization_target_ref: lianbassam
production_deployment_authorized: false
canonical_decision: NEEDS_EVIDENCE
source_of_truth: governance/saas/saas-governance.json
```

Read this as three distinct, non-interchangeable facts — do not collapse them into one claim:

1. **Authorization exists, and its scope now covers doing the work, not only assessing it.** `governance/saas/activation-authorization.json` records `status: AUTHORIZED` for target ref `lianbassam` (dated 2026-07-23), scoped to `ENABLE_SAAS_RUNTIME_MODE`, `REMOVE_COMMERCIAL_ACTIVATION_POLICY_BLOCK`, `EXECUTE_SAAS_ACTIVATION_VERIFICATION`. On 2026-07-24 the user explicitly widened that scope with `EXECUTE_SAAS_IMPLEMENTATION_WORK` and `EXECUTE_SAAS_ACTIVATION_WORK` (see `scopeAmendment` in that file): this is no longer readiness-assessment-only, engineering may actively build tenant isolation and activation-gate capability, not merely evaluate it. This scope widening does **not** by itself change `commercialActivationState`, `saasReadinessMode`, or any `activationEvidence` item below — those still move only when each has same-commit proof.
2. **Runtime mode is NOT yet flipped.** `governance/saas/saas-governance.json` (commit `4e0ba605`, `fix(governance): separate authorization from SaaS activation state` — the current and newest state on this file) deliberately keeps `saasReadinessMode: SAAS_READY_DEFERRED`. Authorization to proceed is not the same event as declaring the platform SaaS-active. Do not read authorization as if it already means `SAAS_ACTIVE`.
3. **Commercial state is `ELIGIBLE_FOR_REVIEW`**, not `ACTIVATION_AUTHORIZED` and not `ACTIVE`. That earlier, more advanced-sounding label was walked back by the same commit for exactly this reason: it over-claimed relative to unproven evidence (`activationEvidence` in the JSON lists every gate item as `NOT_PROVEN`).

An earlier version of this annex (commit `babf91d0`) stated `saas_readiness_mode: SAAS_ACTIVE` and `commercial_activation_state: ACTIVATION_AUTHORIZED`. That was superseded by the later JSON correction and is now corrected here. Any other governance document, prompt template, or agent output still citing `SAAS_ACTIVE` or `ACTIVATION_AUTHORIZED` as the current state is citing stale information and must be corrected before use.

State values never replace the canonical decision vocabulary. Neither `SAAS_READY_DEFERRED` nor `ELIGIBLE_FOR_REVIEW` by itself proves production isolation, security, financial separation, or commercial release readiness — every item in `activationEvidence` is still `NOT_PROVEN`.

Current rules:

- SaaS work in this repository is authorized as **implementation and activation engineering**, not merely readiness preparation or planning (`activation-authorization.json` §`scopeAmendment`, 2026-07-24). Do not downgrade a SaaS-touching journey to documentation/planning-only when the scope explicitly authorizes writing the actual tenant-isolation and activation code.
- Preserve the unified multi-surface full-stack model.
- Derive tenant context from trusted identity or server-side delegation.
- Never trust a client-supplied tenant identifier as authority.
- Do not mark any evidence `PROVEN` without same-commit proof.
- Do not deploy production from this authorization because `productionDeploymentAuthorized` is false.
- Keep deferred commercial capabilities disabled until each has Product Truth, architecture, security, finance, and SDLC approval.
- Default a journey's `saas_context.mode` to `NOT_APPLICABLE` unless the journey actually touches tenant ownership, tenant isolation, cross-tenant access, subscriptions, entitlements, metering, tenant billing, tenant lifecycle, white-labeling, custom domains, or commercial SaaS activation — do not auto-expand an unrelated journey into a SaaS-readiness project just because this annex exists.
- Record `NOT_APPLICABLE` with a stated technical reason (`NOT_AFFECTED_WITH_REASON`) rather than leaving `saas_context` blank; a blank `saas_context` on a journey that does touch tenant-owned data is `FIX_REQUIRED`.
- Never output or accept `SAAS_ACTIVE` or `SAAS_ACTIVATION_APPROVED` as the current platform state — the current, single-source-of-truth state is `SAAS_READY_DEFERRED` / `ELIGIBLE_FOR_REVIEW` as recorded above. Only `governance/saas/saas-governance.json` itself, edited under explicit authorization, can change this.
- Commercial/production SaaS activation is never implied by completing an unrelated implementation journey; it requires the full `saas_activation_gate` in the ACTIVE section below, evaluated on its own same-commit evidence.

## Tenant Definition

A tenant is the platform operator or organization that owns an isolated operating context.

A tenant is not automatically the same as a Partner, Store, User, City, or Service.

Expected relationship:

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
- Cross-tenant negative tests and independent isolation-security approval are mandatory before production isolation claims.

## Deferred Commercial Features

The following remain deferred even though SaaS runtime mode is active:

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

Adding one requires an explicit Product Truth contract, SaaS impact declaration, architecture approval, security and finance routing, and formal SDLC evidence.

## Activation States

### ACTIVATION_AUTHORIZED

This state means:

- the previous policy block is removed;
- SaaS runtime mode is enabled;
- verification work may execute immediately;
- production deployment is not authorized unless separately recorded;
- unresolved evidence remains visible and cannot be rewritten as proven.

### ACTIVE

Commercial production activation requires all of the following on the same immutable commit and environment:

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

Only then may `commercialActivationState` move to `ACTIVE`, `productionDeploymentAuthorized` become true under separate authorization, and the applicable canonical decision become `CLOSED_WITH_EVIDENCE`.

Allowed canonical decisions:

```text
PASS
FIX_REQUIRED
NEEDS_EVIDENCE
BLOCKED_EXTERNAL
PROTOCOL_VIOLATION
CLOSED_WITH_EVIDENCE
```

## Acceptance Condition

Accepted when machine-readable SaaS state validates against its schema, explicit activation authorization is traceable, SaaS runtime mode is enabled, tenant boundaries remain enforced, deferred features remain controlled, and no production or evidence claim exceeds the proof available on the same commit.
