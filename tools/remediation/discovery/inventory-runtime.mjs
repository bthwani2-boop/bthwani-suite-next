// Inventories declared runtime profiles: package.json runtime:* scripts and the
// docker-compose-relevant manifests referenced by them. Read-only, no runtime start.
import fs from "node:fs";
import path from "node:path";
import { repoRoot, writeInventory, readJson } from "../_remediation-utils.mjs";

const scripts = readJson("package.json")?.scripts ?? {};
const runtimeScripts = Object.entries(scripts).filter(([name]) => name.startsWith("runtime:"));

function findComposeFiles() {
  const candidates = ["docker-compose.yml", "docker-compose.yaml", "infra/docker-compose.yml"];
  return candidates.filter((candidate) => fs.existsSync(path.join(repoRoot, candidate)));
}

writeInventory("runtime", {
  generatedAt: new Date().toISOString(),
  runtimeScriptCount: runtimeScripts.length,
  composeFiles: findComposeFiles(),
  items: runtimeScripts.map(([name, command]) => ({ script: name, command })),
});
