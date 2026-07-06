/**
 * tools/guards/toolchain-activation-gate.mjs
 *
 * BTHWANI_DEEP_TOOLS_GOVERNANCE_V5_AND_OSS_TOOLCHAIN_ACTIVATION — Activation Consistency Gate
 *
 * Checks that the activation status in tool-catalog.v5.json matches the baseline.
 *
 * FAIL: activation state mismatches the defined baseline.
 */

import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "toolchain-activation-gate";
const violations = [];

const catalogPath = path.join(repoRoot, "tools/toolchain/tool-catalog.v5.json");
const baselinePath = path.join(repoRoot, "tools/toolchain/tool-activation-baseline.json");

if (!fs.existsSync(catalogPath) || !fs.existsSync(baselinePath)) {
  violations.push({
    file: "tools/toolchain/tool-activation-baseline.json",
    line: 0,
    message: "MISSING_FILES: catalog or baseline config file missing.",
  });
  fail(guardId, violations);
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const baselineData = JSON.parse(fs.readFileSync(baselinePath, "utf8")).baseline;

for (const entry of catalog.entries || []) {
  const expected = baselineData[entry.id];
  if (!expected) {
    violations.push({
      file: "tools/toolchain/tool-activation-baseline.json",
      line: 0,
      message: `UNMAPPED_BASELINE: Baseline does not define activation for tool '${entry.id}'`,
    });
    continue;
  }

  if (entry.activation !== expected) {
    violations.push({
      file: "tools/toolchain/tool-catalog.v5.json",
      line: 0,
      message: `ACTIVATION_MISMATCH: Tool '${entry.id}' has activation '${entry.activation}' but baseline requires '${expected}'`,
    });
  }
}

fail(guardId, violations);
