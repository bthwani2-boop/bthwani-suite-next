// PHASE 1 (spec §PHASE-1): snapshots repository-wide counters before/after a task so
// baseline-diff.json can prove no unintended capability loss. Read-only.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { repoRoot, inventoryRoot, gitHeadSha, readJson } from "../_remediation-utils.mjs";

function loadInventory(name) {
  const full = path.join(inventoryRoot, `${name}.json`);
  return fs.existsSync(full) ? JSON.parse(fs.readFileSync(full, "utf8")) : undefined;
}

function countTests() {
  try {
    const output = execFileSync("git", ["ls-files", "*.test.*", "*_test.go"], { cwd: repoRoot, encoding: "utf8" });
    return output.split("\n").filter(Boolean).length;
  } catch {
    return null;
  }
}

const repository = loadInventory("repository");
const routes = loadInventory("routes");
const contracts = loadInventory("contracts");
const database = loadInventory("database");
const surfaces = loadInventory("surfaces");
const guardRegistry = readJson("governance/guards/guard-registry.json");
const gapLedger = readJson("governance/remediation/gap-ledger.json");

const label = process.argv[2] === "after" ? "after" : "before";
const baseline = {
  schemaVersion: 1,
  label,
  generatedAt: new Date().toISOString(),
  sourceSha: gitHeadSha(),
  counts: {
    trackedTextFiles: repository?.trackedTextFileCount ?? null,
    workflows: repository?.workflows?.length ?? null,
    guards: guardRegistry ? (guardRegistry.entries ?? guardRegistry.guards ?? []).length : null,
    routes: routes?.routeCount ?? null,
    contractOperations: contracts?.totalOperationCount ?? null,
    migrationFiles: (database?.items ?? []).reduce((sum, entry) => sum + (entry.fileCount ?? 0), 0),
    surfacesPresent: (surfaces?.items ?? []).filter((item) => item.present).length,
    testFiles: countTests(),
    knownOpenGaps: (gapLedger?.gaps ?? []).filter((gap) => gap.status !== "CLOSED").length,
  },
};

const target = path.join(inventoryRoot, "..", `baseline-${label}.json`);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
console.log(`remediation:baseline:${label} -> .diagnostics/remediation/baseline-${label}.json`);

if (label === "after") {
  const beforePath = path.join(inventoryRoot, "..", "baseline-before.json");
  if (fs.existsSync(beforePath)) {
    const before = JSON.parse(fs.readFileSync(beforePath, "utf8"));
    const diff = {};
    for (const key of Object.keys(baseline.counts)) {
      diff[key] = { before: before.counts[key] ?? null, after: baseline.counts[key] ?? null, delta: (baseline.counts[key] ?? 0) - (before.counts[key] ?? 0) };
    }
    const diffPath = path.join(inventoryRoot, "..", "baseline-diff.json");
    fs.writeFileSync(diffPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), diff }, null, 2)}\n`, "utf8");
    console.log("remediation:baseline:diff -> .diagnostics/remediation/baseline-diff.json");
  }
}
