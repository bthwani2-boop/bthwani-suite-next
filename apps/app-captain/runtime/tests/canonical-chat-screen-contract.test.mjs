import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const ordersScreen = readFileSync(
  "services/dsh/frontend/app-captain/orders/DshCaptainOrdersScreen.tsx",
  "utf8",
);

test("captain order chat has one canonical support screen", () => {
  assert.equal(
    existsSync("services/dsh/frontend/app-captain/orders/OrderChatSection.tsx"),
    false,
  );
  assert.match(ordersScreen, /CaptainOrderSupportConversationScreen/);
  assert.match(ordersScreen, /composerEnabled/);
  assert.doesNotMatch(ordersScreen, /OrderChatSection|pickupLabel|dropoffLabel/);
});
