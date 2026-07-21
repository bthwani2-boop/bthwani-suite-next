import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

describe("JRN-007 home discovery closure", () => {
  test("binds the standalone event contract to the Go route and shared adapter", () => {
    const contract = read("services/dsh/contracts/dsh.home-marketing-events.openapi.yaml");
    const registry = read("services/dsh/contracts/contract-registry.ts");
    const master = read("contracts/master.openapi.yaml");
    const server = read("services/dsh/backend/internal/http/server.go");
    const adapter = read("services/dsh/frontend/shared/home-discovery/home-discovery-events.ts");

    assert.match(contract, /\/dsh\/home-discovery\/events:/);
    assert.match(contract, /eventType:[\s\S]*impression, click/);
    assert.match(registry, /dsh-home-marketing-events/);
    assert.match(registry, /STANDALONE_MANUAL_TYPED_ADAPTER/);
    assert.match(master, /dshHomeMarketingEvents/);
    assert.match(server, /POST \/dsh\/home-discovery\/events/);
    assert.match(adapter, /recordHomeMarketingEvent/);
    assert.match(adapter, /method: "POST"/);
  });

  test("binds real impressions, clicks, and every governed action in app-client", () => {
    const shell = read("services/dsh/frontend/app-client/home-discovery/HomeDiscoveryShell.tsx");
    const surface = read("services/dsh/frontend/app-client/DshClientSurface.tsx");

    assert.match(shell, /eventType: "impression"/);
    assert.match(shell, /eventType: "click"/);
    assert.match(shell, /onBannerPress=\{handleBannerPress\}/);
    assert.match(shell, /onPromoPress=\{handlePromoPress\}/);
    assert.match(shell, /actionType === "category"/);
    assert.match(shell, /setActiveCategoryId\(target\)/);
    assert.match(surface, /actionType === "store"/);
    assert.match(surface, /actionType === "external"/);
    assert.match(surface, /Linking\.openURL/);
  });

  test("keeps the control-panel editor governed and free of literal inline style objects", () => {
    const panel = read("services/dsh/frontend/control-panel/marketing/components/MarketingHomeDiscoveryPanel.tsx");
    const controller = read("services/dsh/frontend/shared/home-discovery/use-home-discovery-admin-controller.tsx");

    assert.match(controller, /editorOpen/);
    assert.match(controller, /expectedVersion: item\.version/);
    assert.match(panel, /publicationStatus/);
    assert.match(panel, /publishFrom/);
    assert.match(panel, /publishUntil/);
    assert.doesNotMatch(panel, /style=\{\{/);
  });
});
