/**
 * contract-registry-drift-gate.mjs
 *
 * contracts/generated/contract-registry.json is derived from the master index,
 * each context's entry contract and manifest, and the generated-client registry.
 * A committed registry that no longer matches its sources is a parallel source of
 * truth, so this gate regenerates it and fails on any difference.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "contract-registry-drift-gate";
const violations = [];
const registryPath = "contracts/generated/contract-registry.json";
const absolute = path.join(repoRoot, registryPath);

const before = fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : null;
if (before === null) {
  violations.push({
    file: registryPath,
    message: "CONTRACT_REGISTRY_MISSING; run `pnpm run contracts:registry`",
  });
} else {
  const generator = path.join(repoRoot, "tools/scripts/generate-contract-registry.mjs");
  const result = spawnSync(process.execPath, [generator], { encoding: "utf8" });

  if (result.status !== 0) {
    violations.push({
      file: registryPath,
      message: `CONTRACT_REGISTRY_GENERATION_FAILED: ${(result.stderr || result.stdout || "").trim()}`,
    });
  } else {
    const after = fs.readFileSync(absolute, "utf8");
    if (after !== before) {
      // Leave the committed content in place; the gate reports, it does not fix.
      fs.writeFileSync(absolute, before, "utf8");
      violations.push({
        file: registryPath,
        message: "CONTRACT_REGISTRY_DRIFT; regenerate with `pnpm run contracts:registry` and commit the result",
      });
    }
  }
}

fail(guardId, violations);
