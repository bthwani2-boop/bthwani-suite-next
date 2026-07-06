import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "frontend-feature-binding-gate";
const violations = [];

// ─── Evidence: verified by runtime-map.ts state field ────────────────────────
// Capabilities with state="verified" in runtime-map.ts are considered proven.
// This gate derives evidence status from the runtime-map, not raw evidence dirs.
const RUNTIME_MAP_PATH = "services/dsh/runtime-map.ts";

function loadVerifiedCapabilityIds() {
  const content = fs.readFileSync(path.join(repoRoot, RUNTIME_MAP_PATH), "utf8");
  const ids = new Set();
  const regex = /capabilityId:\s*"([^"]+)"[^}]*state:\s*"verified"/gs;
  for (const match of content.matchAll(regex)) {
    ids.add(match[1]);
  }
  return ids;
}

// ─── Segment definitions ────────────────────────────────────────────────────────
// For each screen:
//   path        – relative repo path to screen file
//   controller  – relative repo path to shared controller/hook
//   openapi     – exact operationId from dsh.openapi.yaml
//   route       – exact pattern from DSH server.go
//   capabilityId – must appear as state="verified" in runtime-map.ts
const SEGMENTS = [
  {
    name: "Segment A: app-client checkout / orders / tracking",
    screens: [
      {
        name: "checkout",
        path: "services/dsh/frontend/app-client/checkout/CheckoutScreen.tsx",
        controller: "services/dsh/frontend/shared/checkout/use-checkout-to-order-flow.tsx",
        openapi: "createDshCheckoutIntent",
        route: "POST /dsh/client/checkout-intents",
        capabilityId: "dsh.client.checkout",
      },
      {
        name: "orders list",
        path: "services/dsh/frontend/app-client/orders/OrdersListScreen.tsx",
        controller: "services/dsh/frontend/shared/orders/orders.controller-core.ts",
        openapi: "listDshClientOrders",
        route: "GET /dsh/client/orders",
        capabilityId: "dsh.client.orders",
      },
      {
        name: "order tracking",
        path: "services/dsh/frontend/app-client/orders/OrderTrackingScreen.tsx",
        controller: "services/dsh/frontend/shared/orders/orders.controller-core.ts",
        openapi: "getDshClientOrderTracking",
        route: "GET /dsh/client/orders/{orderId}/tracking",
        capabilityId: "dsh.client.orders",
      },
    ],
  },
  {
    name: "Segment B: app-partner orders / catalog / store",
    screens: [
      {
        name: "orders inbox",
        path: "services/dsh/frontend/app-partner/orders/OrdersInboxScreen.tsx",
        controller: "services/dsh/frontend/shared/orders/orders.controller-core.ts",
        openapi: "listDshPartnerOrders",
        route: "GET /dsh/partner/orders",
        capabilityId: "dsh.client.orders",
      },
      {
        name: "catalog inventory",
        path: "services/dsh/frontend/app-partner/Catalog/InventoryCatalogScreen.tsx",
        controller: "services/dsh/frontend/shared/catalog/catalog.controller-core.ts",
        openapi: "getPartnerDshCatalog",
        route: "GET /dsh/partner/catalog",
        capabilityId: "dsh.client.catalog",
      },
      {
        name: "product edit",
        path: "services/dsh/frontend/app-partner/Catalog/ProductEditScreen.tsx",
        controller: "services/dsh/frontend/shared/catalog/catalog.controller-core.ts",
        openapi: "updatePartnerCatalogProduct",
        route: "PATCH /dsh/partner/catalog/products/{productId}",
        capabilityId: "dsh.client.catalog",
      },
      {
        name: "category management",
        path: "services/dsh/frontend/app-partner/Catalog/CategoryManagementScreen.tsx",
        controller: "services/dsh/frontend/shared/catalog/catalog.controller-core.ts",
        openapi: "createPartnerCatalogCategory",
        route: "POST /dsh/partner/catalog/categories",
        capabilityId: "dsh.client.catalog",
      },
      {
        name: "store profile settings",
        path: "services/dsh/frontend/app-partner/store/StoreProfileScreen.tsx",
        controller: "services/dsh/frontend/shared/store/store-admin.controller-core.ts",
        openapi: "updatePartnerStoreSettings",
        route: "PATCH /dsh/partner/stores/{storeId}/settings",
        capabilityId: "dsh.store.discovery",
      },
    ],
  },
  {
    name: "Segment C: app-captain assignment / pickup / dropoff / POD",
    screens: [
      {
        name: "assignments list",
        path: "services/dsh/frontend/app-captain/orders/DshCaptainOrdersScreen.tsx",
        controller: "services/dsh/frontend/shared/orders/orders.controller-core.ts",
        openapi: "listDshCaptainAssignments",
        route: "GET /dsh/captain/dispatch/assignments",
        capabilityId: "dsh.client.dispatch",
      },
      {
        name: "delivery map",
        path: "services/dsh/frontend/app-captain/orders/DshCaptainMapScreen.tsx",
        controller: "services/dsh/frontend/shared/delivery/delivery.view-model.ts",
        openapi: "updateDshDeliveryStatus",
        route: "POST /dsh/captain/dispatch/assignments/{assignmentId}/status",
        capabilityId: "dsh.client.dispatch",
      },
      {
        name: "pickup dropoff",
        path: "services/dsh/frontend/app-captain/orders/DshCaptainPickupDropoffScreen.tsx",
        controller: "services/dsh/frontend/shared/delivery/delivery.view-model.ts",
        openapi: "updateDshDeliveryStatus",
        route: "POST /dsh/captain/dispatch/assignments/{assignmentId}/status",
        capabilityId: "dsh.client.dispatch",
      },
      {
        name: "POD submission",
        path: "services/dsh/frontend/app-captain/orders/DshCaptainPoDSubmissionScreen.tsx",
        controller: "services/dsh/frontend/shared/delivery/delivery.view-model.ts",
        openapi: "submitDshPoD",
        route: "POST /dsh/captain/dispatch/assignments/{assignmentId}/pod",
        capabilityId: "dsh.client.dispatch",
      },
    ],
  },
  {
    name: "Segment D: app-field onboarding / media / visits",
    screens: [
      {
        name: "partner onboarding",
        path: "services/dsh/frontend/app-field/onboarding/FieldPartnerOnboardingScreen.tsx",
        controller: "services/dsh/frontend/shared/field-onboarding/use-field-partner-onboarding-controller.tsx",
        openapi: "submitFieldPartnerDraft",
        route: "POST /dsh/field/partners/{partnerId}/submit",
        capabilityId: "dsh.field.readiness",
      },
      {
        name: "store verification",
        path: "services/dsh/frontend/app-field/store/FieldStoreVerificationScreen.tsx",
        controller: "services/dsh/frontend/shared/field-readiness/field-readiness.controller-core.ts",
        openapi: "submitFieldStoreVerification",
        route: "POST /dsh/field/stores/{storeId}/verifications",
        capabilityId: "dsh.field.readiness",
      },
      {
        name: "media uploads",
        path: "services/dsh/frontend/app-field/escalation/DshFieldVisitScreen.tsx",
        controller: "services/dsh/frontend/shared/field-readiness/field-readiness.controller-core.ts",
        openapi: "uploadFieldMedia",
        route: "POST /dsh/field/media/uploads",
        capabilityId: "dsh.field.readiness",
      },
      {
        name: "visits history",
        path: "services/dsh/frontend/app-field/stores/DshFieldStoresHistoryScreen.tsx",
        controller: "services/dsh/frontend/shared/field-readiness/field-readiness.controller-core.ts",
        openapi: "listDshFieldVisits",
        route: "GET /dsh/field/stores/{storeId}/visits",
        capabilityId: "dsh.field.readiness",
      },
    ],
  },
  {
    name: "Segment E: control-panel operations / support / analytics",
    screens: [
      {
        name: "operations hub",
        path: "services/dsh/frontend/control-panel/operations/OperationsHubScreen.tsx",
        controller: "services/dsh/frontend/shared/operations/use-operations-controller.tsx",
        openapi: "listDshOperatorOrders",
        route: "GET /dsh/operator/orders",
        capabilityId: "dsh.client.orders",
      },
      {
        name: "order queue",
        path: "services/dsh/frontend/control-panel/operations/OrderQueueScreen.tsx",
        controller: "services/dsh/frontend/shared/operations/use-operations-controller.tsx",
        openapi: "listDshOperatorOrders",
        route: "GET /dsh/operator/orders",
        capabilityId: "dsh.client.orders",
      },
      {
        name: "cart activity",
        path: "services/dsh/frontend/control-panel/operations/CartActivityScreen.tsx",
        controller: "services/dsh/frontend/shared/operations/use-operations-controller.tsx",
        openapi: "listOperatorCarts",
        route: "GET /dsh/operator/carts",
        capabilityId: "dsh.client.cart",
      },
      {
        name: "checkout activity",
        path: "services/dsh/frontend/control-panel/operations/CheckoutActivityScreen.tsx",
        controller: "services/dsh/frontend/shared/operations/use-operations-controller.tsx",
        openapi: "listOperatorCheckoutIntents",
        route: "GET /dsh/operator/checkout-intents",
        capabilityId: "dsh.client.checkout",
      },
      {
        name: "analytics dashboard",
        path: "services/dsh/frontend/control-panel/analytics/AnalyticsDashboardScreen.tsx",
        controller: "services/dsh/frontend/shared/analytics/use-analytics-controller.tsx",
        openapi: "getDshPlatformKpis",
        route: "GET /dsh/operator/analytics/platform",
        capabilityId: "dsh.operator.analytics",
      },
      {
        name: "catalog approvals",
        path: "services/dsh/frontend/control-panel/catalogs/CatalogApprovalScreen.tsx",
        controller: "services/dsh/frontend/shared/partner/use-partners-controller.tsx",
        openapi: "listDshCatalogApprovals",
        route: "GET /dsh/catalog-approvals",
        capabilityId: "dsh.admin",
      },
      {
        name: "partners activation list",
        path: "services/dsh/frontend/control-panel/partners/PartnerListScreen.tsx",
        controller: "services/dsh/frontend/shared/partner/use-partners-controller.tsx",
        openapi: "listDshPartners",
        route: "GET /dsh/operator/partners",
        capabilityId: "dsh.partner.activation",
      },
      {
        name: "support tickets hub",
        path: "services/dsh/frontend/control-panel/support/SupportHubScreen.tsx",
        controller: "services/dsh/frontend/shared/support/use-support-controller.tsx",
        openapi: "listDshOperatorTickets",
        route: "GET /dsh/operator/support/tickets",
        capabilityId: "dsh.support.hub",
      },
      {
        name: "notifications config",
        path: "services/dsh/frontend/control-panel/support/PlatformNotificationConfigScreen.tsx",
        controller: "services/dsh/frontend/shared/support/use-support-controller.tsx",
        openapi: "listDshPlatformNotificationConfig",
        route: "GET /dsh/operator/notifications/config",
        capabilityId: "dsh.notifications",
      },
    ],
  },
];

