import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("partner support keeps durable mutation identity until canonical ticket/message readback", async () => {
  const controller = await read("services/dsh/frontend/shared/support/use-partner-support-controller.ts");

  assert.match(controller, /const contextKey = enabled && actorId \? actorId : "disabled"/);
  assert.match(controller, /const ticketsSequence = useRef\(0\)/);
  assert.match(controller, /const detailSequence = useRef\(0\)/);
  assert.match(controller, /requestContextKey !== contextKeyRef\.current/);
  assert.match(controller, /const loadTickets = useCallback\(async \(expectedTicketId\?: string\): Promise<boolean> =>/);
  assert.match(controller, /expectedTicketId && !tickets\.some\(\(ticket\) => ticket\.id === expectedTicketId\)/);
  assert.match(controller, /expectedMessageId && !messages\.some\(\(message\) => message\.id === expectedMessageId\)/);

  const createMutation = controller.indexOf("const ticket = await createPartnerSupportTicket");
  const createReadback = controller.indexOf("const ticketsVerified = await loadTickets(ticket.id)", createMutation);
  const createClear = controller.indexOf("await clearPartnerTicketAttempt", createMutation);
  assert.ok(createMutation >= 0 && createReadback > createMutation && createClear > createReadback);

  const messageMutation = controller.indexOf("const message = await addPartnerSupportMessage");
  const messageReadback = controller.indexOf("const detailVerified = await loadDetail(ticketId, message.id)", messageMutation);
  const messageClear = controller.indexOf("await clearPartnerMessageAttempt", messageMutation);
  assert.ok(messageMutation >= 0 && messageReadback > messageMutation && messageClear > messageReadback);

  assert.match(controller, /تم الاحتفاظ بهوية العملية لإعادة المحاولة الآمنة/);
  assert.doesNotMatch(controller, /await clearPartnerTicketAttempt\([^)]*\);\s*setSelectedTicketId/);
  assert.doesNotMatch(controller, /await clearPartnerMessageAttempt\([^)]*\);\s*await loadDetail/);
});
