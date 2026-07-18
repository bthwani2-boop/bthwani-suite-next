import { fail, lineNumber, read } from "../_guard-utils.mjs";

const guardId = "client-address-privacy-truth-gate";
const violations = [];

const rules = [
  [
    "services/dsh/database/migrations/dsh-078_client_address_pii_governance.sql",
    [],
    [
      "dsh_client_address_privacy_policy",
      "pii_purge_after",
      "pii_anonymized_at",
      "dsh_schedule_client_address_pii_purge",
      "dsh_anonymize_expired_client_addresses",
      "dsh_client_address_privacy_events",
      "dsh_client_address_privacy_mutation_results",
      "FOR UPDATE SKIP LOCKED",
      "recipient_name = 'deleted-user'",
      "latitude = NULL",
      "longitude = NULL",
    ],
  ],
  [
    "services/dsh/backend/internal/clientaddress/privacy.go",
    [],
    [
      "ExpectedVersion",
      "ErrPrivacyVersionConflict",
      "ErrPrivacyIdempotencyConflict",
      "pg_advisory_xact_lock",
      "dsh_client_address_privacy_mutation_results",
      "dsh_client_address_privacy_events",
    ],
  ],
  [
    "services/dsh/backend/internal/clientaddress/privacy_anonymize_idempotent.go",
    [],
    [
      "AnonymizeExpiredIdempotent",
      "IdempotencyKey",
      "dsh_anonymize_expired_client_addresses",
      "requestHash",
    ],
  ],
  [
    "services/dsh/backend/cmd/dsh-address-privacy/main.go",
    [
      [/time\.Now\(\).*Idempotency/gs, "RANDOM_OR_TIME_BASED_PRIVACY_IDEMPOTENCY_FORBIDDEN"],
    ],
    [
      "DSH_PRIVACY_RUN_ID",
      "DSH_PRIVACY_BATCH_LIMIT",
      "AnonymizeExpiredIdempotent",
      "dsh-address-privacy-worker",
    ],
  ],
  [
    "services/dsh/database/tests/dsh-078_client_address_pii_invariants.sql",
    [],
    [
      "retention_scheduled",
      "anonymized",
      "active address was modified",
      "deleted address PII was not fully anonymized",
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
        message: `REQUIRED_PRIVACY_MARKER_MISSING:${marker}`,
      });
    }
  }
}

fail(guardId, violations);