// ─── Load sources of truth ────────────────────────────────────────────────────
const openapiContent = fs.readFileSync(
  path.join(repoRoot, "services/dsh/contracts/dsh.openapi.yaml"),
  "utf8"
);
const routerContent = fs.readFileSync(
  path.join(repoRoot, "services/dsh/backend/internal/http/server.go"),
  "utf8"
);
const verifiedCapabilities = loadVerifiedCapabilityIds();

console.log("=== FRONTEND FEATURE BINDING GATE ===");
console.log(`Verified capability count: ${verifiedCapabilities.size}`);

let passedSegments = 0;
const totalSegments = SEGMENTS.length;

for (const segment of SEGMENTS) {
  console.log(`\n${segment.name}`);
  let segmentOk = true;

  for (const screen of segment.screens) {
    const screenExists = fs.existsSync(path.join(repoRoot, screen.path));
    const controllerExists = fs.existsSync(path.join(repoRoot, screen.controller));
    const openapiBound = openapiContent.includes(screen.openapi);
    const routeBound = routerContent.includes(screen.route);
    const runtimeVerified = verifiedCapabilities.has(screen.capabilityId);

    let status = "BOUND_ACTIVE";
    let reason = "";

    if (!screenExists) {
      status = "SCREEN_MISSING";
      reason = `Screen file not found: ${screen.path}`;
    } else if (!controllerExists) {
      status = "CONTROLLER_MISSING";
      reason = `Controller not found: ${screen.controller}`;
    } else if (!openapiBound) {
      status = "OPENAPI_MISMATCH";
      reason = `operationId not in spec: ${screen.openapi}`;
    } else if (!routeBound) {
      status = "ROUTE_MISSING";
      reason = `Route not in server.go: ${screen.route}`;
    } else if (!runtimeVerified) {
      status = "CAPABILITY_NOT_VERIFIED";
      reason = `Capability not runtime-verified: ${screen.capabilityId}`;
    }

    const icon = status === "BOUND_ACTIVE" ? "✓" : "✗";
    console.log(`  ${icon} [${status}] ${screen.name}`);

    if (status !== "BOUND_ACTIVE") {
      segmentOk = false;
      violations.push({ file: screen.path, message: `${status}: ${reason}` });
    }
  }

  if (segmentOk) passedSegments++;
}

console.log(`\nSegments Passed: ${passedSegments}/${totalSegments}`);

fail(guardId, violations);
