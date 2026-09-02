import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourcePath = new URL("../frontend/shared/store/store-discovery.formatters.ts", import.meta.url);
const source = await readFile(sourcePath, "utf8");
const operationsSourcePath = new URL(
  "../frontend/control-panel/operations/PartnerStoresScreen.tsx",
  import.meta.url,
);
const operationsSource = await readFile(operationsSourcePath, "utf8");
const cartSource = await readFile(
  new URL("../frontend/app-client/cart/CartScreen.tsx", import.meta.url),
  "utf8",
);
const cartAddressSource = await readFile(
  new URL("../frontend/app-client/cart/CartAddressSection.tsx", import.meta.url),
  "utf8",
);
const serviceabilitySource = await readFile(
  new URL("../backend/internal/cart/serviceability.go", import.meta.url),
  "utf8",
);
const cartBackendSource = await readFile(
  new URL("../backend/internal/cart/cart.go", import.meta.url),
  "utf8",
);

test("store fulfillment normalization accepts only the canonical delivery-mode enum", () => {
  assert.match(
    source,
    /export function toFulfillmentMode\(mode: DshDeliveryMode\): DshFulfillmentDeliveryMode/,
  );
  assert.match(source, /export function toFulfillmentModes\(\s*modes: readonly DshDeliveryMode\[\]/);
  assert.doesNotMatch(source, /toFulfillmentMode[\s\S]*\?\?\s*["']partner_delivery["']/);
});

test("store discovery remains the sole formatter-owned mode translation", () => {
  assert.match(
    source,
    /const DELIVERY_MODE_TO_FULFILLMENT_MODE: Record<DshDeliveryMode, DshFulfillmentDeliveryMode>/,
  );
  assert.match(source, /delivery: "partner_delivery"/);
  assert.match(source, /express: "bthwani_delivery"/);
  assert.match(source, /pickup: "pickup"/);
  assert.match(source, /export function formatFulfillmentModes\(/);
  assert.match(source, /getDshDeliveryModeDefinition\(mode\)\.label/);
});

test("partner operations preserves the canonical delivery-mode meaning", () => {
  assert.match(
    operationsSource,
    /deliveryModes: toFulfillmentModes\(row\.deliveryModes\)/,
  );
  assert.doesNotMatch(
    operationsSource,
    /deliveryMode: row\.deliveryModes\.includes\(/,
  );
  assert.match(operationsSource, /formatFulfillmentModes\(store\.deliveryModes\)/);
});

test("checkout exposes only store-enabled modes and rechecks the selected mode", () => {
  assert.match(cartSource, /store\?\.availableFulfillmentModes/);
  assert.match(cartSource, /serviceabilityController\.serviceability\.availableModes/);
  assert.match(cartSource, /getDshDeliveryModeDefinition\(mode\)\.label/);
  assert.doesNotMatch(cartSource, /toggleFulfillmentMode/);
  assert.match(cartAddressSource, /fulfillmentMode,\s*serviceabilityState/);
  assert.match(cartAddressSource, /selectedAddress\.id,\s*fulfillmentMode/);
});

test("mode capability responses consume live operational policy truth", () => {
  assert.match(serviceabilitySource, /func applyOperationalModePolicies\(/);
  assert.match(serviceabilitySource, /modes\[index\]\.UnavailableReasonCode/);
  assert.match(cartBackendSource, /applyOperationalModePolicies\(ctx, db, storeID, modes\)/);
});
