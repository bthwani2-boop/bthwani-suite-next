import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const backend = fs.readFileSync(new URL("../backend/internal/http/analytics.go", import.meta.url), "utf8");
const api = fs.readFileSync(new URL("../frontend/shared/analytics/analytics.api.ts", import.meta.url), "utf8");
const panel = fs.readFileSync(new URL("../frontend/app-partner/account/PartnerAnalyticsInsightsPanel.tsx", import.meta.url), "utf8");
const hub = fs.readFileSync(new URL("../frontend/app-partner/account/PartnerHubScreen.tsx", import.meta.url), "utf8");
const contract = fs.readFileSync(new URL("../contracts/paths/analytics.paths.yaml", import.meta.url), "utf8");
const schema = fs.readFileSync(new URL("../contracts/components/schemas/partner.schemas.yaml", import.meta.url), "utf8");

test("partner analytics authorizes the explicitly selected store server-side", () => {
  const handler = backend.slice(backend.indexOf("func (s *protectedStoreServer) handlePartnerPerformance"));
  assert.match(handler, /requireActor\(w, r, "partner"\)/);
  assert.match(handler, /storeID := strings\.TrimSpace\(r\.URL\.Query\(\)\.Get\("storeId"\)\)/);
  assert.match(handler, /ResolveActorStoreForID\(r\.Context\(\), s\.db, actor, storeID\)/);
  assert.doesNotMatch(handler, /partnerStore\(w, r\)/);
});

test("partner analytics clients cannot fall back to an implicit store", () => {
  assert.match(api, /storeId: string/);
  assert.match(api, /storeId is required for partner performance/);
  assert.match(api, /queryString\(\{ period, storeId: normalizedStoreId \}\)/);
  assert.match(panel, /لا يوجد متجر محدد لقراءة أداء المتجر من DSH/);
  assert.match(panel, /fetchPartnerPerformance\(period, canonicalStoreId\)/);
  assert.match(hub, /<AnalyticsInsightsPanel storeName=\{storeName\} canonicalStoreId=\{canonicalStoreId\} \/>/);
});

test("partner analytics contract requires the selected store identifier", () => {
  const endpoint = contract.slice(contract.indexOf("/dsh/partner/analytics/performance:"));
  assert.match(endpoint, /- name: storeId[\s\S]*?in: query[\s\S]*?required: true/);
  assert.match(endpoint, /explicitly selected authorized store/);
  const responseSchema = schema.slice(schema.indexOf("DshPartnerPerformanceResponse:"));
  assert.match(responseSchema, /readState/);
  assert.match(responseSchema, /freshnessSeconds/);
  assert.match(responseSchema, /lineage/);
});

test("partner analytics has one canonical client owner", () => {
  assert.doesNotMatch(fs.readFileSync(new URL("../frontend/shared/partner/partner.api.ts", import.meta.url), "utf8"), /function fetchPartnerPerformance/);
  assert.match(fs.readFileSync(new URL("../frontend/shared/partner/index.ts", import.meta.url), "utf8"), /export \{ fetchPartnerPerformance \} from "\.\.\/analytics\/analytics\.api"/);
});
