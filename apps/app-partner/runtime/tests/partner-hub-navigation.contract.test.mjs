import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("partner hub actions emit one canonical navigation intent", async () => {
  const hub = await read("services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx");
  const renderer = await read("services/dsh/frontend/app-partner/DshPartnerRouteRenderer.tsx");
  const types = await read("services/dsh/frontend/app-partner/dsh-partner.types.ts");

  const orderAlerts = hub.match(/const openOrderAlerts = React\.useCallback\(\(\) => \{([\s\S]*?)\n  \}, \[onOpenBell\]\);/);
  const operations = hub.match(/const openOperationsDirectory = React\.useCallback\(\(\) => \{([\s\S]*?)\n  \}, \[onOpenSupportDirectory\]\);/);

  assert.ok(orderAlerts, "order alerts action should have a stable callback boundary");
  assert.ok(operations, "operations directory action should have a stable callback boundary");
  assert.match(orderAlerts[1], /onOpenBell\?\.\(\);/);
  assert.doesNotMatch(orderAlerts[1], /onOpenOperationalFlow|onOpenSupportDirectory|onOpenSupportScreen/);
  assert.match(operations[1], /onOpenSupportDirectory\?\.\(\);/);
  assert.doesNotMatch(operations[1], /onOpenOperationalFlow|onOpenBell|onOpenSupportScreen/);
  assert.doesNotMatch(renderer, /onOpenOperationalFlow=|onOpenSupportScreen=/);
  assert.doesNotMatch(types, /onOpenOperationalFlow\?:|onOpenSupportScreen\?:/);
});
