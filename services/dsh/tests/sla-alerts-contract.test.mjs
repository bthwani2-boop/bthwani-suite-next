import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("pickup and partner-delivery SLA APIs use the shared alert type authority", () => {
  const shared = source("../frontend/shared/sla/sla.types.ts");
  const pickup = source("../frontend/shared/pickup/pickup-sla-alerts.api.ts");
  const partnerDelivery = source("../frontend/shared/partner-delivery/delivery-sla-alerts.api.ts");

  assert.match(shared, /export type DshSlaAlertStatus = "open" \| "acknowledged" \| "resolved";/);
  assert.match(shared, /export type DshSlaRefreshResult = \{/);
  assert.match(pickup, /import type \{ DshSlaAlertStatus, DshSlaRefreshResult \} from "\.\.\/sla\/sla\.types";/);
  assert.match(partnerDelivery, /import type \{ DshSlaAlertStatus, DshSlaRefreshResult \} from "\.\.\/sla\/sla\.types";/);
  assert.match(pickup, /export type DshPickupSLAAlertStatus = DshSlaAlertStatus;/);
  assert.match(partnerDelivery, /export type DshDeliverySLAAlertStatus = DshSlaAlertStatus;/);
  assert.match(pickup, /export type DshRefreshSLAAlertsResult = DshSlaRefreshResult;/);
  assert.match(partnerDelivery, /export type DshRefreshSLAAlertsResult = DshSlaRefreshResult;/);
  assert.doesNotMatch(pickup, /export type DshRefreshSLAAlertsResult = \{/);
  assert.doesNotMatch(partnerDelivery, /export type DshRefreshSLAAlertsResult = \{/);
});

console.log("sla-alerts-contract: PASS");
