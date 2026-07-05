import type { DshCapability } from "./capability-map";

export type DshRuntimeBinding = {
  readonly capabilityId: DshCapability["id"];
  readonly contractOperations?: readonly string[];
  readonly backendImplemented: boolean;
  readonly runtimeEvidence: string | null;
  readonly state: "blocked" | "verified" | "experience-fix-required" | "client-reverified-only";
  readonly runtimeBound?: boolean;
  readonly screensReady?: boolean;
  readonly databaseReady?: boolean;
  readonly generatedClientReady?: boolean;
  readonly sharedBrainReady?: boolean;
  readonly surfaceBindingApproved?: boolean;
};

export const DSH_RUNTIME_MAP = [
  {
    capabilityId: "dsh.system.readiness",
    contractOperations: ["getDshHealth", "getDshReadiness"],
    backendImplemented: true,
    runtimeEvidence: "services/dsh/evidence/Store Discovery-store-discovery-fullstack-multi-surface",
    state: "verified",
  },
  {
    capabilityId: "dsh.store.discovery",
    contractOperations: ["listDshStores", "getDshStore"],
    backendImplemented: true,
    runtimeEvidence: "services/dsh/evidence/Store Discovery-store-discovery-fullstack-multi-surface",
    state: "verified",
  },
  {
    capabilityId: "dsh.client.home-discovery",
    backendImplemented: true,
    runtimeBound: true,
    screensReady: true,
    databaseReady: true,
    generatedClientReady: true,
    state: "verified",
    runtimeEvidence: "services/dsh/evidence/Home Discovery-client-home-discovery",
  },
  {
    capabilityId: "dsh.client.catalog",
    backendImplemented: true,
    runtimeBound: true,
    screensReady: true,
    databaseReady: true,
    generatedClientReady: true,
    state: "verified",
    runtimeEvidence: "services/dsh/evidence/Catalog Management-catalog-fullstack",
  },
  // ── Cart & Serviceability ───────────────────────────────────────────────
  {
    capabilityId: "dsh.client.cart",
    backendImplemented: true,
    sharedBrainReady: true,
    runtimeBound: true,
    screensReady: true,
    databaseReady: true,
    generatedClientReady: true,
    surfaceBindingApproved: true,
    state: "verified",
    runtimeEvidence: "services/dsh/evidence/Cart & Serviceability-cart-serviceability",
  },
  // ── Checkout Intent & WLT Handoff ───────────────────────────────────────
  {
    capabilityId: "dsh.client.checkout",
    backendImplemented: true,
    sharedBrainReady: true,
    runtimeBound: true,
    screensReady: true,
    databaseReady: true,
    generatedClientReady: true,
    surfaceBindingApproved: true,
    state: "verified",
    runtimeEvidence: "services/dsh/evidence/Checkout & WLT Handoff-checkout-intent",
  },
  // ── Order Fulfillment & Partner Acceptance ──────────────────────────────
  {
    capabilityId: "dsh.client.orders",
    backendImplemented: true,
    sharedBrainReady: true,
    runtimeBound: true,
    screensReady: true,
    databaseReady: true,
    generatedClientReady: true,
    surfaceBindingApproved: true,
    state: "verified",
    runtimeEvidence: "services/dsh/evidence/Order Fulfillment-order-fulfillment",
  },
  // ── Dispatch & Captain Delivery ─────────────────────────────────────────
  {
    capabilityId: "dsh.client.dispatch",
    backendImplemented: true,
    sharedBrainReady: true,
    runtimeBound: true,
    screensReady: true,
    databaseReady: true,
    generatedClientReady: true,
    surfaceBindingApproved: true,
    state: "verified",
    runtimeEvidence: "services/dsh/evidence/Dispatch & Captain Delivery-dispatch-delivery-lifecycle",
  },
  // ── Field Verification & Store Quality Assurance ────────────────────────
  {
    capabilityId: "dsh.field.readiness",
    backendImplemented: true,
    sharedBrainReady: true,
    runtimeBound: true,
    screensReady: true,
    databaseReady: true,
    generatedClientReady: true,
    surfaceBindingApproved: true,
    state: "verified",
    runtimeEvidence: "services/dsh/evidence/Field Verification-field-readiness",
  },
  // ── Support, Incidents & Escalation Room ─────────────────────────────────
  {
    capabilityId: "dsh.support.hub",
    backendImplemented: true,
    sharedBrainReady: true,
    runtimeBound: true,
    screensReady: true,
    databaseReady: true,
    generatedClientReady: true,
    surfaceBindingApproved: true,
    state: "verified",
    runtimeEvidence: "services/dsh/evidence/Support-support-incidents",
  },
  // ── Platform Analytics & Operational Reporting ──────────────────────────
  {
    capabilityId: "dsh.operator.analytics",
    backendImplemented: true,
    sharedBrainReady: true,
    runtimeBound: true,
    screensReady: true,
    databaseReady: true,
    generatedClientReady: true,
    surfaceBindingApproved: true,
    state: "verified",
    runtimeEvidence: "services/dsh/evidence/Analytics-analytics-finance-visibility",
  },
  // ── Notifications & Actor Communication ──────────────────────────────────
  {
    capabilityId: "dsh.notifications",
    backendImplemented: true,
    sharedBrainReady: true,
    runtimeBound: true,
    screensReady: true,
    databaseReady: true,
    generatedClientReady: true,
    surfaceBindingApproved: true,
    state: "experience-fix-required",
    runtimeEvidence: null,
  },
  // ── Marketing Command Deck ───────────────────────────────────────────────
  // Campaigns, tickers, and partner-offers are all API-backed with governed
  // lifecycles, audit trail (dsh_marketing_audit_events), target
  // visibility-gate checks, and soft archive/delete -- no hard DB deletes.
  // video-studio, growth, loyalty/benefits-subscriptions and
  // image-product-review were removed from the active deck rather than
  // shipped disabled (no backend, and for loyalty/image-review, the wrong
  // owner -- WLT and catalogs respectively). app-client has no marketing
  // exposure by design: home banners/promos are owned by
  // dsh.client.home-discovery, not this capability. app-partner scoping is
  // enforced server-side via store.ResolveActorStore (a partner can only
  // see/submit offers for their own resolved store).
  // Runtime deployment evidence: migration dsh-020 applied, dsh-api image
  // rebuilt/restarted, both new routes verified reachable (401, not 404) --
  // see services/dsh/evidence/marketing-partner-offers-runtime-smoke/dsh-runtime-smoke.txt.
  // Sibling services (wlt-api, identity-api) confirmed unaffected.
  {
    capabilityId: "dsh.marketing",
    backendImplemented: true,
    sharedBrainReady: true,
    runtimeBound: true,
    screensReady: true,
    databaseReady: true,
    generatedClientReady: true,
    surfaceBindingApproved: true,
    state: "verified",
    runtimeEvidence: "services/dsh/evidence/marketing-partner-offers-runtime-smoke/dsh-runtime-smoke.txt",
  },
  // ── Platform Policies & Service Area Management ──────────────────────────
  {
    capabilityId: "dsh.policies",
    backendImplemented: true,
    sharedBrainReady: true,
    runtimeBound: true,
    screensReady: true,
    databaseReady: true,
    generatedClientReady: true,
    surfaceBindingApproved: true,
    state: "verified",
    runtimeEvidence: "services/dsh/evidence/partner-onboarding-store-publication-final-closure/dsh-runtime-smoke.txt",
  },
  // ── Administration, Roles & Activation ──────────────────────────────────
  {
    capabilityId: "dsh.admin",
    backendImplemented: true,
    sharedBrainReady: true,
    runtimeBound: true,
    screensReady: true,
    databaseReady: true,
    generatedClientReady: true,
    surfaceBindingApproved: true,
    state: "verified",
    runtimeEvidence: "services/dsh/evidence/partner-onboarding-store-publication-final-closure/dsh-runtime-smoke.txt",
  },
  // ── Partner Onboarding & Store Publication ──────────────────────────────────────────────
  {
    capabilityId: "dsh.partner.activation",
    backendImplemented: true,
    sharedBrainReady: true,
    runtimeBound: true,
    screensReady: true,
    databaseReady: true,
    generatedClientReady: true,
    surfaceBindingApproved: true,
    state: "verified",
    runtimeEvidence: "services/dsh/evidence/partner-onboarding-store-publication-final-closure/dsh-runtime-smoke.txt",
  },
] as const satisfies readonly DshRuntimeBinding[];
