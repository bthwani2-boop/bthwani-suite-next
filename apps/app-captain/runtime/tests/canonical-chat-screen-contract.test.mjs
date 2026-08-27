import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const ordersScreenPath = resolve(
  repositoryRoot,
  "services/dsh/frontend/app-captain/orders/DshCaptainOrdersScreen.tsx",
);
const legacyChatPath = resolve(
  repositoryRoot,
  "services/dsh/frontend/app-captain/orders/OrderChatSection.tsx",
);
const ordersScreen = readFileSync(ordersScreenPath, "utf8");

test("captain order chat has one canonical support screen", () => {
  assert.equal(existsSync(legacyChatPath), false);
  assert.match(ordersScreen, /CaptainOrderSupportConversationScreen/);
  assert.match(ordersScreen, /composerEnabled/);
  assert.doesNotMatch(ordersScreen, /OrderChatSection|pickupLabel|dropoffLabel/);
});
