import assert from "node:assert/strict";
import fs from "node:fs";

const controller = fs.readFileSync(
  "services/dsh/frontend/shared/support/support.controller-core.ts",
  "utf8",
);

assert.match(controller, /getOrCreateSupportMutationAttempt/);
assert.match(controller, /clearSupportMutationAttempt/);
assert.match(controller, /createSupportTicket\(input, attempt\.context\)/);
assert.match(controller, /updateTicket\(ticketId, input, attempt\.context\)/);
assert.match(controller, /addTicketMessage\(ticketId, input, attempt\.context\)/);
assert.doesNotMatch(controller, /createSupportTicket\(input\);/);
assert.doesNotMatch(controller, /updateTicket\(ticketId, input\);/);
assert.doesNotMatch(controller, /addTicketMessage\(ticketId, input\);/);

console.log("JRN-001 FS-10 support mutation identity boundary verified");
