import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const registry = JSON.parse(read("contracts/jrn-006-slice-verification-registry.json"));

test("JRN-006 registers exactly eight executable slices", () => {
  assert.equal(registry.journeyId, "JRN-006");
  assert.equal(registry.slices.length, 8);
  assert.deepEqual(
    registry.slices.map((slice) => slice.sliceId),
    Array.from({ length: 8 }, (_, index) => `JRN-006-S${String(index + 1).padStart(2, "0")}`),
  );
  for (const slice of registry.slices) {
    assert.match(slice.status, /^(IMPLEMENTED_PENDING_VERIFICATION|CLOSED_WITH_EVIDENCE)$/);
    assert.ok(slice.owners.length > 0);
    assert.ok(slice.invariants.length > 0);
  }
});

test("JRN-006-S01 governs location search and rejects malformed provider truth", () => {
  const provider = read("backend/internal/mapproviders/client.go");
  const searchTest = read("backend/internal/mapproviders/search_validation_test.go");
  const mapApi = read("frontend/shared/client-map/client-map.api.ts");
  assert.match(provider, /normalizeSearchInput/);
  assert.match(provider, /normalizeVerifiedLocation/);
  assert.match(provider, /ErrUncertain/);
  assert.match(searchTest, /TestSearchRejectsMalformedProviderResult/);
  assert.match(mapApi, /\/dsh\/client\/maps\/search/);
});

test("JRN-006-S02 governs reverse geocoding and DSH service-area verification", () => {
  const provider = read("backend/internal/mapproviders/client.go");
  const reverseTest = read("backend/internal/mapproviders/reverse_validation_test.go");
  const handler = read("backend/internal/http/client_maps.go");
  assert.match(provider, /normalizeReverseInput/);
  assert.match(reverseTest, /TestReverseRejectsInvalidCoordinatesBeforeProviderCall/);
  assert.match(reverseTest, /TestReverseRejectsUncertainProviderResult/);
  assert.match(handler, /servicearea\.Resolve/);
  assert.match(handler, /ServiceAreaVerified/);
});

test("JRN-006-S03 exposes health and distinct timeout unavailable uncertain states", () => {
  const provider = read("backend/internal/mapproviders/client.go");
  const healthTest = read("backend/internal/mapproviders/health_test.go");
  const handler = read("backend/internal/http/client_maps.go");
  const routes = read("backend/internal/http/platformpolicies_routes.go");
  const screen = read("frontend/control-panel/platform/MapProviderHealthCard.tsx");
  const contract = read("contracts/dsh.client-map.openapi.yaml");
  assert.match(provider, /ErrTimeout/);
  assert.match(provider, /func \(c \*Client\) Health/);
  assert.match(healthTest, /TestProviderTimeoutIsClassifiedSeparately/);
  assert.match(handler, /MAP_RUNTIME_TIMEOUT/);
  assert.match(handler, /MAP_RUNTIME_UNAVAILABLE/);
  assert.match(handler, /MAP_RESULT_UNCERTAIN/);
  assert.match(routes, /GET \/dsh\/operator\/platform\/map-provider-health/);
  assert.match(screen, /useMapProviderHealthController/);
  assert.match(contract, /operationId: getDshOperatorMapProviderHealth/);
});

test("JRN-006-S04 returns area polygon coordinates point count bounds and detail", () => {
  const projection = read("backend/internal/servicearea/projection.go");
  const projectionTest = read("backend/internal/servicearea/projection_test.go");
  const handler = read("backend/internal/http/client_maps.go");
  const routes = read("backend/internal/http/platformpolicies_routes.go");
  const screen = read("frontend/control-panel/platform/ServiceAreaGovernanceSection.tsx");
  const contract = read("contracts/dsh.client-map.openapi.yaml");
  assert.match(projection, /type Bounds struct/);
  assert.match(projection, /PointCount/);
  assert.match(projection, /func GetProjection/);
  assert.match(projectionTest, /TestProjectComputesGovernedGeometryMetadata/);
  assert.match(handler, /ListProjections/);
  assert.match(routes, /GET \/dsh\/operator\/platform\/service-areas\/\{serviceAreaCode\}/);
  assert.match(screen, /formatBounds/);
  assert.match(contract, /operationId: getDshOperatorServiceArea/);
  assert.match(contract, /DshServiceAreaBounds/);
});

