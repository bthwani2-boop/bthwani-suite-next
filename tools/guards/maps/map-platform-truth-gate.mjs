import { fail, lineNumber, read } from "../_guard-utils.mjs";

const guardId = "map-platform-truth-gate";
const violations = [];

const rules = [
  [
    "core/providers/backend/internal/providers/maps.go",
    [
      [/http:\/\/(?!localhost|127\.0\.0\.1|\[::1\])/g, "NON_LOCAL_HTTP_MAP_PROVIDER_FORBIDDEN"],
      [/io\.ReadAll\(resp\.Body\)/g, "UNBOUNDED_MAP_RESPONSE_FORBIDDEN"],
    ],
    [
      "SearchMaps",
      "ReverseMap",
      "ListProvidersByKind",
      "userAgent",
      "non-local map provider must use https",
      "io.LimitReader",
      "sortMapProviders",
    ],
  ],
  [
    "core/providers/backend/internal/http/server.go",
    [],
    [
      'POST /providers/maps/search',
      'POST /providers/maps/reverse',
      "mapConsumer",
      'HasPermission("providers", "maps:invoke"',
    ],
  ],
  [
    "core/providers/contracts/providers.openapi.yaml",
    [],
    [
      "searchMapLocations",
      "reverseMapLocation",
      "/providers/maps/search",
      "/providers/maps/reverse",
      "bearerAuth",
    ],
  ],
  [
    "services/dsh/backend/internal/mapproviders/client.go",
    [
      [/nominatim|googleapis|mapbox\.com|hereapi/gi, "DSH_DIRECT_EXTERNAL_MAP_PROVIDER_FORBIDDEN"],
    ],
    [
      '"/providers/maps/search"',
      '"/providers/maps/reverse"',
      'req.Header.Set("Authorization"',
      "io.LimitReader",
    ],
  ],
  [
    "services/dsh/backend/internal/http/client_maps.go",
    [],
    [
      'requireActor(w, r, "client")',
      "servicearea.Resolve",
      "ServiceAreaVerified",
      "handleOperatorUpsertServiceArea",
      'requirePermission(w, r, "control-panel", "platform.manage"',
    ],
  ],
  [
    "services/dsh/backend/internal/servicearea/geofence.go",
    [],
    [
      "pointInPolygon",
      "ExpectedVersion",
      "pg_advisory_xact_lock",
      "dsh_service_area_mutation_results",
      "dsh_service_area_events",
    ],
  ],
  [
    "services/dsh/frontend/app-client/account/AddressLocationScreen.tsx",
    [
      [/label=["']رمز منطقة الخدمة["']/g, "MANUAL_SERVICE_AREA_INPUT_FORBIDDEN"],
      [/nominatim|googleapis|mapbox\.com|hereapi/gi, "APP_DIRECT_MAP_PROVIDER_FORBIDDEN"],
      [/serviceAreaCode:\s*["'][^"']+["']/g, "HARDCODED_SERVICE_AREA_FORBIDDEN"],
    ],
    [
      "useClientMapController",
      "serviceAreaVerified",
      "applyMapLocation",
      "mapController.reverse",
      "الموقع المختار خارج مناطق الخدمة المعتمدة",
    ],
  ],
  [
    "services/dsh/frontend/shared/client-map/client-map.api.ts",
    [
      [/\bfetch\s*\(/g, "RAW_MAP_FETCH_FORBIDDEN"],
      [/nominatim|googleapis|mapbox\.com|hereapi/gi, "SHARED_DIRECT_MAP_PROVIDER_FORBIDDEN"],
    ],
    [
      "createDshHttpClient",
      "/dsh/client/maps/search",
      "/dsh/client/maps/reverse",
      "/dsh/operator/platform/service-areas",
      "idempotencyKey",
    ],
  ],
  [
    "services/dsh/frontend/control-panel/platform/ServiceAreaGovernanceSection.tsx",
    [],
    [
      "useServiceAreaController",
      "expectedVersion",
      "parsePolygon",
      "سبب التغيير",
      "[longitude, latitude]",
    ],
  ],
  [
    "services/dsh/frontend/shared/platform/platform-policies.api.ts",
    [
      [/body:\s*JSON\.stringify/g, "DOUBLE_JSON_PLATFORM_MUTATION_FORBIDDEN"],
    ],
    [
      "stableMutationKey",
      "expectedVersion",
      "/dsh/operator/platform/zones",
      "/dsh/operator/platform/sla-rules",
      "/dsh/operator/platform/capacity",
      "/dsh/operator/platform/store-onboarding-fee",
    ],
  ],
  [
    "services/dsh/backend/internal/http/catalog_unified_routes.go",
    [],
    [
      'GET /dsh/operator/platform/zones',
      'POST /dsh/operator/platform/zones',
      'PATCH /dsh/operator/platform/zones/{zoneId}',
      'GET /dsh/operator/platform/sla-rules',
      'PUT /dsh/operator/platform/sla-rules',
      'GET /dsh/operator/platform/capacity',
      'PUT /dsh/operator/platform/capacity',
      'GET /dsh/operator/platform/serviceability/{zoneId}',
      'GET /dsh/operator/platform/store-onboarding-fee',
      'PUT /dsh/operator/platform/store-onboarding-fee',
      'GET /dsh/platform/store-onboarding-fee',
    ],
  ],
  [
    "services/dsh/contracts/dsh.client-map.openapi.yaml",
    [],
    [
      "searchDshClientMapLocations",
      "reverseDshClientMapLocation",
      "listDshOperatorServiceAreas",
      "upsertDshOperatorServiceArea",
      "MANUAL_TYPED_ADAPTER",
    ],
  ],
  [
    "services/dsh/contracts/dsh.platform-policies.openapi.yaml",
    [],
    [
      "listDshZones",
      "createDshZone",
      "updateDshZone",
      "getDshSlaRules",
      "upsertDshSlaRules",
      "getDshCapacityConfig",
      "upsertDshCapacityConfig",
      "getDshZoneServiceability",
      "getDshStoreOnboardingFeePolicy",
      "upsertDshStoreOnboardingFeePolicy",
      "getDshStoreOnboardingFeeReference",
    ],
  ],
  [
    "services/dsh/database/migrations/dsh-076_service_area_geofences.sql",
    [],
    [
      "dsh_service_area_geofences",
      "dsh_service_area_events",
      "dsh_service_area_mutation_results",
      "priority",
      "version",
    ],
  ],
  [
    "services/dsh/database/migrations/dsh-077_platform_operational_policies.sql",
    [],
    [
      "dsh_platform_policy_events",
      "dsh_platform_policy_mutation_results",
      "dsh_platform_capacity_configs",
      "version",
    ],
  ],
  [
    "services/dsh/capability-map.extensions.ts",
    [],
    [
      "searchDshClientMapLocations",
      "reverseDshClientMapLocation",
      "listDshOperatorServiceAreas",
      "upsertDshOperatorServiceArea",
    ],
  ],
  [
    "contracts/master.openapi.yaml",
    [],
    [
      "dshClientMap: ../services/dsh/contracts/dsh.client-map.openapi.yaml",
      "dshPlatformPolicies: ../services/dsh/contracts/dsh.platform-policies.openapi.yaml",
    ],
  ],
];

for (const [file, forbidden, required] of rules) {
  const content = read(file);
  for (const [pattern, message] of forbidden) {
    for (const match of content.matchAll(pattern)) {
      violations.push({
        file,
        line: lineNumber(content, match.index),
        message,
      });
    }
  }
  for (const marker of required) {
    if (!content.includes(marker)) {
      violations.push({
        file,
        line: 0,
        message: `REQUIRED_MAP_PLATFORM_MARKER_MISSING:${marker}`,
      });
    }
  }
}

fail(guardId, violations);
