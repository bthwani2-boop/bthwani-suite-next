import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function source(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("support mutation attempts are namespaced by actor and installation", () => {
  const attempt = source("frontend/shared/support/support-mutation-attempt.ts");
  const storage = source("frontend/shared/support/sensitive-support-attempt-storage.ts");
  assert.match(attempt, /const PREFIX = SENSITIVE_SUPPORT_MUTATION_PREFIX/);
  assert.match(attempt, /bthwaniSensitiveStorage/);
  assert.doesNotMatch(attempt, /bthwaniDurableStorage/);
  assert.match(storage, /support-mutation\/v3/);
  assert.match(storage, /ensureSensitiveSupportAttemptsMigrated/);
  assert.match(storage, /opaqueSupportFingerprint/);
  assert.match(attempt, /readonly actorId: string;/);
  assert.match(attempt, /resolveMutationIdentityScope\(actorId, /);
  assert.match(attempt, /encode\(scope\.actorId\).*encode\(scope\.installationId\)/);
  assert.doesNotMatch(attempt, /resolveMutationIdentityScope\("",/);
  assert.match(attempt, /getOrCreateSupportMutationAttempt\(input: \{[\s\S]*readonly actorId: string;/);
  assert.match(attempt, /clearSupportMutationAttempt\(input: \{[\s\S]*readonly actorId: string;/);
});

test("every support mutation controller propagates the canonical actor subject", () => {
  const ticket = source("frontend/shared/support/use-support-controller.tsx");
  const incident = source("frontend/shared/support/use-governed-incident-controller.tsx");
  const rescue = source("frontend/shared/support/use-order-rescue-controller.tsx");
  for (const controller of [ticket, incident, rescue]) {
    assert.match(controller, /actorId: string \| null/);
    assert.match(controller, /getOrCreateSupportMutationAttempt\(\{\n\s+actorId,/);
    assert.match(controller, /clearSupportMutationAttempt\(\{\n\s+actorId,/);
  }
  assert.match(ticket, /if \(!actorId\)/);
  assert.match(incident, /if \(!actorId\)/);
  assert.match(rescue, /if \(!actorId\)/);
});

test("checkout attempts require the same explicit actor identity", () => {
  const attempt = source("frontend/shared/checkout/checkout-create-attempt.ts");
  const controller = source("frontend/shared/checkout/use-checkout-controller.tsx");
  const flow = source("frontend/shared/checkout/use-checkout-to-order-flow.tsx");
  assert.match(attempt, /getOrCreateCheckoutAttempt\(\n\s+actorId: string,/);
  assert.match(attempt, /clearCheckoutAttempt\(actorId: string, fingerprint: string\)/);
  assert.doesNotMatch(attempt, /resolveMutationIdentityScope\("",/);
  assert.match(controller, /getOrCreateCheckoutAttempt\(actorId, input\)/);
  assert.match(controller, /clearCheckoutAttempt\(actorId, attempt\.fingerprint\)/);
  assert.match(flow, /getOrCreateCheckoutAttempt\(actorId, input\)/);
  assert.match(flow, /clearCheckoutAttempt\(actorId, fingerprintCheckoutInput\(input\)\)/);
});

test("client and control-panel support surfaces pass live identity subjects", () => {
  const clientScreen = source("frontend/app-client/support/SupportTicketScreen.tsx");
  const clientDetail = source("frontend/app-client/support/TicketDetailScreen.tsx");
  const dashboard = source("frontend/control-panel/support/SupportDashboardScreen.tsx");
  const rescue = source("frontend/control-panel/operations/OrderRescueScreen.tsx");
  for (const screen of [clientScreen, clientDetail, dashboard, rescue]) {
    assert.match(screen, /identity\.subject|session\.state\.identity\.subject/);
  }
  assert.match(clientScreen, /useSupportTicketController\(actorId, identity\.state\.kind\)/);
  assert.match(clientDetail, /useTicketDetailController\(ticketId, actorId, identity\.state\.kind\)/);
  assert.match(dashboard, /useControlPanelSession/);
  assert.match(rescue, /useControlPanelSession/);
});

test("support mutation controllers serialize writes before React state updates", () => {
  const ticket = source("frontend/shared/support/use-support-controller.tsx");
  assert.equal((ticket.match(/const mutationBusyRef = useRef\(false\)/g) ?? []).length, 3);
  assert.equal((ticket.match(/if \(mutationBusyRef\.current\) return false;/g) ?? []).length, 3);
  assert.equal((ticket.match(/mutationBusyRef\.current = false;/g) ?? []).length, 3);
  assert.match(ticket, /\}, \[actorId, loadEvents, loadMessages, mode, ticketId\]\);/);
});

test("direct order conversations serialize durable writes before React state updates", () => {
  const client = source("frontend/app-client/orders/OrderChatScreen.tsx");
  const captain = source("frontend/app-captain/orders/CaptainOrderSupportConversationScreen.tsx");
  for (const screen of [client, captain]) {
    assert.equal((screen.match(/const mutationBusyRef = React\.useRef\(false\)/g) ?? []).length, 1);
  }
  assert.equal((client.match(/mutationBusyRef\.current[^;\n]*return;/g) ?? []).length, 1);
  assert.equal((client.match(/mutationBusyRef\.current = false;/g) ?? []).length, 1);
  assert.equal((captain.match(/mutationBusyRef\.current[^;\n]*return;/g) ?? []).length, 2);
  assert.equal((captain.match(/mutationBusyRef\.current = false;/g) ?? []).length, 2);
  assert.match(client, /const loadBusyRef = React\.useRef\(false\)/);
  assert.match(client, /if \(!orderId\.trim\(\) \|\| loadBusyRef\.current\) return;/);
});
