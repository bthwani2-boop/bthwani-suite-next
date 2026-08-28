import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync(
  "services/dsh/frontend/app-partner/orders/PartnerOrderConversationPanel.tsx",
  "utf8",
);
const screen = readFileSync(
  "services/dsh/frontend/app-partner/orders/PartnerConversationScreen.tsx",
  "utf8",
);

test("partner conversation navigation uses the canonical operational-flow binding", () => {
  assert.match(panel, /onOpenOperationalFlow\?:/);
  assert.match(panel, /hasNavigationBinding/);
  assert.doesNotMatch(panel, /Navigation compatibility|hasNavigationCompatibility|مسارات التنقل القديمة/);
  assert.match(screen, /onOpenOperationalFlow=\{\(flowId\) =>/);
  assert.doesNotMatch(screen, /onOpenFlow=/);
});
