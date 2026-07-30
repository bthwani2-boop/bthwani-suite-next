import { fail, lineNumber, read } from "../_guard-utils.mjs";

const guardId = "client-address-retry-truth-gate";
const violations = [];

const checks = [
  {
    file: "services/dsh/frontend/shared/client-address/client-address-create-attempt.ts",
    forbidden: [[/Math\.random\s*\(/g, "RANDOM_ADDRESS_ATTEMPT_FORBIDDEN"]],
    required: [
      "AsyncStorage",
      "fingerprintClientAddressDraft",
      "getOrCreateClientAddressAttempt",
      "clearClientAddressAttempt",
      "STORAGE_KEY",
      "isStoredAttempt",
    ],
  },
  {
    file: "services/dsh/frontend/shared/client-address/use-client-address-controller.ts",
    forbidden: [
      [/createAttempt\s*=\s*useRef/g, "MEMORY_ONLY_ADDRESS_ATTEMPT_FORBIDDEN"],
      [/Math\.random\s*\(/g, "RANDOM_ADDRESS_CONTROLLER_ATTEMPT_FORBIDDEN"],
    ],
    required: [
      "getOrCreateClientAddressAttempt",
      "clearClientAddressAttempt",
      "attempt.context",
      "attempt.fingerprint",
    ],
  },
  {
    file: "services/dsh/database/migrations/dsh-056_client_addresses.sql",
    forbidden: [[/UNIQUE \(client_id, create_idempotency_key\)/g, "FULL_HISTORY_ADDRESS_IDEMPOTENCY_FORBIDDEN"]],
    required: [
      "uq_dsh_client_addresses_active_idempotency",
      "ON dsh_client_addresses(client_id, create_idempotency_key)",
      "WHERE deleted_at IS NULL",
    ],
  },
];

for (const check of checks) {
  const content = read(check.file);
  for (const [pattern, message] of check.forbidden) {
    for (const match of content.matchAll(pattern)) {
      violations.push({ file: check.file, line: lineNumber(content, match.index), message });
    }
  }
  for (const marker of check.required) {
    if (!content.includes(marker)) {
      violations.push({ file: check.file, line: 0, message: `REQUIRED_ADDRESS_RETRY_MARKER_MISSING:${marker}` });
    }
  }
}

fail(guardId, violations);
