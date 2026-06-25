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
    runtimeEvidence: "services/dsh/evidence/DSH-001-store-discovery-fullstack-multi-surface",
    state: "verified",
  },
  {
    capabilityId: "dsh.store.discovery",
    contractOperations: ["listDshStores", "getDshStore"],
    backendImplemented: true,
    runtimeEvidence: "services/dsh/evidence/DSH-001-store-discovery-fullstack-multi-surface",
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
    runtimeEvidence: "services/dsh/evidence/DSH-002-client-home-discovery",
  },
  {
    capabilityId: "dsh.client.catalog",
    backendImplemented: true,
    runtimeBound: true,
    screensReady: true,
    databaseReady: true,
    generatedClientReady: true,
    state: "verified",
    runtimeEvidence: "services/dsh/evidence/DSH-003-catalog-fullstack",
  },
  // ── DSH-004: Cart & Serviceability ─────────────────────────────────────
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
    runtimeEvidence: "services/dsh/evidence/DSH-004-cart-serviceability",
  },
  // ── DSH-005: Checkout Intent & WLT Handoff ──────────────────────────────
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
    runtimeEvidence: "services/dsh/evidence/DSH-005-checkout-intent",
  },
  // ── DSH-006: Order Fulfillment & Partner Acceptance ─────────────────────
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
    runtimeEvidence: "services/dsh/evidence/DSH-006-order-fulfillment",
  },
  // ── DSH-007: Dispatch & Captain Delivery ────────────────────────────────
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
    runtimeEvidence: "services/dsh/evidence/DSH-007-dispatch-delivery-lifecycle",
  },
  // ── DSH-008: Field Verification & Store Quality Assurance ────────────────
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
    runtimeEvidence: "services/dsh/evidence/DSH-008-field-readiness",
  },
  // ── DSH-009: Support, Incidents & Escalation Room ────────────────────────
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
    runtimeEvidence: "services/dsh/evidence/DSH-009-support-incidents",
  },
  // ── DSH-010: Platform Analytics & Operational Reporting ──────────────────
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
    runtimeEvidence: "services/dsh/evidence/DSH-010-analytics-finance-visibility",
  },
] as const satisfies readonly DshRuntimeBinding[];
