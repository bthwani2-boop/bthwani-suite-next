import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("partner app composes canonical identity, rating, catalog media, and push boundaries", async () => {
  const source = await read("apps/app-partner/runtime/src/App.tsx");

  assert.match(source, /requiredRole="partner"/);
  assert.match(source, /requiredSurface="app-partner"/);
  assert.match(source, /<PartnerFieldRatingGate>/);
  assert.match(source, /<DshPartnerSurface \/>/);
  assert.match(source, /configureCatalogMobileFilePicker\(pickCatalogFile\)/);
  assert.match(source, /DocumentPicker\.getDocumentAsync/);
  assert.match(source, /copyToCacheDirectory: true/);
  assert.match(source, /configureIdentityDeviceFingerprintProvider/);
  assert.match(source, /SecureStore/);
  assert.match(source, /randomUUID/);
  assert.match(source, /useDshMobilePushRegistration\(identity\.state\.kind, "app-partner", "bthwani-partner-next"\)/);
});

test("partner field rating keeps failures visible and confirms canonical completion readback", async () => {
  const source = await read("services/dsh/frontend/app-partner/ratings/PartnerFieldRatingGate.tsx");

  assert.match(source, /setPromptError\("تعذر تحميل حالة التقييم/);
  assert.match(source, /const committedPrompt = await fetchPartnerFieldRatingPrompt\(\)/);
  assert.match(source, /if \(!committedPrompt\.completed\)/);
  assert.match(source, /accessibilityLiveRegion="polite"/);
  assert.doesNotMatch(source, /\.catch\(\(\) => \{ if \(!cancelled\) setPrompt\(null\); \}\)/);
});

test("partner order mutations carry server version and durable idempotency headers", async () => {
  const api = await read("services/dsh/frontend/shared/orders/orders.api.ts");
  const controller = await read("services/dsh/frontend/shared/orders/use-partner-order-commands.ts");
  const decisionScreen = await read("services/dsh/frontend/app-partner/orders/OperationalOrderDecisionScreen.tsx");
  const schema = await read("services/dsh/contracts/components/schemas/orders.schemas.yaml");

  assert.match(schema, /required: \[id, version,/);
  assert.match(api, /expectedVersion: options\.expectedVersion/);
  assert.match(api, /idempotencyKey: options\.idempotencyKey \?\? corrId\("partner-order-command"\)/);
  assert.match(controller, /expectedVersion\?: number/);
  assert.match(controller, /idempotencyKey: corrId\('partner-order-command'\)/);
  assert.match(decisionScreen, /commands\.execute\('accept', orderId, order\?\.version\)/);
});

test("partner surface exposes explicit store-scope loading, empty, error, and operational navigation", async () => {
  const source = await read("services/dsh/frontend/app-partner/DshPartnerSurface.tsx");

  assert.match(source, /if \(!selectedStoreScope\)/);
  assert.match(source, /if \(isLoadingScopes\)/);
  assert.match(source, /<ActivityIndicator/);
  assert.match(source, /scopesError \? 'حدث خطأ أثناء تحميل الفروع' : 'لا يوجد فروع مسجلة'/);
  assert.match(source, /refreshOrders=\{actions\.refreshOrders\}/);
  assert.match(source, /openInventoryManagement/);
  assert.match(source, /openOrdersBoard/);
  assert.match(source, /openStoreScope/);
  assert.match(source, /id: 'wallet'/);
  assert.match(source, /id: 'orders'/);
  assert.match(source, /id: 'inventory'/);
});

test("partner client visibility keeps unknown serviceability and store-open state closed", async () => {
  const source = await read("services/dsh/frontend/shared/partner/dsh-client-visibility.model.ts");

  assert.match(source, /if \(typeof options\.inZone === 'boolean'\) return options\.inZone;/);
  assert.match(source, /return false;/);
  assert.match(source, /options\.storeOpen \?\? false/);
  assert.doesNotMatch(source, /options\.storeOpen \?\? true/);
});
