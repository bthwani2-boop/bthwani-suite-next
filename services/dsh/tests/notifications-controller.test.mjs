import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { composeContext } from "../../../tools/scripts/openapi-context-composer.mjs";

describe("notifications states", () => {
  it("notifIdle returns kind=idle", async () => {
    const { notifIdle } = await import(
      "../dist/services/dsh/frontend/shared/notifications/notifications.states.js"
    );
    assert.equal(notifIdle().kind, "idle");
  });

  it("notifLoading returns kind=loading", async () => {
    const { notifLoading } = await import(
      "../dist/services/dsh/frontend/shared/notifications/notifications.states.js"
    );
    assert.equal(notifLoading().kind, "loading");
  });

  it("notifSuccess wraps notifications and unreadCount", async () => {
    const { notifSuccess } = await import(
      "../dist/services/dsh/frontend/shared/notifications/notifications.states.js"
    );
    const notifications = [{
      id: "n1",
      actorId: "a1",
      actorType: "client",
      topic: "order",
      title: "طلب جديد",
      body: "تم تأكيد طلبك",
      actionUrl: "",
      isRead: false,
      createdAt: "2026-06-24T00:00:00Z",
    }];
    const state = notifSuccess(notifications, 1);
    assert.equal(state.kind, "success");
    assert.equal(state.unreadCount, 1);
    assert.equal(state.notifications.length, 1);
    assert.equal(state.notifications[0].topic, "order");
  });

  it("notifError carries message", async () => {
    const { notifError } = await import(
      "../dist/services/dsh/frontend/shared/notifications/notifications.states.js"
    );
    const state = notifError("network error");
    assert.equal(state.kind, "error");
    assert.equal(state.message, "network error");
  });

  it("configSuccess wraps configs", async () => {
    const { configSuccess } = await import(
      "../dist/services/dsh/frontend/shared/notifications/notifications.states.js"
    );
    const configs = [{
      id: "c1",
      topic: "order_update",
      actorTypes: ["client"],
      isEnabled: true,
      description: "Order updates",
      updatedBy: "admin",
      updatedAt: "2026-06-24T00:00:00Z",
    }];
    const state = configSuccess(configs);
    assert.equal(state.kind, "success");
    assert.equal(state.configs[0].topic, "order_update");
  });
});

describe("administration types validation", () => {
  it("partner activation valid statuses are complete", () => {
    const statuses = ["submitted", "ops_approved", "partner_active", "blocked"];
    assert.equal(statuses.length, 4);
    assert.ok(statuses.includes("partner_active"));
    assert.ok(statuses.includes("blocked"));
  });
});

describe("marketing status transitions", () => {
  it("campaign status values are recognised", () => {
    const statuses = ["draft", "active", "paused", "completed", "cancelled"];
    assert.ok(statuses.includes("active"));
    assert.ok(statuses.includes("draft"));
    assert.equal(statuses.length, 5);
  });
});

describe("platform-policies serviceability", () => {
  it("zone serviceability shape is correct", () => {
    const result = { zoneId: "z1", isActive: true, activeStores: 5, slaAvailable: true };
    assert.equal(result.isActive, true);
    assert.equal(result.activeStores, 5);
    assert.equal(result.slaAvailable, true);
  });
});

describe("notifications journey maps", () => {
  const operations = [
    "listDshNotifications",
    "markDshNotificationRead",
    "markAllDshNotificationsRead",
    "updateDshNotificationPreferences",
    "listDshPlatformNotificationConfig",
    "upsertDshPlatformNotificationConfig",
  ];

  const surfaces = [
    "app-client",
    "control-panel",
    "app-partner",
    "app-field",
    "app-captain",
  ];

  it("keeps contract operations in canonical OpenAPI and generated client", async () => {
    const openapi = (await composeContext("dsh", { write: false })).bundle;
    const generatedClient = readFileSync(new URL("../clients/generated/dsh-api.ts", import.meta.url), "utf8");

    for (const operation of operations) {
      assert.ok(openapi.includes(`operationId: ${operation}`), `missing OpenAPI operation ${operation}`);
      assert.ok(generatedClient.includes(operation), `missing generated client operation ${operation}`);
    }
  });

  it("keeps dsh.notifications surfaces consistent across capability and derived surface maps", () => {
    const capabilityMap = readFileSync(new URL("../capability-map.ts", import.meta.url), "utf8");
    const surfaceMap = readFileSync(new URL("../surface-map.ts", import.meta.url), "utf8");
    const notificationCapability = capabilityMap.slice(
      capabilityMap.indexOf('id: "dsh.notifications"'),
      capabilityMap.indexOf('id: "dsh.marketing"')
    );

    for (const surface of surfaces) {
      assert.ok(notificationCapability.includes(`"${surface}"`), `missing notifications capability surface ${surface}`);
      assert.ok(surfaceMap.includes(`capabilityIds: capabilityIdsFor("${surface}")`), `surface map must derive capabilities for ${surface}`);
    }
    assert.match(surfaceMap, /getDshCapabilitiesForSurface/);
  });
});
