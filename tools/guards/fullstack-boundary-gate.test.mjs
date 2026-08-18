import assert from "node:assert/strict";
import test from "node:test";

import { isForbiddenAppRuntimeDshImport } from "./lib/fullstack-boundary-rules.mjs";

test("rejects an app runtime deep import into DSH implementation", () => {
  assert.equal(
    isForbiddenAppRuntimeDshImport(
      "apps/app-field/runtime/src/App.tsx",
      "services/dsh/frontend/app-field/index.ts",
    ),
    true,
  );
});

test("allows app runtime imports resolved through the public package boundary", () => {
  assert.equal(
    isForbiddenAppRuntimeDshImport(
      "apps/app-field/runtime/src/App.tsx",
      "@bthwani/dsh/app-field",
    ),
    false,
  );
});
