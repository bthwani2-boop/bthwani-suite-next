import { fail, lineNumber, read } from "../_guard-utils.mjs";

const guardId = "client-address-privacy-integration-gate";
const violations = [];

const rules = [
  [
    "services/dsh/backend/internal/http/catalog_unified_routes.go",
    [],
    [
      "GET /dsh/operator/privacy/client-addresses/policy",
      "PUT /dsh/operator/privacy/client-addresses/policy",
      "POST /dsh/operator/privacy/client-addresses/anonymize",
      "handleGetClientAddressPrivacyPolicy",
      "handleUpdateClientAddressPrivacyPolicy",
      "handleAnonymizeExpiredClientAddresses",
    ],
  ],
  [
    "services/dsh/contracts/dsh.client-address-privacy.openapi.yaml",
    [],
    [
      "getDshClientAddressPrivacyPolicy",
      "updateDshClientAddressPrivacyPolicy",
      "anonymizeDshExpiredClientAddresses",
      "Idempotency-Key",
      "X-Correlation-ID",
      "expectedVersion",
      "reason",
    ],
  ],
  [
    "services/dsh/contracts/contract-registry.ts",
    [],
    [
      '"dsh-client-address-privacy"',
      'path: "contracts/dsh.client-address-privacy.openapi.yaml"',
      'adapterOwner: "frontend/shared/privacy"',
    ],
  ],
  [
    "contracts/master.openapi.yaml",
    [],
    [
      "dshClientAddressPrivacy: ../services/dsh/contracts/dsh.client-address-privacy.openapi.yaml",
    ],
  ],
  [
    "services/dsh/capability-map.extensions.ts",
    [],
    [
      "getDshClientAddressPrivacyPolicy",
      "updateDshClientAddressPrivacyPolicy",
      "anonymizeDshExpiredClientAddresses",
      "client-address-retention",
      "client-address-anonymization",
    ],
  ],
  [
    "services/dsh/frontend/shared/privacy/client-address-privacy.api.ts",
    [
      [/Math\.random|Date\.now\(\)/g, "NON_DETERMINISTIC_PRIVACY_IDEMPOTENCY_FORBIDDEN"],
      [/body:\s*JSON\.stringify/g, "DOUBLE_JSON_PRIVACY_BODY_FORBIDDEN"],
    ],
    [
      "runId: string",
      "normalizedRunId",
      "anonymize:${normalizedRunId}",
      "/dsh/operator/privacy/client-addresses/policy",
      "/dsh/operator/privacy/client-addresses/anonymize",
    ],
  ],
  [
    "services/dsh/frontend/shared/privacy/use-client-address-privacy-controller.ts",
    [],
    [
      "expectedVersion: state.policy.version",
      "async (limit: number, runId: string)",
      "anonymizeExpiredClientAddresses(limit, runId)",
      "await reload()",
    ],
  ],
  [
    "services/dsh/frontend/control-panel/platform/ClientAddressPrivacySection.tsx",
    [],
    [
      "useClientAddressPrivacyController",
      "معرف التشغيل",
      "controller.anonymize(limit, normalizedRunId)",
      "سبب تغيير السياسة",
      "controller.state.policy.version",
    ],
  ],
  [
    "services/dsh/frontend/control-panel/platform/PlatformPoliciesScreen.tsx",
    [],
    ["ClientAddressPrivacySection"],
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
        message: `REQUIRED_PRIVACY_INTEGRATION_MARKER_MISSING:${marker}`,
      });
    }
  }
}

fail(guardId, violations);
