import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

describe("partner unified full-stack SaaS closure", () => {
  test("models tenant-scoped legal partner, brand, store, transfer audit and readiness", () => {
    const migration = read("services/dsh/database/migrations/dsh-958_partner_workspace_store_ownership.sql");
    assert.match(migration, /CREATE TABLE IF NOT EXISTS dsh_partner_brands/);
    assert.match(migration, /tenant_id\s+TEXT\s+NOT NULL/);
    assert.match(migration, /brand_id TEXT REFERENCES dsh_partner_brands/);
    assert.match(migration, /dsh_partner_store_transfer_audit/);
    assert.match(migration, /expected_store_version/);
    assert.match(migration, /dsh_enforce_partner_store_tenant_match/);
    assert.match(migration, /dsh_partner_store_readiness_v/);
  });

  test("separates unrelated runtime stores into sovereign legal partners and scopes", () => {
    const seed = read("services/dsh/database/seeds/local/dsh-958_partner_store_ownership.local.sql");
    for (const id of [
      "prt_partner_local_001",
      "prt_partner_local_002",
      "prt_partner_local_003",
      "prt_partner_local_005",
      "prt_partner_local_006",
      "prt_partner_local_007",
    ]) {
      assert.match(seed, new RegExp(id));
    }
    assert.match(seed, /store-test-grocery'.*prt_partner_local_001|prt_partner_local_001'.*store-test-grocery/s);
    assert.match(seed, /store-1002'.*prt_partner_local_002|prt_partner_local_002'.*store-1002/s);
    assert.match(seed, /store-1005'.*prt_partner_local_005|prt_partner_local_005'.*store-1005/s);
    assert.match(seed, /partner-local-007'.*store-test-electronics/s);
  });

  test("enforces tenant/category pagination and governed ownership transfer", () => {
    const tenantList = read("services/dsh/backend/internal/partner/tenant_list_closure.go");
    const tenantHandler = read("services/dsh/backend/internal/partner/tenant_handler.go");
    const transfer = read("services/dsh/backend/internal/partner/store_ownership_closure.go");

    assert.match(tenantList, /tenant_id = \$1/);
    assert.match(tenantList, /category = \$/);
    assert.match(tenantList, /query\.Limit = 50/);
    assert.match(tenantHandler, /r\.URL\.Query\(\)\.Get\("category"\)/);
    assert.match(transfer, /FOR UPDATE/);
    assert.match(transfer, /ErrStoreOwnershipConflict/);
    assert.match(transfer, /ErrOpenStoreOperations/);
    assert.match(transfer, /version = version \+ 1/);
    assert.match(transfer, /is_visible = false/);
    assert.match(transfer, /dsh_partner_store_transfer_audit/);
  });

  test("computes readiness for every linked store and binds operator, field and partner surfaces", () => {
    const readiness = read("services/dsh/backend/internal/partner/partner_readiness_aggregate.go");
    const routes = read("services/dsh/backend/internal/http/partner_lifecycle_routes.go");
    const selfRoutes = read("services/dsh/backend/internal/http/partner_self_routes.go");

    assert.match(readiness, /FROM dsh_partner_store_readiness_v/);
    assert.match(readiness, /readyCount == len\(stores\)/);
    assert.match(readiness, /StoreSummary/);
    assert.match(readiness, /Stores\s+\[\]StorePublicationReadiness/);
    assert.doesNotMatch(readiness, /LIMIT 1/);
    assert.match(routes, /handleAggregatedPartnerReadiness/);
    assert.match(routes, /handleFieldAggregatedPartnerReadiness/);
    assert.match(selfRoutes, /handlePartnerAggregatedActivationReadiness/);
  });

  test("restores every partner workspace and connects real operational surfaces", () => {
    const registry = read("services/dsh/frontend/shared/partner/partner-registry.ts");
    const queue = read("services/dsh/frontend/control-panel/partners/PartnersReviewQueueScreen.tsx");
    const detail = read("services/dsh/frontend/control-panel/partners/PartnerDetailUnifiedScreen.tsx");
    const barrel = read("services/dsh/frontend/control-panel/partners/index.ts");

    for (const tab of [
      "inbox",
      "activation",
      "documents",
      "field_readiness",
      "readiness_approvals",
      "catalog_exceptions",
      "performance",
      "promotion_eligibility",
      "service_levels",
      "contracts",
      "deactivation",
      "stores",
      "all_partners",
    ]) {
      assert.match(registry, new RegExp(`'${tab}'`));
    }
    assert.match(queue, /useControlPanelSession/);
    assert.match(queue, /StoreManagementScreen/);
    assert.match(queue, /FieldReadinessQueueScreen/);
    assert.match(queue, /PartnerCreatePanel/);
    assert.match(detail, /useControlPanelSession/);
    assert.match(detail, /useGovernedPartnerStoresController/);
    assert.match(detail, /aggregate\.stores/);
    assert.match(barrel, /PartnerDetailUnifiedScreen as PartnerDetailScreen/);
  });

  test("passes category from UI to runtime and eliminates repeated client-home stores", () => {
    const controller = read("services/dsh/frontend/shared/partner/partner-workspace.controller.tsx");
    const list = read("services/dsh/frontend/control-panel/partners/PartnerListScreen.tsx");
    const groups = read("services/dsh/frontend/shared/home-discovery/home-discovery.groups.ts");
    const shell = read("services/dsh/frontend/app-client/home-discovery/HomeDiscoveryShell.tsx");

    assert.match(controller, /query\.set\('category'|query\.set\("category"/);
    assert.match(list, /controller\.filters\.category/);
    assert.match(groups, /claimed\.has\(store\.id\)/);
    assert.match(groups, /feedStores/);
    assert.match(shell, /presentation\.feedStores/);
  });
});
