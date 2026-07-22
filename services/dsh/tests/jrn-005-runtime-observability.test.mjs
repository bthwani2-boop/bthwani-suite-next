import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");

test("JRN-005 records every address operation through aggregate telemetry", () => {
  const handler = read("services/dsh/backend/internal/http/client_addresses.go");
  const telemetry = read("services/dsh/backend/internal/clientaddress/telemetry.go");

  for (const operation of ["list", "create", "update", "delete", "set_default"]) {
    assert.match(handler, new RegExp(`observeClientAddressOperation\\(\\"${operation}\\"`));
  }
  assert.match(telemetry, /func RecordOperation/);
  assert.match(telemetry, /func TelemetrySnapshot/);
  assert.match(telemetry, /idempotency_conflict/);
  assert.match(telemetry, /service_area_unverified/);
  assert.doesNotMatch(telemetry, /RecipientName|PhoneE164|AddressLine|Latitude|Longitude|CorrelationID/);
});

test("JRN-005 exposes aggregate database invariant diagnostics in governed operations analytics", () => {
  const diagnostics = read("services/dsh/backend/internal/clientaddress/diagnostics.go");
  const analyticsAlias = read("services/dsh/backend/internal/http/unified_handler_aliases.go");

  assert.match(diagnostics, /ClientsWithMultipleDefaults/);
  assert.match(diagnostics, /ClientsWithoutDefault/);
  assert.match(diagnostics, /DuplicateActiveFingerprints/);
  assert.match(diagnostics, /MutationReceipts/);
  assert.doesNotMatch(diagnostics, /recipient_name|phone_e164|address_line|delivery_instructions/);
  assert.match(analyticsAlias, /requirePermission\(w, r, "control-panel", AnalyticsPermissionRead/);
  assert.match(analyticsAlias, /clientaddress\.DiagnoseIntegrity/);
  assert.match(analyticsAlias, /clientaddress\.TelemetrySnapshot/);
  assert.match(analyticsAlias, /"clientAddressBook"/);
});