test("JRN-006-S05 enforces simple non-zero non-self-intersecting polygons in Go and PostgreSQL", () => {
  const topology = read("backend/internal/servicearea/topology.go");
  const topologyTest = read("backend/internal/servicearea/topology_test.go");
  const handler = read("backend/internal/http/client_maps.go");
  const migration = read("database/migrations/dsh-907_jrn_006_service_area_topology.sql");
  const dbTest = read("database/tests/dsh-907_jrn_006_service_area_topology.sql");
  assert.match(topology, /validPolygonTopology/);
  assert.match(topology, /signedPolygonArea/);
  assert.match(topology, /segmentsIntersect/);
  assert.match(handler, /servicearea\.UpsertGoverned/);
  assert.match(topologyTest, /TestValidPolygonTopologyRejectsSelfIntersection/);
  assert.match(migration, /dsh_validate_service_area_polygon/);
  assert.match(migration, /dsh_service_area_geofences_polygon_topology_check/);
  assert.match(dbTest, /expected self-intersecting polygon to be rejected/);
});

test("JRN-006-S06 mounts versioned retention policy and operational expiry queue", () => {
  const routes = read("backend/internal/http/platformpolicies_routes.go");
  const status = read("backend/internal/clientaddress/privacy_status.go");
  const reschedule = read("database/migrations/dsh-082_client_address_privacy_reschedule.sql");
  const controller = read("frontend/shared/privacy/use-client-address-privacy-controller.ts");
  const section = read("frontend/control-panel/platform/ClientAddressPrivacySection.tsx");
  const platformScreen = read("frontend/control-panel/platform/PlatformPoliciesScreen.tsx");
  assert.match(routes, /GET \/dsh\/operator\/privacy\/client-addresses\/policy/);
  assert.match(routes, /PUT \/dsh\/operator\/privacy\/client-addresses\/policy/);
  assert.match(routes, /GET \/dsh\/operator\/privacy\/client-addresses\/status/);
  assert.match(status, /ScheduledCount/);
  assert.match(status, /DueCount/);
  assert.match(status, /NextPurgeAt/);
  assert.match(reschedule, /dsh_reschedule_client_address_privacy_queue/);
  assert.match(controller, /fetchClientAddressPrivacyStatus/);
  assert.match(section, /المستحق الآن/);
  assert.match(platformScreen, /ClientAddressPrivacySection/);
});

test("JRN-006-S07 anonymizes due addresses with stable run identity and irreversible replacement", () => {
  const api = read("frontend/shared/privacy/client-address-privacy.api.ts");
  const controller = read("frontend/shared/privacy/use-client-address-privacy-controller.ts");
  const handler = read("backend/internal/http/client_address_privacy.go");
  const repository = read("backend/internal/clientaddress/privacy_anonymize_idempotent.go");
  const migration = read("database/migrations/dsh-078_client_address_pii_governance.sql");
  assert.match(api, /privacy-anonymize:\$\{normalizedRunId\}/);
  assert.match(api, /correlationId: normalizedRunId/);
  assert.match(controller, /anonymizeExpiredClientAddresses\(limit, runId\)/);
  assert.match(handler, /handleAnonymizeExpiredClientAddresses/);
  assert.match(repository, /pg_advisory_xact_lock/);
  assert.match(migration, /FOR UPDATE SKIP LOCKED/);
  assert.match(migration, /recipient_name = 'deleted-user'/);
  assert.match(migration, /phone_e164 = '\+96700000000'/);
  assert.match(migration, /latitude = NULL/);
  assert.match(migration, /longitude = NULL/);
});

test("JRN-006-S08 uses a hashed PII-safe audit projection and actor-owned address paths", () => {
  const routes = read("backend/internal/http/platformpolicies_routes.go");
  const audit = read("backend/internal/clientaddress/privacy_audit.go");
  const migration = read("database/migrations/dsh-908_jrn_006_privacy_audit_projection.sql");
  const dbTest = read("database/tests/dsh-908_jrn_006_privacy_audit_projection.sql");
  const addressHandler = read("backend/internal/http/client_addresses.go");
  const privacyContract = read("contracts/dsh.client-address-privacy.openapi.yaml");
  assert.match(routes, /GET \/dsh\/operator\/privacy\/client-addresses\/events/);
  assert.match(audit, /dsh_client_address_privacy_audit_projection/);
  assert.doesNotMatch(audit, /recipient_name|phone_e164|address_line|latitude|longitude/);
  assert.match(migration, /client_subject_hash/);
  assert.doesNotMatch(migration, /SELECT[\s\S]*recipient_name/);
  assert.match(dbTest, /PII column leaked through privacy audit projection/);
  assert.match(addressHandler, /clientaddress\.List\(r\.Context\(\), s\.db, actor\.ID\)/);
  assert.match(privacyContract, /x-bthwani-pii-rule/);
  assert.match(privacyContract, /additionalProperties: false/);
});
