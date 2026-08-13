import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const backend = fs.readFileSync(new URL("../backend/internal/http/analytics.go", import.meta.url), "utf8");
const api = fs.readFileSync(new URL("../frontend/shared/analytics/analytics.api.ts", import.meta.url), "utf8");
const panel = fs.readFileSync(new URL("../frontend/app-partner/account/PartnerAnalyticsInsightsPanel.tsx", import.meta.url), "utf8");
const contract = fs.readFileSync(new URL("../contracts/paths/analytics.paths.yaml", import.meta.url), "utf8");

test("partner analytics authorizes the explicitly selected store server-side", () => {
  const handler = backend.slice(backend.indexOf("func (s *protectedStoreServer) handlePartnerPerformance"));
  assert.match(handler, /requireActor\(w, r, "partner"\)/);
  assert.match(handler, /storeID := strings\.TrimSpace\(r\.URL\.Query\(\)\.Get\("storeId"\)\)/);
  assert.match(handler, /ResolveActorStoreForID\(r\.Context\(\), s\.db, s\.workforce, actor, storeID\)/);
  assert.doesNotMatch(handler, /partnerStore\(w, r\)/);
});

test("partner analytics clients cannot fall back to an implicit store", () => {
  assert.match(api, /storeId: string/);
  assert.match(api, /storeId is required for partner performance/);
  assert.match(api, /queryString\(\{ period, storeId: normalizedStoreId \}\)/);
  assert.match(panel, /لا يوجد متجر محدد لقراءة أداء المتجر من DSH/);
  assert.match(panel, /fetchPartnerPerformance\(period, canonicalStoreId\)/);
});

test("partner analytics contract requires the selected store identifier", () => {
  const endpoint = contract.slice(contract.indexOf("/dsh/partner/analytics/performance:"));
  assert.match(endpoint, /- name: storeId[\s\S]*?in: query[\s\S]*?required: true/);
  assert.match(endpoint, /explicitly selected authorized store/);
});
