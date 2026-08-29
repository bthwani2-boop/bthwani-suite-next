import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const registry = await import("../frontend/shared/operations/operations-registry.ts");
const sectionRoutes = await import("../frontend/shared/control-panel-routes.ts");
const source = readFileSync(
  "services/dsh/frontend/shared/operations/operations-registry.ts",
  "utf8",
);
const hubSource = readFileSync(
  "services/dsh/frontend/control-panel/operations/OperationsHubScreen.tsx",
  "utf8",
);
const heatmapSource = readFileSync(
  "services/dsh/frontend/control-panel/operations/OperationsHeatmapScreen.tsx",
  "utf8",
);
const operationsPermissionSource = readFileSync(
  "services/dsh/frontend/shared/operations/use-operations-permission.ts",
  "utf8",
);
const types = readFileSync(
  "services/dsh/frontend/shared/operations/operations.types.ts",
  "utf8",
);
const specialRequests = readFileSync(
  "services/dsh/frontend/shared/special-requests/OperatorSpecialRequestsWorkbench.tsx",
  "utf8",
);
const partnerStores = readFileSync(
  "services/dsh/frontend/control-panel/operations/PartnerStoresScreen.tsx",
  "utf8",
);

test("operations navigation has one canonical group authority", () => {
  assert.equal(
    registry.buildOperationsHref("special-ops", { subGroup: "shein", requestId: "request-1" }),
    "/dsh/operations?workspace=special-ops&requestId=request-1&subGroup=shein",
  );
  assert.equal(
    registry.buildOperationsHref("exceptions", { subGroup: "stores", orderId: "store-1" }),
    "/dsh/operations?workspace=exceptions&orderId=store-1&subGroup=stores",
  );
  assert.equal("normalizeOperationsLocation" in registry, false);
  assert.doesNotMatch(source, /Legacy|LEGACY|normalizeOperationsLocation|sheinproxy|awnak-operations/);
  assert.doesNotMatch(types, /LegacyOperationsWorkspaceId|LegacySectionRedirectId|AnyOperationsWorkspaceId|OperationsNormalizationResult/);
  assert.doesNotMatch(specialRequests, /sheinproxy|awnak-operations/);
  assert.doesNotMatch(partnerStores, /buildOperationsHref\(['"]partner-stores/);
});

test("operations ownership shortcuts consume the canonical control-panel section routes", () => {
  const financeShortcut = registry.NON_OPERATIONS_SECTION_SHORTCUTS.find((item) => item.id === "finance");
  assert.ok(financeShortcut, "finance ownership shortcut must exist");
  assert.equal(sectionRoutes.CONTROL_PANEL_SECTION_ROUTES.finance, "/wlt/finance");
  assert.equal(financeShortcut.href, sectionRoutes.CONTROL_PANEL_SECTION_ROUTES.finance);
  assert.doesNotMatch(source, /href:\s*['"]\/dsh\/finance['"]/);
});

test("published operations subgroups mount their canonical dedicated workspaces", () => {
  assert.match(hubSource, /assisted:\s*AssistedOrderDeskScreen/);
  assert.match(hubSource, /rescue:\s*OrderRescueScreen/);
  assert.match(hubSource, /audit:\s*AuditSupportSlaScreen/);
  assert.match(hubSource, /proofs:\s*DeliveryProofReviewScreen/);
  assert.match(hubSource, /heatmap:\s*OperationsHeatmapScreen/);
  assert.match(hubSource, /zones:\s*AreaCapacityScreen/);
});

test("operations heatmap consumes the governed DSH runtime and existing maps authority", () => {
  assert.match(heatmapSource, /\/dsh\/operator\/dispatch\/heatmap/);
  assert.match(heatmapSource, /GoogleMapsWebCanvas/);
  assert.match(heatmapSource, /centerLatitude/);
  assert.match(heatmapSource, /centerLongitude/);
  assert.match(heatmapSource, /freshCount/);
  assert.match(heatmapSource, /staleCount/);
  assert.match(heatmapSource, /lostCount/);
  assert.match(heatmapSource, /هذه حالة فارغة مثبتة وليست صفراً مصطنعاً/);
  assert.match(operationsPermissionSource, /group === 'dispatch-capacity'/);
  assert.match(operationsPermissionSource, /: \{ actions: \['operations\.read'\] \}/);
});
