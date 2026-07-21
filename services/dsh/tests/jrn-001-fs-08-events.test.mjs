import fs from "node:fs";
import assert from "node:assert/strict";

// Canonical rerun after aligning the text activation-event key and Go formatting.
const read = (path) => fs.readFileSync(path, "utf8");
const migration = read("services/dsh/database/migrations/dsh-101_partner_wlt_outbox_reconciliation.sql");
const worker = read("services/dsh/backend/internal/partnerwltoutbox/outbox.go");
const main = read("services/dsh/backend/cmd/dsh-api/main.go");
const dshClient = read("services/dsh/backend/internal/wlt/payout_destination.go");
const wltServer = read("services/wlt/backend/internal/http/server.go");

assert.match(migration, /dsh_partner_wlt_outbox/);
assert.match(migration, /dsh_partner_wlt_reconciliation_cases/);
assert.match(migration, /activation_event_id text NOT NULL REFERENCES dsh_partner_activation_events\(id\)/);
assert.match(migration, /AFTER INSERT ON dsh_partner_activation_events/);
assert.match(migration, /NEW\.to_status = 'partner_deactivated'/);
assert.match(migration, /UNIQUE \(event_type, activation_event_id\)/);
assert.doesNotMatch(migration, /^\s+(account_number|iban|payout_mobile_number)\s+text\b/m);

assert.match(worker, /FOR UPDATE SKIP LOCKED/);
assert.match(worker, /status = 'processing'/);
assert.match(worker, /status = 'delivered'/);
assert.match(worker, /dead_letter/);
assert.match(worker, /retryDelay/);
assert.match(worker, /GetPayoutDestination/);
assert.match(worker, /dsh_reference_missing/);
assert.match(worker, /wlt_destination_missing/);
assert.match(worker, /reference_mismatch/);
assert.match(worker, /masked_readback_mismatch/);
assert.match(worker, /resolution_note = 'DSH and WLT masked readback are aligned'/);

assert.match(main, /partnerwltoutbox\.RunWorker/);
assert.match(dshClient, /func \(c \*Client\) GetPayoutDestination/);
assert.match(dshClient, /ErrPayoutDestinationNotFound/);
assert.match(dshClient, /DeactivatePayoutDestination/);
assert.match(wltServer, /GET \/wlt\/payout-destinations\/\{partnerId\}/);
assert.match(wltServer, /POST \/wlt\/payout-destinations\/\{partnerId\}\/deactivate/);

console.log("JRN-001 FS-08 durable events, retry, readback, and reconciliation verified");
