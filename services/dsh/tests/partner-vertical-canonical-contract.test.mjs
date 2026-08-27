import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const viewModel = readFileSync(
  "services/dsh/frontend/shared/partner/partner.view-model.ts",
  "utf8",
);
const detailScreen = readFileSync(
  "services/dsh/frontend/control-panel/partners/PartnerDetailUnifiedScreen.tsx",
  "utf8",
);
const workspaceScreen = readFileSync(
  "services/dsh/frontend/control-panel/partners/PartnerGovernanceWorkspaceScreen.tsx",
  "utf8",
);

test("partner business-vertical display has one canonical input", () => {
  assert.match(viewModel, /getDshBusinessVerticalLabel\(verticalId: string\)/);
  assert.doesNotMatch(viewModel, /legacyCategory/);
  assert.doesNotMatch(detailScreen, /getDshBusinessVerticalLabel\([^)]*,/);
  assert.doesNotMatch(workspaceScreen, /getDshBusinessVerticalLabel\([^)]*,/);
});
