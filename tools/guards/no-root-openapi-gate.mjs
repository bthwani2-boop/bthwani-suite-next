/**
 * no-root-openapi-gate.mjs
 *
 * Enforces that contracts/master.openapi.yaml is the only sovereign contract
 * index in the repository. Fails if any *.openapi.yaml/*.openapi.yml file (or
 * any file carrying the MASTER_INDEX_ONLY contract role) exists at the repo
 * root or anywhere outside contracts/, preventing the PARALLEL_CONTRACT_TRUTH
 * regression this guard was created to close (see governance/reports on the
 * contract hierarchy restructuring).
 */

import fs from "node:fs";
import path from "node:path";
import { fail, listFiles, read, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "no-root-openapi-gate";
const violations = [];
const allowedMasterPath = "contracts/master.openapi.yaml";

const ROOT_FORBIDDEN_EXACT = new Set(["openapi.yaml", "openapi.yml", "master.openapi.yaml"]);

for (const entry of fs.readdirSync(repoRoot, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (ROOT_FORBIDDEN_EXACT.has(entry.name) || /\.openapi\.ya?ml$/.test(entry.name)) {
    violations.push({
      file: entry.name,
      message: `ROOT_OPENAPI_FILE_FORBIDDEN: only ${allowedMasterPath} may act as the platform contract index`,
    });
  }
}

for (const file of listFiles()) {
  const relative = toPosix(path.relative(repoRoot, file));
  if (relative === allowedMasterPath) continue;
  if (!/\.openapi\.ya?ml$/.test(relative)) continue;
  const content = read(file);
  if (/^x-bthwani-contract-role:\s*MASTER_INDEX_ONLY\s*$/m.test(content)) {
    violations.push({
      file: relative,
      message: `PARALLEL_MASTER_INDEX_FORBIDDEN: MASTER_INDEX_ONLY role must only appear on ${allowedMasterPath}`,
    });
  }
}

fail(guardId, violations);
