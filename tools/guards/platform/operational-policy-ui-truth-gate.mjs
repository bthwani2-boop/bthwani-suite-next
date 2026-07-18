import { fail, lineNumber, read } from "../_guard-utils.mjs";

const guardId = "operational-policy-ui-truth-gate";
const violations = [];

const rules = [
  [
    "services/dsh/frontend/control-panel/platform/PlatformPoliciesScreen.tsx",
    [],
    [
      "ServiceAreaGovernanceSection",
      "OperationalPolicyGovernanceSection",
      "StoreOnboardingFeePolicySection",
    ],
  ],
  [
    "services/dsh/frontend/control-panel/platform/OperationalPolicyGovernanceSection.tsx",
    [
      [/Math\.random|Date\.now\(\)/g, "NON_DETERMINISTIC_PLATFORM_MUTATION_FORBIDDEN"],
      [/body:\s*JSON\.stringify/g, "DOUBLE_JSON_PLATFORM_MUTATION_FORBIDDEN"],
    ],
    [
      "useOperationalPolicyEditor",
      "expectedVersion",
      "سبب التغيير",
      "saveZone",
      "saveSla",
      "saveCapacity",
      "serviceability.activeStores",
      "serviceability.slaAvailable",
    ],
  ],
  [
    "services/dsh/frontend/shared/platform/use-operational-policy-editor.ts",
    [],
    [
      "DshCreateZoneInput",
      "DshUpdateZoneInput",
      "existing?.version ?? 0",
      "zone.version",
      "onCommitted",
    ],
  ],
  [
    "services/dsh/frontend/shared/platform/platform-policies.api.ts",
    [
      [/body:\s*JSON\.stringify/g, "DOUBLE_JSON_PLATFORM_API_BODY_FORBIDDEN"],
    ],
    [
      "stableMutationKey",
      "idempotencyKey",
      "/dsh/operator/platform/zones",
      "/dsh/operator/platform/sla-rules",
      "/dsh/operator/platform/capacity",
    ],
  ],
  [
    "apps/control-panel/runtime/src/shell/useDshNavigation.ts",
    [],
    [
      "platform-policies",
      "/dsh/platform/policies",
      "platform:read",
    ],
  ],
  [
    "apps/control-panel/runtime/src/app/dsh/platform/policies/page.tsx",
    [],
    ["PlatformPoliciesScreen"],
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
        message: `REQUIRED_OPERATIONAL_POLICY_UI_MARKER_MISSING:${marker}`,
      });
    }
  }
}

fail(guardId, violations);
