// Seeds product-model-node candidates from the JRN-* journey registry document
// headings, feeding governance/remediation/capability-graph.json population (wave
// P1-A). Read-only.
import { repoRoot, writeInventory, readJson } from "../_remediation-utils.mjs";
import fs from "node:fs";
import path from "node:path";

const registryPath = "governance/27_FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md";
const full = path.join(repoRoot, registryPath);
const content = fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
const journeyIds = [...new Set([...content.matchAll(/\bJRN-(\d{3})\b/g)].map((match) => `JRN-${match[1]}`))].sort();

const graph = readJson("governance/remediation/capability-graph.json");

writeInventory("capabilities", {
  generatedAt: new Date().toISOString(),
  sourceRegistry: registryPath,
  chain: graph?.chain ?? [],
  journeyCount: journeyIds.length,
  items: journeyIds.map((journeyId) => ({ journeyId, populated: false })),
});
