import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("partner route contract makes URL state the single navigation authority", async () => {
  const navigation = await read("services/dsh/frontend/app-partner/partner-navigation.ts");
  const partnerApi = await read("services/dsh/frontend/app-partner/index.ts");
  const surface = await read("services/dsh/frontend/app-partner/DshPartnerSurface.tsx");
  const renderer = await read("services/dsh/frontend/app-partner/DshPartnerRouteRenderer.tsx");
  const journey = await read("services/dsh/frontend/app-partner/DshPartnerOrderJourneyRenderer.tsx");
  const productMedia = await read("services/dsh/frontend/app-partner/catalog/ProductMediaScreen.tsx");

  assert.match(navigation, /kind: "home"; readonly section: PartnerHubSection/);
  assert.match(navigation, /kind: "support-directory"; readonly context: DshPartnerSupportCommandContext; readonly orderId\?: string/);
  assert.match(navigation, /kind: "support-screen"; readonly screenId: DshPartnerSupportRouteId; readonly context: DshPartnerSupportCommandContext; readonly orderId\?: string/);
  assert.doesNotMatch(navigation, /order-rejection/);
  assert.match(navigation, /case "product-media": return `\/catalog\/products\/\$\{segment\(route\.productId\)\}\/media`/);
  assert.match(surface, /useDshPartnerSurfaceModel\(route\.kind\)/);
  assert.match(surface, /if \(isLoadingScopes \|\| !selectedStoreScope\)/);
  assert.match(surface, /تعذر التحقق من صلاحية المتجر/);
  assert.doesNotMatch(`${navigation}\n${partnerApi}\n${surface}`, /dshPartnerLegacyRoute/);
  assert.doesNotMatch(surface, /setRoute|setActiveOrderId|routeHistoryRef|BackHandler/);
  assert.doesNotMatch(productMedia, /partnerId\?: string|route compatibility/i);
  assert.match(renderer, /const scopedStoreId = selectedStoreScope\.storeId/);
  assert.doesNotMatch(renderer, /selectedStoreScopeId === "all"/);
  assert.match(journey, /buildDshPartnerSupportDirectoryRouteFromFlow\('order-handoff', 'orders', orderId\)/);
  assert.match(journey, /buildDshPartnerSupportDirectoryRouteFromFlow\('order-reject', 'orders', orderId\)/);
});

test("partner Expo Router tree covers primary and fail-closed parameterized journeys", async () => {
  const orders = await read("apps/app-partner/runtime/app/orders/index.tsx");
  const account = await read("apps/app-partner/runtime/app/account/[section].tsx");
  const support = await read("apps/app-partner/runtime/app/support/[screenId].tsx");
  const productEdit = await read("apps/app-partner/runtime/app/catalog/products/[productId]/edit.tsx");
  const productMedia = await read("apps/app-partner/runtime/app/catalog/products/[productId]/media.tsx");
  const productControls = await read("apps/app-partner/runtime/app/catalog/products/[productId]/controls.tsx");
  const combined = [orders, account, support, productEdit, productMedia, productControls].join("\n");

  assert.match(combined, /useLocalSearchParams/);
  assert.doesNotMatch(combined, /kind: "order-rejection"/);
  assert.match(combined, /kind: "home"/);
  assert.match(combined, /kind: "support-screen"/);
  assert.match(combined, /kind: "product-edit"/);
  assert.match(combined, /kind: "product-media"/);
  assert.match(combined, /kind: 'product-controls'/);
  assert.match(account, /if \(!section\) return <Redirect href="\/account\/hub" \/>/);
  assert.match(support, /if \(!screenId\) return <Redirect href="\/support" \/>/);
  assert.match(productEdit, /if \(!productId\) return <Redirect href="\/catalog" \/>/);
  assert.match(productMedia, /if \(!productId\) return <Redirect href="\/catalog" \/>/);
  assert.match(productControls, /if \(!productId\) return <Redirect href="\/catalog" \/>/);
});
