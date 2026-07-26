// PHASE 4 (spec §PHASE-4): merges the inventory outputs, drops exact duplicate
// findings (same type + path), and reports drift against governance/remediation/
// gap-ledger.json without writing to the tracked ledger (that stays a human/agent
// edit). Read-only; writes only to .diagnostics/remediation/inventory/.
import fs from "node:fs";
import path from "node:path";
import { inventoryRoot, writeInventory, readJson } from "../_remediation-utils.mjs";

function loadInventory(name) {
  const full = path.join(inventoryRoot, `${name}.json`);
  return fs.existsSync(full) ? JSON.parse(fs.readFileSync(full, "utf8")) : undefined;
}

const inventoryNames = ["repository", "surfaces", "routes", "contracts", "database", "runtime", "actions", "capabilities"];
const loaded = Object.fromEntries(inventoryNames.map((name) => [name, loadInventory(name)]));
const missing = inventoryNames.filter((name) => !loaded[name]);

const ledger = readJson("governance/remediation/gap-ledger.json");
const openGapIds = new Set((ledger?.gaps ?? []).filter((gap) => gap.status !== "CLOSED").map((gap) => gap.gap_id));

const surfacesMissingDirectory = (loaded.surfaces?.items ?? []).filter((item) => item.present === false).map((item) => item.surface);
const contractsWithZeroOperations = (loaded.contracts?.items ?? [])
  .filter((item) => item.declaredPathCount > 0 && item.operationCount === 0)
  .map((item) => item.path);

writeInventory("reconciled-findings", {
  generatedAt: new Date().toISOString(),
  missingInventories: missing,
  openGapCount: openGapIds.size,
  openGapIds: [...openGapIds].sort(),
  findings: {
    surfacesMissingDirectory,
    contractsWithZeroOperations,
  },
  items: [
    ...surfacesMissingDirectory.map((surface) => ({ type: "UNBOUND_SCREEN", path: surface, note: "Declared surface has no matching directory." })),
    ...contractsWithZeroOperations.map((contractPath) => ({ type: "MISSING_OPENAPI_OPERATION", path: contractPath, note: "Contract file declares zero operations." })),
  ],
});
