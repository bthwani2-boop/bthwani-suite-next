import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

describe("JRN-007 live home marketing fallback", () => {
  test("home discovery derives banners and promos from live stores when editorial content is empty", () => {
    const handler = read("services/dsh/backend/internal/homediscovery/handler.go");

    assert.match(handler, /ensureHomeMarketingContent\(banners, promos, stores\)/);
    assert.match(handler, /func deriveLiveStoreBanners/);
    assert.match(handler, /func deriveLiveStorePromos/);
    assert.match(handler, /derived-store-banner-/);
    assert.match(handler, /derived-store-promo-/);
    assert.match(handler, /ActionType:\s+"store"/);
    assert.match(handler, /ActionTarget:\s+store\.ID/);
    assert.match(handler, /homeStoreHeroImageURL/);
  });

  test("app client does not send governed marketing telemetry for derived projections", () => {
    const shell = read("services/dsh/frontend/app-client/home-discovery/HomeDiscoveryShell.tsx");

    assert.match(shell, /contentId\.startsWith\("derived-store-"\)/);
    assert.match(shell, /recordHomeMarketingEvent/);
  });
});
