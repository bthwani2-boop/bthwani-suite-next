import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const healthSource = readFileSync(
  resolve(repositoryRoot, "services/dsh/frontend/shared/session/use-control-panel-service-health.ts"),
  "utf8",
);
const topBarSource = readFileSync(
  resolve(repositoryRoot, "apps/control-panel/runtime/src/shell/ControlPanelTopBar.tsx"),
  "utf8",
);

test("global topbar health never presents DSH health as capability-wide health", () => {
  assert.match(healthSource, /client\.request\("\/dsh\/health"\)/);
  assert.match(topBarSource, /label: "DSH متصل"/);
  assert.match(topBarSource, /label: "DSH غير متصل"/);
  assert.match(topBarSource, /label: "جارٍ فحص DSH"/);
  assert.doesNotMatch(topBarSource, /healthy:\s*\{[^}]*label:\s*"متصل"/);
});
