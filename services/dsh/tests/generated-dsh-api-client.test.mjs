import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../clients/generated/dsh-api.ts", import.meta.url),
  "utf8",
);

describe("generated DSH API client coverage", () => {
  test("includes DSH-004 cart operations and schemas", () => {
    assert.match(source, /"\/dsh\/client\/cart"/);
    assert.match(source, /upsertDshCartItem/);
    assert.match(source, /checkDshCartServiceability/);
    assert.match(source, /DshCartResponse/);
  });

  test("includes DSH-005 checkout intent operations and schemas", () => {
    assert.match(source, /"\/dsh\/client\/checkout-intents"/);
    assert.match(source, /createDshCheckoutIntent/);
    assert.match(source, /cancelDshCheckoutIntent/);
    assert.match(source, /DshCheckoutIntentResponse/);
  });

  test("includes DSH-006 order operations and schemas", () => {
    assert.match(source, /"\/dsh\/partner\/orders"/);
    assert.match(source, /createDshOrder/);
    assert.match(source, /acceptDshOrder/);
    assert.match(source, /markDshOrderReadyForPickup/);
    assert.match(source, /DshOrdersResponse/);
  });

  test("includes DSH-007 dispatch operations and schemas", () => {
    assert.match(source, /"\/dsh\/operator\/dispatch\/assignments"/);
    assert.match(source, /createDshAssignment/);
    assert.match(source, /updateDshDeliveryStatus/);
    assert.match(source, /submitDshPoD/);
    assert.match(source, /DshDispatchAssignmentResponse/);
  });

  test("includes DSH-011 notification operations and schemas", () => {
    assert.match(source, /listDshNotifications/);
    assert.match(source, /markDshNotificationRead/);
    assert.match(source, /markAllDshNotificationsRead/);
    assert.match(source, /DshNotificationsListResponse/);
  });

  test("includes DSH-012 marketing operations and schemas", () => {
    assert.match(source, /listDshCampaigns/);
    assert.match(source, /createDshCampaign/);
    assert.match(source, /listDshMarketingBanners/);
    assert.match(source, /DshCampaignsListResponse/);
  });

  test("includes DSH-013 platform policy operations and schemas", () => {
    assert.match(source, /listDshZones/);
    assert.match(source, /getDshSlaRules/);
    assert.match(source, /getDshCapacityConfig/);
    assert.match(source, /DshZonesListResponse/);
  });

  test("includes DSH-014 administration operations and schemas", () => {
    assert.match(source, /listDshAdminRoles/);
    assert.match(source, /listDshPartnerActivations/);
    assert.match(source, /activateDshPartner/);
    assert.match(source, /DshAdminAuditListResponse/);
  });
});
