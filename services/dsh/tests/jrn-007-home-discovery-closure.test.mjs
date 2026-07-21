import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

describe("JRN-007 home discovery slice closure", () => {
  test("S1 renders categories, filters, stores, and real derived groups", () => {
    const groups = read("services/dsh/frontend/shared/home-discovery/home-discovery.groups.ts");
    const groupSection = read("services/dsh/frontend/app-client/home-discovery/HomeStoreGroupsSection.tsx");
    const shell = read("services/dsh/frontend/app-client/home-discovery/HomeDiscoveryShell.tsx");

    assert.match(groups, /stores\.filter\(\(store\) => store\.isPopular\)/);
    assert.match(groups, /store\.hasCouponBadge \|\| store\.isFreeDelivery/);
    assert.match(groups, /pointsMultiplier/);
    assert.doesNotMatch(groups, /mock|fixture|placeholderStore/i);
    assert.match(groupSection, /group\.stores\.map/);
    assert.match(shell, /buildHomeStoreGroups\(stores\)/);
    assert.match(shell, /HomeStoreGroupsSection/);
    assert.match(shell, /categories\.map/);
    assert.match(shell, /HomeFilterRailSection/);
    assert.match(shell, /HomeStoreFeedSection/);
  });

  test("S2 governs promotional links, actions, and media", () => {
    const admin = read("services/dsh/backend/internal/homediscovery/admin.go");
    const repository = read("services/dsh/backend/internal/homediscovery/repository.go");
    const panel = read("services/dsh/frontend/control-panel/marketing/components/MarketingHomeDiscoveryPanel.tsx");
    const surface = read("services/dsh/frontend/app-client/DshClientSurface.tsx");

    assert.match(admin, /validateHomeMediaURL/);
    assert.match(admin, /\/dsh\/public\/media\//);
    assert.match(admin, /external action target must be an http or https URL/);
    assert.match(repository, /action_type <> 'store'/);
    assert.match(repository, /action_type <> 'category'/);
    assert.match(panel, /isSafeMediaUrl/);
    assert.match(surface, /actionType === "store"/);
    assert.match(surface, /actionType === "external"/);
    assert.match(surface, /Linking\.openURL/);
  });

  test("S3 persists priority, region, service-area, and audience targeting", () => {
    const migration = read("services/dsh/database/migrations/dsh-098_home_discovery_targeting.sql");
    const targeting = read("services/dsh/backend/internal/homediscovery/targeting.go");
    const repository = read("services/dsh/backend/internal/homediscovery/repository.go");
    const server = read("services/dsh/backend/internal/http/server.go");
    const overlay = read("services/dsh/contracts/dsh.home-discovery.overlay.yaml");
    const client = read("services/dsh/frontend/shared/home-discovery/home-discovery.api.ts");
    const panel = read("services/dsh/frontend/control-panel/marketing/components/MarketingHomeDiscoveryPanel.tsx");

    assert.match(migration, /dsh_home_content_targets/);
    assert.match(migration, /target_type IN \('city','service_area','audience'\)/);
    assert.match(migration, /guest','authenticated/);
    assert.match(targeting, /ReplaceAdminTargeting/);
    assert.match(repository, /target_type = 'city'/);
    assert.match(repository, /target_type = 'service_area'/);
    assert.match(repository, /target_type = 'audience'/);
    assert.match(repository, /ORDER BY b\.sort_order ASC/);
    assert.match(server, /\/targeting"/);
    assert.match(overlay, /audienceSegment/);
    assert.match(client, /audienceSegment/);
    assert.match(panel, /المدن المستهدفة/);
    assert.match(panel, /مناطق الخدمة المستهدفة/);
    assert.match(panel, /الجمهور المستهدف/);
  });

  test("S4 enforces draft, publication, schedule, expiry, pause, and archive", () => {
    const admin = read("services/dsh/backend/internal/homediscovery/admin.go");
    const repository = read("services/dsh/backend/internal/homediscovery/repository.go");
    const panel = read("services/dsh/frontend/control-panel/marketing/components/MarketingHomeDiscoveryPanel.tsx");

    assert.match(admin, /"draft", "published", "paused", "archived"/);
    assert.match(admin, /publishUntil must be after publishFrom/);
    assert.match(repository, /publication_status = 'published'/);
    assert.match(repository, /publish_from IS NULL OR/);
    assert.match(repository, /publish_until IS NULL OR/);
    assert.match(panel, /publicationStatus/);
    assert.match(panel, /publishFrom/);
    assert.match(panel, /publishUntil/);
  });

  test("S5 exposes permissioned CRUD with OCC and draft-safe targeting publication", () => {
    const server = read("services/dsh/backend/internal/http/server.go");
    const protectedHandlers = read("services/dsh/backend/internal/http/protected_store.go");
    const controller = read("services/dsh/frontend/shared/home-discovery/use-home-discovery-admin-controller.tsx");
    const panel = read("services/dsh/frontend/control-panel/marketing/components/MarketingHomeDiscoveryPanel.tsx");

    assert.match(server, /POST \/dsh\/operator\/home-discovery\/\{kind\}/);
    assert.match(server, /PATCH \/dsh\/operator\/home-discovery\/\{kind\}\/\{itemId\}/);
    assert.match(server, /DELETE \/dsh\/operator\/home-discovery\/\{kind\}\/\{itemId\}/);
    assert.match(protectedHandlers, /MarketingPermissionManage/);
    assert.match(controller, /expectedVersion: item\.version/);
    assert.match(controller, /publicationStatus: "draft"/);
    assert.match(controller, /replaceHomeDiscoveryTargeting/);
    assert.match(controller, /publicationStatus: "published"/);
    assert.match(panel, /editorOpen/);
    assert.doesNotMatch(panel, /style=\{\{/);
  });

  test("S6 keeps home content ownership separate from Marketing Command Deck", () => {
    const retirement = read("services/dsh/database/migrations/dsh-018_retire_marketing_banners_promos.sql");
    const homeMigration = read("services/dsh/database/migrations/dsh-002_home_discovery.sql");
    const admin = read("services/dsh/backend/internal/homediscovery/admin.go");
    const marketingRoutes = read("services/dsh/backend/internal/http/server.go");

    assert.match(retirement, /DROP TABLE IF EXISTS dsh_marketing_banners/);
    assert.match(retirement, /DROP TABLE IF EXISTS dsh_marketing_promos/);
    assert.match(homeMigration, /CREATE TABLE IF NOT EXISTS dsh_home_banners/);
    assert.match(homeMigration, /CREATE TABLE IF NOT EXISTS dsh_home_promos/);
    assert.match(admin, /return "dsh_home_banners"/);
    assert.match(admin, /return "dsh_home_promos"/);
    assert.doesNotMatch(marketingRoutes, /operator\/marketing\/(banners|promos)/);
  });

  test("S7 renders actual client content and explicit empty, error, and offline states", () => {
    const api = read("services/dsh/frontend/shared/home-discovery/home-discovery.api.ts");
    const states = read("services/dsh/frontend/shared/home-discovery/home-discovery.states.ts");
    const shell = read("services/dsh/frontend/app-client/home-discovery/HomeDiscoveryShell.tsx");

    assert.match(api, /dto\.banners\.map/);
    assert.match(api, /dto\.promos\.map/);
    assert.match(api, /dto\.stores\.map/);
    assert.match(states, /kind: 'empty'/);
    assert.match(states, /kind: 'error'/);
    assert.match(states, /kind: 'service_unavailable'/);
    assert.match(shell, /EmptyState/);
    assert.match(shell, /ErrorState/);
    assert.match(shell, /OfflineState/);
  });

  test("S8 persists only context-valid telemetry and deduplicates impressions", () => {
    const contract = read("services/dsh/contracts/dsh.home-marketing-events.openapi.yaml");
    const registry = read("services/dsh/contracts/contract-registry.ts");
    const master = read("contracts/master.openapi.yaml");
    const events = read("services/dsh/backend/internal/homediscovery/events.go");
    const dedup = read("services/dsh/database/migrations/dsh-099_home_marketing_impression_dedup.sql");
    const adapter = read("services/dsh/frontend/shared/home-discovery/home-discovery-events.ts");
    const shell = read("services/dsh/frontend/app-client/home-discovery/HomeDiscoveryShell.tsx");

    assert.match(contract, /\/dsh\/home-discovery\/events:/);
    assert.match(contract, /viewerRef/);
    assert.match(contract, /audienceSegment/);
    assert.match(registry, /dsh-home-marketing-events/);
    assert.match(registry, /STANDALONE_MANUAL_TYPED_ADAPTER/);
    assert.match(master, /dshHomeMarketingEvents/);
    assert.match(events, /content not publishable for context/);
    assert.match(events, /dsh_home_content_targets/);
    assert.match(events, /ON CONFLICT DO NOTHING/);
    assert.match(dedup, /CREATE UNIQUE INDEX/);
    assert.match(adapter, /recordHomeMarketingEvent/);
    assert.match(shell, /viewerRef/);
    assert.match(shell, /eventType|emitMarketingEvent/);
    assert.match(shell, /state\.data\.context/);
  });
});
