import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sourcePath = new URL("../frontend/shared/store/store-discovery.formatters.ts", import.meta.url);
const source = await readFile(sourcePath, "utf8");

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
});
