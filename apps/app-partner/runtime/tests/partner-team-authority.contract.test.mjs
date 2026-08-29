import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("partner team state and mutations remain bound to the active store scope", async () => {
  const controller = await read("services/dsh/frontend/shared/partner/use-partner-team-controller.ts");

  assert.match(controller, /const mountedRef = React\.useRef\(true\)/);
  assert.match(controller, /const requestSeqRef = React\.useRef\(0\)/);
  assert.match(controller, /const mutationBusyRef = React\.useRef\(false\)/);
  assert.match(controller, /const scopeKey = `\$\{route\}:\$\{activeStoreId\}`/);
  assert.match(controller, /scopeKeyRef\.current = scopeKey/);
  assert.match(controller, /const loadTeam = React\.useCallback\(async \(\): Promise<boolean> =>/);
  assert.match(controller, /requestSeq !== requestSeqRef\.current/);
  assert.match(controller, /requestScopeKey !== scopeKeyRef\.current/);
  assert.match(controller, /mutationScopeKey !== scopeKeyRef\.current/);
  assert.match(controller, /const readbackVerified = await loadTeam\(\);/);
  assert.match(controller, /if \(!readbackVerified\)/);
  assert.match(controller, /تم إرسال الدعوة، لكن تعذر تأكيد فريق المتجر من DSH/);
  assert.match(controller, /تم إرسال الإجراء، لكن تعذر تأكيد فريق المتجر من DSH/);
  assert.match(controller, /يوجد إجراء فريق قيد التنفيذ/);
  assert.doesNotMatch(controller, /await loadTeam\(\);\s*return \{ ok: true \};/);
});
