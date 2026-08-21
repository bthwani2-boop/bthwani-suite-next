import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("partner route contract makes URL state the single navigation authority", async () => {
  const navigation = await read("services/dsh/frontend/app-partner/partner-navigation.ts");
  const surface = await read("services/dsh/frontend/app-partner/DshPartnerSurface.tsx");
  const renderer = await read("services/dsh/frontend/app-partner/DshPartnerRouteRenderer.tsx");
  const journey = await read("services/dsh/frontend/app-partner/DshPartnerOrderJourneyRenderer.tsx");

  assert.match(navigation, /kind: "home"; readonly section: PartnerHubSection/);
  assert.match(navigation, /kind: "support-directory"; readonly context: DshPartnerSupportCommandContext; readonly orderId\?: string/);
  assert.match(navigation, /kind: "support-screen"; readonly screenId: DshPartnerSupportRouteId; readonly context: DshPartnerSupportCommandContext; readonly orderId\?: string/);
  assert.match(navigation, /case "order-rejection": return `\/orders\/\$\{segment\(route\.orderId\)\}\/reject`/);
  assert.match(navigation, /case "product-media": return `\/catalog\/products\/\$\{segment\(route\.productId\)\}\/media`/);
  assert.match(surface, /useDshPartnerSurfaceModel\(dshPartnerLegacyRoute\(route\)\)/);
  assert.doesNotMatch(surface, /setRoute|setActiveOrderId|routeHistoryRef|BackHandler/);
  assert.match(renderer, /const scopedStoreId = selectedStoreScope\.storeId/);
  assert.doesNotMatch(renderer, /selectedStoreScopeId === "all"/);
  assert.match(journey, /buildDshPartnerSupportDirectoryRouteFromFlow\('order-handoff', 'orders', orderId\)/);
  assert.match(journey, /navigation\.navigate\(\{ kind: 'order-rejection', orderId \}\)/);
});

test("partner Expo Router tree covers primary and parameterized product journeys", async () => {
  const routes = await Promise.all([
    read("apps/app-partner/runtime/app/orders/index.tsx"),
    read("apps/app-partner/runtime/app/orders/[orderId]/reject.tsx"),
    read("apps/app-partner/runtime/app/account/[section].tsx"),
    read("apps/app-partner/runtime/app/support/[screenId].tsx"),
    read("apps/app-partner/runtime/app/catalog/products/[productId]/edit.tsx"),
    read("apps/app-partner/runtime/app/catalog/products/[productId]/media.tsx"),
    read("apps/app-partner/runtime/app/catalog/products/[productId]/overrides.tsx"),
  ]);
  const combined = routes.join("\n");
  assert.match(combined, /useLocalSearchParams/);
  assert.match(combined, /kind: "order-rejection"/);
  assert.match(combined, /kind: "home"/);
  assert.match(combined, /kind: "support-screen"/);
  assert.match(combined, /kind: "product-edit"/);
  assert.match(combined, /kind: "product-media"/);
  assert.match(combined, /kind: "product-overrides"/);
});
