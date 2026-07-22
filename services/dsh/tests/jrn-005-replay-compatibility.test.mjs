import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");

test("JRN-005 resolves committed update replay before mutable geofence validation", () => {
  const handler = read("services/dsh/backend/internal/http/client_addresses.go");
  const replay = read("services/dsh/backend/internal/clientaddress/update_replay.go");
  const replayIndex = handler.indexOf("clientaddress.FindUpdateReplay");
  const validationIndex = handler.indexOf("clientaddress.ValidateServiceArea", replayIndex);

  assert.ok(replayIndex >= 0, "update handler must check durable replay");
  assert.ok(validationIndex > replayIndex, "service-area validation must run after replay lookup");
  assert.match(replay, /loadMutationReceipt/);
  assert.match(replay, /replayAddressMutation/);
  assert.match(replay, /lockClient/);
});

test("JRN-005 keeps the default operations analytics response backward compatible", () => {
  const analyticsAlias = read("services/dsh/backend/internal/http/unified_handler_aliases.go");

  assert.match(analyticsAlias, /include/);
  assert.match(analyticsAlias, /client-address-book/);
  assert.match(analyticsAlias, /s\.handlePlatformKpis\(w, r\)/);
  assert.match(analyticsAlias, /clientaddress\.DiagnoseIntegrity/);
  assert.match(analyticsAlias, /clientaddress\.TelemetrySnapshot/);
  assert.match(analyticsAlias, /"clientAddressBook"/);
});
