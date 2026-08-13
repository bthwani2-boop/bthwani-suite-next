import assert from "node:assert/strict";
import { describe, it } from "node:test";

const contract = await import("../dist/services/dsh/frontend/shared/delivery/captain.contract.js");

describe("Captain route and screen registry", () => {
  it("keeps every live route canonical and screen-registered", () => {
    const routeRecords = contract.DSH_CAPTAIN_ROUTE_RECORDS;
    const screenRegistry = contract.DSH_CAPTAIN_SCREEN_REGISTRY;
    const screenRouteIds = new Set(screenRegistry.map((item) => item.routeId));

    assert.equal(new Set(routeRecords.map((record) => record.legacyRoute)).size, routeRecords.length);
    assert.equal(routeRecords.length, 18);
    assert.equal(screenRegistry.length, 19);
    assert.ok(!routeRecords.some((record) => record.legacyRoute === "store-pickup-context"));

    for (const record of routeRecords) {
      assert.ok(screenRouteIds.has(record.routeId), `missing screen registry entry for ${record.routeId}`);
      assert.deepEqual(contract.getDshCaptainRouteRecord(record.legacyRoute), record);
      assert.equal(contract.getDshCaptainScreenRegistryItem(record.routeId).routeId, record.routeId);
    }
  });
});
