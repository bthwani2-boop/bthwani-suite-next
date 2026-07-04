# DSH Service Blueprint

Status: ACTIVE_RUNTIME_BLUEPRINT
Current Runtime State: RUNTIME_VERIFIED
Closure State: RUNTIME_VERIFIED
Contract: `contracts/dsh.openapi.yaml`
Runtime Port: `58080` (container internal: `8080`)

## Purpose

DSH owns operational commerce and delivery truth: store discovery, home discovery, catalog, cart, serviceability, checkout intent, order fulfillment, dispatch, field readiness, support, operational analytics, policies, administration, and partner onboarding & store publication.

WLT exclusively owns wallet, payment, refund, settlement, payout, commission, COD financial truth, ledger, reconciliation, and finance reporting. DSH may expose operational/visibility views that reference financial state, but financial mutation and provider access remain WLT-owned.

## Current Runtime Truth

This blueprint reflects the current DSH runtime map and surface map.

The active runtime capabilities are:

- Store Discovery and system readiness: verified.
- Home Discovery: verified.
- Catalog Management: verified.
- Cart and Serviceability: verified.
- Checkout Intent and WLT Handoff: verified.
- Order Fulfillment and partner acceptance: verified.
- Dispatch and Captain Delivery: verified.
- Field Verification and Store Quality Assurance: verified.
- Support, Incidents, and Escalation Room: verified.
- Platform Analytics and Operational Reporting: verified.
- Notifications and Actor Communication: verified.
- Marketing Command Deck: blocked-runtime (code/contract complete; see capability-map.ts / runtime-map.ts "dsh.marketing").
- Platform Policies and Service Area Management: verified.
- Administration, Roles, and Activation: verified.
- Partner Onboarding & Store Publication: verified.

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

### Notifications and Actor Communication

- `listDshNotifications`
- `markDshNotificationRead`
- `markAllDshNotificationsRead`
- `updateDshNotificationPreferences`
- `listDshPlatformNotificationConfig`
- `upsertDshPlatformNotificationConfig`

### Marketing Command Deck

- `listDshCampaigns`
- `createDshCampaign`
- `getDshCampaign`
- `updateDshCampaign`
- `archiveDshCampaign`
- `listDshMarketingTickers`
- `createDshMarketingTicker`
- `updateDshMarketingTicker`
- `deleteDshMarketingTicker`
- `listDshPartnerOffers`
- `updateDshPartnerOffer`
- `archiveDshPartnerOffer`
- `listDshPartnerSelfOffers`
- `submitDshPartnerSelfOffer`

### Platform Policies and Service Area Management

- `listDshZones`
- `createDshZone`
- `updateDshZone`
- `getDshSlaRules`
- `upsertDshSlaRules`
- `getDshCapacityConfig`
- `upsertDshCapacityConfig`
- `getDshZoneServiceability`

### Administration, Roles, and Activation

- `listDshAdminRoles`
- `createDshAdminRole`
- `listDshAdminStaff`
- `assignDshStaffRole`
- `listDshPartnerActivations`
- `activateDshPartner`
- `blockDshPartner`
- `listDshCaptainCredentials`
- `upsertDshCaptainCredential`
- `listDshAdminAudit`

### Partner Onboarding & Store Publication

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
- Cross-surface behavior is visible where the capability requires more than one actor.
- Guards pass for imports, direct fetch boundaries, preview/mock runtime ban, and WLT/DSH financial ownership.

## Security Boundary

Public read endpoints may be anonymous only when the contract explicitly marks them public.

All mutating, actor-scoped, operator, partner, captain, field, support, policy, administration, and activation operations require authenticated actor context.

Financial provider access, ledger mutation, wallet balance mutation, settlement, payout, refund, commission, and reconciliation are not owned by DSH. Those remain WLT responsibilities.

## Evidence Locations

Runtime evidence is expected under capability-specific DSH evidence folders, including:

- `services/dsh/evidence/Store Discovery-store-discovery-fullstack-multi-surface`
- `services/dsh/evidence/Home Discovery-client-home-discovery`
- `services/dsh/evidence/Catalog Management-catalog-fullstack`
- `services/dsh/evidence/Cart & Serviceability-cart-serviceability`
- `services/dsh/evidence/Checkout & WLT Handoff-checkout-intent`
- `services/dsh/evidence/Order Fulfillment-order-fulfillment`
- `services/dsh/evidence/Dispatch & Captain Delivery-dispatch-delivery-lifecycle`
- `services/dsh/evidence/Field Verification-field-readiness`
- `services/dsh/evidence/Support-support-incidents`
- `services/dsh/evidence/Analytics-analytics-finance-visibility`
- `services/dsh/evidence/partner-onboarding-store-publication-final-closure/dsh-runtime-smoke.txt`
- `services/dsh/evidence/partner-onboarding-store-publication-final-closure/verification-output.md`

## Canonical Checks

Use these checks before declaring DSH runtime closed after any change:

```powershell
pnpm run foundation:gate
pnpm run journey:gate
pnpm run typecheck
pnpm run build
```

## Notes

- This file is documentation. The executable truth remains the contract, runtime map, service manifest, generated clients, backend handlers, database migrations, surfaces, and passing guard/runtime evidence.
- Any future mismatch between this file and executable code must be treated as documentation drift and corrected immediately.
- Evidence checklist verification SHA: 7ff5fc9b1bd1e9fa3ab46ed3cba7b990b1021dd3

