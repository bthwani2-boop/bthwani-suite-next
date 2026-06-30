# DSH Service Blueprint

Status: ACTIVE_RUNTIME_BLUEPRINT
Current Runtime Stage: DSH-015_PARTNER_STORE_ACTIVATION_RUNTIME_VERIFIED
Closure State: RUNTIME_VERIFIED
Contract: `contracts/dsh.openapi.yaml`
Runtime Port: `58080` (container internal: `8080`)

## Purpose

DSH owns operational commerce and delivery truth: store discovery, home discovery, catalog, cart, serviceability, checkout intent, order fulfillment, dispatch, field readiness, support, operational analytics, policies, administration, and partner store activation.

WLT exclusively owns wallet, payment, refund, settlement, payout, commission, COD financial truth, ledger, reconciliation, and finance reporting. DSH may expose operational/visibility views that reference financial state, but financial mutation and provider access remain WLT-owned.

## Current Runtime Truth

This blueprint reflects the current DSH runtime map and surface map. It replaces the old `SLICE_002_IMPLEMENTED` state.

The active runtime capabilities are:

- DSH-001 — Store Discovery and system readiness: verified.
- DSH-002 — Home Discovery: verified.
- DSH-003 — Catalog Management: verified.
- DSH-004 — Cart and Serviceability: verified.
- DSH-005 — Checkout Intent and WLT Handoff: verified.
- DSH-006 — Order Fulfillment and partner acceptance: verified.
- DSH-007 — Dispatch and Captain Delivery: verified.
- DSH-008 — Field Verification and Store Quality Assurance: verified.
- DSH-009 — Support, Incidents, and Escalation Room: verified.
- DSH-010 — Platform Analytics and Operational Reporting: verified.
- DSH-011 — Notifications and Actor Communication: verified.
- DSH-012 — Marketing Command Deck: verified.
- DSH-013 — Platform Policies and Service Area Management: verified.
- DSH-014 — Administration, Roles, and Activation: verified.
- DSH-015 — Partner Store Activation: verified.

## Active Surfaces

All DSH primary surfaces are active runtime surfaces:

- `app-client` — consumer store discovery, home discovery, catalog, cart, checkout, orders, and tracking.
- `app-partner` — partner store context, catalog, order handling, readiness, support, and performance visibility.
- `app-captain` — captain assignment, pickup, delivery lifecycle, and proof of delivery.
- `app-field` — field verification, onboarding evidence, readiness checks, visits, and escalations.
- `control-panel` — operator governance, home discovery administration, catalog approval, carts, checkout intents, orders, dispatch, readiness, support, analytics, policies, administration, and partner activation oversight.

## Active Contract Operations

### System and Store Discovery

- `getDshHealth`
- `getDshReadiness`
- `listDshStores`
- `getDshStore`

### Home Discovery

- `getDshHomeDiscovery`
- `listOperatorHomeDiscoveryContent`
- `createOperatorHomeDiscoveryContent`
- `updateOperatorHomeDiscoveryContent`
- `deleteOperatorHomeDiscoveryContent`

### Catalog Management

- `getPublishedDshCatalog`
- `getPartnerDshCatalog`
- `createPartnerCatalogCategory`
- `updatePartnerCatalogCategory`
- `deletePartnerCatalogCategory`
- `createPartnerCatalogProduct`
- `updatePartnerCatalogProduct`
- `deletePartnerCatalogProduct`
- `createPartnerCatalogMediaUploadIntent`
- `completePartnerCatalogMedia`
- `deletePartnerCatalogMedia`
- `submitPartnerCatalog`
- `listOperatorCatalogSubmissions`
- `decideOperatorCatalogSubmission`
- `listOperatorCatalogAudit`

### Cart and Serviceability

- `getDshClientCart`
- `upsertDshCartItem`
- `removeDshCartItem`
- `clearDshCart`
- `checkDshCartServiceability`
- `listOperatorCarts`

### Checkout Intent and WLT Handoff

- `createDshCheckoutIntent`
- `getDshCheckoutIntent`
- `cancelDshCheckoutIntent`
- `listOperatorCheckoutIntents`

### Orders

- `createDshOrder`
- `listDshClientOrders`
- `getDshClientOrder`
- `listDshPartnerOrders`
- `acceptDshOrder`
- `rejectDshOrder`
- `markDshOrderPreparing`
- `markDshOrderReadyForPickup`
- `listDshOperatorOrders`

### Dispatch and Delivery Lifecycle

- `listDshDispatchAssignments`
- `createDshAssignment`
- `listDshCaptainAssignments`
- `acceptDshAssignment`
- `declineDshAssignment`
- `updateDshDeliveryStatus`
- `submitDshPoD`
- `getDshClientOrderTracking`

