import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const lifecycle = read("services/dsh/database/migrations/dsh-015_partner_lifecycle.sql");
const integrity = read("services/dsh/database/migrations/dsh-098_partner_onboarding_integrity.sql");
const retention = read("services/dsh/database/migrations/dsh-099_partner_onboarding_audit_retention.sql");

for (const table of [
  "dsh_partners",
  "dsh_partner_documents",
  "dsh_partner_document_reviews",
  "dsh_partner_field_visits",
  "dsh_partner_activation_events",
  "dsh_partner_store_visibility_events",
]) {
  assert.match(lifecycle, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`), `missing ${table}`);
}

assert.match(lifecycle, /ADD COLUMN IF NOT EXISTS partner_id TEXT REFERENCES dsh_partners\(id\)/);
assert.match(lifecycle, /UNIQUE \(legal_identity_type, legal_identity_number\)/);
assert.match(lifecycle, /CHECK \(decision IN \('approved','rejected','needs_resubmit'\)\)/);
assert.match(lifecycle, /idempotency_key\s+TEXT\s+NOT NULL/);
assert.match(lifecycle, /version\s+INTEGER\s+NOT NULL DEFAULT 1/);

assert.match(integrity, /ADD COLUMN IF NOT EXISTS request_hash text NOT NULL DEFAULT ''/);
assert.match(integrity, /CREATE UNIQUE INDEX IF NOT EXISTS dsh_partner_activation_event_retry_idx/);
assert.match(integrity, /PARTITION BY partner_id, idempotency_key/);
assert.match(integrity, /STORE_PARTNER_REASSIGNMENT_FORBIDDEN/);
assert.match(integrity, /BEFORE UPDATE OF partner_id ON dsh_stores/);
assert.match(integrity, /dsh_partner_wlt_reference_excludes_raw_payout/);
assert.match(integrity, /btrim\(bank_account_number\) = ''/);
assert.match(integrity, /btrim\(bank_iban\) = ''/);
assert.match(integrity, /btrim\(payout_mobile_number\) = ''/);

for (const relationship of [
  /dsh_partner_activation_events_partner_id_fkey[\s\S]*ON DELETE RESTRICT/,
  /dsh_partner_store_visibility_events_partner_id_fkey[\s\S]*ON DELETE RESTRICT/,
  /dsh_partner_store_visibility_events_store_id_fkey[\s\S]*ON DELETE RESTRICT/,
  /dsh_partner_document_reviews_partner_id_fkey[\s\S]*ON DELETE RESTRICT/,
  /dsh_partner_document_reviews_document_id_fkey[\s\S]*ON DELETE RESTRICT/,
  /dsh_partner_field_visits_partner_id_fkey[\s\S]*ON DELETE RESTRICT/,
]) {
  assert.match(retention, relationship);
}

console.log("JRN-001 FS-05 database integrity and audit retention verified");
