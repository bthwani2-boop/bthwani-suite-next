import assert from "node:assert/strict";
import { describe, it } from "node:test";

const contract = await import("../dist/services/dsh/frontend/shared/delivery/captain.contract.js");
const deepLink = await import("../dist/services/dsh/frontend/shared/delivery/captain-deep-link.js");

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

  it("binds registered owners to the live Captain renderers", () => {
    const expected = {
      "dsh-captain-order-chat": ["dsh/frontend/app-captain/account/CaptainSupportScreenRouter.tsx", "CaptainSupportScreenRouter"],
      "dsh-captain-bell": ["dsh/frontend/app-captain/DshCaptainRouteRenderer.tsx", "DshCaptainRouteRenderer"],
      "dsh-captain-account-profile": ["dsh/frontend/app-captain/DshCaptainRouteRenderer.tsx", "DshCaptainRouteRenderer"],
      "dsh-captain-account-finance": ["wlt/frontend/app-captain/finance/WltCaptainFinanceScreen.tsx", "WltCaptainFinanceScreen"],
      "dsh-captain-map": ["dsh/frontend/app-captain/DshCaptainOrderJourneyRenderer.tsx", "OperationalCaptainExecutionScreen"],
    };
    for (const [routeId, [ownerPath, componentName]] of Object.entries(expected)) {
      const item = contract.getDshCaptainScreenRegistryItem(routeId);
      assert.equal(item.ownerPath, ownerPath);
      assert.equal(item.componentName, componentName);
      assert.equal(item.status, "VERIFIED");
    }
  });

  it("resolves only declared Captain deep links to navigation commands", () => {
    assert.equal(deepLink.captainNavigationTargetFromDeepLink("bthwani-captain-next://captain/dsh"), "home");
    assert.equal(deepLink.captainNavigationTargetFromDeepLink("bthwani-captain-next://captain/dsh/orders/map"), "map");
    assert.equal(deepLink.captainNavigationTargetFromDeepLink("bthwani-client-next://captain/dsh/orders/map"), null);
    assert.equal(deepLink.captainNavigationTargetFromDeepLink("bthwani-captain-next://captain/dsh/orders/map?assignment=other"), "map");
  });
});