### Field Readiness

- `createDshFieldVisit`
- `listDshFieldVisits`
- `completeDshFieldVisit`
- `upsertDshReadinessCheck`
- `listDshVisitChecks`
- `createDshReadinessEscalation`
- `listDshOperatorEscalations`
- `updateDshOperatorEscalation`
- `getDshPartnerOnboardingStatus`

### Support and Incidents

- `createDshSupportTicket`
- `listDshMyTickets`
- `getDshSupportTicket`
- `addDshTicketMessage`
- `listDshTicketMessages`
- `listDshOperatorTickets`
- `updateDshOperatorTicket`
- `createDshIncident`
- `listDshIncidents`
- `updateDshIncident`

### Analytics and Operational Reporting

- `getDshPlatformKpis`
- `getDshOrderAnalytics`
- `getDshDeliveryAnalytics`
- `getDshSupportAnalytics`
- `getDshStoreAnalytics`
- `getDshPartnerPerformance`

### Partner Store Activation

- `listDshPartners`
- `createDshPartner`
- `getDshPartner`
- `transitionDshPartner`
- `getDshPartnerReadiness`
- `listDshPartnerDocuments`
- `addDshPartnerDocument`
- `reviewDshPartnerDocument`
- `listDshPartnerStores`
- `linkDshPartnerStore`
- `listDshPartnerAuditEvents`
- `listDshPartnerFieldVisits`
- `getDshPartnerActivationStatus`
- `getDshPartnerSelfReadiness`
- `createFieldPartnerDraft`
- `getFieldPartnerDraft`
- `updateFieldPartnerDraft`
- `uploadFieldPartnerDocument`
- `createFieldPartnerVisit`
- `submitFieldPartnerDraft`

## Runtime Readiness Requirements

A DSH capability is not considered closed by this blueprint unless all relevant evidence is true:

- Backend runtime is implemented and reachable.
- Database schema and seed/runtime data are available where the capability needs persistence.
- Generated API client is available and used by frontend runtime code.
- Shared frontend controllers own business behavior before app-specific UI shells consume it.
- Screens are bound to the runtime path, not preview/demo/mock data.
- Cross-surface behavior is visible where the slice requires more than one actor.
- Guards pass for imports, direct fetch boundaries, preview/mock runtime ban, and WLT/DSH financial ownership.

## Security Boundary

Public read endpoints may be anonymous only when the contract explicitly marks them public.

All mutating, actor-scoped, operator, partner, captain, field, support, policy, administration, and activation operations require authenticated actor context.

Financial provider access, ledger mutation, wallet balance mutation, settlement, payout, refund, commission, and reconciliation are not owned by DSH. Those remain WLT responsibilities.

## Evidence Locations

Runtime evidence is expected under capability-specific DSH evidence folders, including:

- `services/dsh/evidence/DSH-001-store-discovery-fullstack-multi-surface`
- `services/dsh/evidence/DSH-002-client-home-discovery`
- `services/dsh/evidence/DSH-003-catalog-fullstack`
- `services/dsh/evidence/DSH-004-cart-serviceability`
- `services/dsh/evidence/DSH-005-checkout-intent`
- `services/dsh/evidence/DSH-006-order-fulfillment`
- `services/dsh/evidence/DSH-007-dispatch-delivery-lifecycle`
- `services/dsh/evidence/DSH-008-field-readiness`
- `services/dsh/evidence/DSH-009-support-incidents`
- `services/dsh/evidence/DSH-010-analytics-finance-visibility`
- `services/dsh/evidence/brach-validation-final-closure/dsh-runtime-smoke.txt`
- `services/dsh/evidence/brach-validation-final-closure/dsh-015-runtime-smoke.txt`

## Canonical Checks

Use these checks before declaring DSH runtime closed after any change:

```powershell
pnpm run runtime:status
pnpm run runtime:smoke
pnpm run guard:dsh-frontend-shared-ownership
pnpm run guard:dsh-frontend-shared-boundary-imports
pnpm run guard:no-preview-demo-mock-runtime
pnpm run guard:no-broken-imports
pnpm run guard:no-direct-fetch-in-screen
pnpm run guard:no-financial-mutation-outside-wlt
pnpm run guard:no-direct-financial-provider-access-outside-wlt
pnpm run typecheck
pnpm run build
```

## Notes

- This file is documentation. The executable truth remains the contract, runtime map, service manifest, generated clients, backend handlers, database migrations, surfaces, and passing guard/runtime evidence.
- Any future mismatch between this file and executable code must be treated as documentation drift and corrected immediately.
- The old `SLICE_002_IMPLEMENTED` label is retired and must not be used as the current DSH stage.
