# Partner SaaS Capability and Isolation Gates

Classification: CONDITIONAL_MANDATORY_ANNEX

Machine-readable source: `governance/saas/saas-governance.json`

Schema: `governance/saas/saas-governance.schema.json`

Canonical decisions: `governance/contracts/decision-vocabulary.json`

## Applies when

Apply this annex when a journey changes partner organizations, partner users, stores, partner-owned operational data, partner permissions, partner financial projections, or trusted operator-context propagation.

## Canonical platform model

```yaml
platform_mode: BTHWANI_NATIVE_PLATFORM
partner_saas_model: EMBEDDED_PLATFORM_CAPABILITY
partner_access_model: MANAGED_B2B_PLATFORM_ACCESS
partner_organization_boundary: BUSINESS_SCOPE_NOT_TENANT
store_boundary: BUSINESS_SCOPE_NOT_TENANT
operator_context_purpose: TRUST_AND_DATA_ISOLATION
trusted_operator_context_required: true
client_supplied_operator_context_trusted: false
```

The machine-readable file is the single source of truth. Partner SaaS is a governed capability set inside the BThwani platform. A partner organization and a store are business authorization scopes, not platform-isolation tenants.

## Ownership boundaries

- Identity owns actors, authentication, sessions, roles, permissions, and trusted operator context.
- Workforce owns professional profiles, employment or service-provider status, assignments, supervision, and readiness.
- DSH owns partner, store, catalog, order, fulfillment, delivery, support, and application-facing financial projections.
- WLT solely owns wallets, ledger entries, payments, refunds, commissions, settlements, payouts, reconciliation, and financial mutation.
- Applications access financial capabilities through the DSH facade and never mutate WLT truth directly.

## Required journey fields

Applicable journeys must identify:

```yaml
partner_scope:
  partner_organization_source:
  store_scope_source:
  trusted_operator_context_source:
  actor_role_and_permission_source:
  object_authorization_rule:
  cross_partner_access_policy:
  financial_projection_owner:
  financial_truth_owner:
```

## Required evidence

Applicable journeys must provide:

- trusted operator-context propagation checks;
- partner-organization and store object-authorization checks;
- negative tests for cross-partner and cross-store access;
- DSH/WLT ownership-boundary checks when financial data is affected;
- contract-to-runtime and generated-client binding checks;
- migration and rollback evidence when persisted ownership changes.

Planning matrices are not runtime evidence by themselves.

## Security rules

- Operator context is derived from trusted identity or server-side delegation.
- Client-supplied context cannot grant or widen authority.
- Partner and store selectors must be validated against actor assignments and permissions.
- Cache keys, idempotency keys, outbox events, audit events, media references, and financial references must preserve the same trusted ownership scope.
- Privileged cross-partner operations require explicit permission, reason, audit, and bounded scope.
- Missing ownership context fails closed for protected operations.

## Partner SaaS capability scope

The governed capability set includes:

- partner organization and user administration;
- store and branch operations;
- catalog and assortment management;
- order preparation and fulfillment;
- partner delivery and captain operations;
- operational and financial projections;
- support, disputes, and audit.

Pricing arrangements such as commission, subscription, hybrid, or operator-managed agreements are partner commercial terms. They do not change the platform isolation model or make a partner or store a tenant.

## Acceptance condition

Accepted when the machine-readable state validates against its schema, partner and store ownership is explicit, trusted context is fail-closed, object authorization prevents cross-scope access, DSH and WLT ownership remains intact, and no runtime or contract introduces a parallel platform-isolation model.
