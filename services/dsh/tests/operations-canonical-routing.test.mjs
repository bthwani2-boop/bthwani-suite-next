import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const registry = await import("../frontend/shared/operations/operations-registry.ts");
const source = readFileSync(
  "services/dsh/frontend/shared/operations/operations-registry.ts",
  "utf8",
);
const types = readFileSync(
  "services/dsh/frontend/shared/operations/operations.types.ts",
  "utf8",
);
const specialRequests = readFileSync(
  "services/dsh/frontend/shared/special-requests/OperatorSpecialRequestsWorkbench.tsx",
  "utf8",
);
const partnerStores = readFileSync(
  "services/dsh/frontend/control-panel/operations/PartnerStoresScreen.tsx",
  "utf8",
);

test("operations navigation has one canonical group authority", () => {
  assert.equal(
    registry.buildOperationsHref("special-ops", { subGroup: "shein", requestId: "request-1" }),
    "/dsh/operations?workspace=special-ops&requestId=request-1&subGroup=shein",
  );
  assert.equal(
    registry.buildOperationsHref("exceptions", { subGroup: "stores", orderId: "store-1" }),
    "/dsh/operations?workspace=exceptions&orderId=store-1&subGroup=stores",
  );
  assert.equal("normalizeOperationsLocation" in registry, false);
  assert.doesNotMatch(source, /Legacy|LEGACY|normalizeOperationsLocation|sheinproxy|awnak-operations/);
  assert.doesNotMatch(types, /LegacyOperationsWorkspaceId|LegacySectionRedirectId|AnyOperationsWorkspaceId|OperationsNormalizationResult/);
  assert.doesNotMatch(specialRequests, /sheinproxy|awnak-operations/);
  assert.doesNotMatch(partnerStores, /buildOperationsHref\(['"]partner-stores/);
});
