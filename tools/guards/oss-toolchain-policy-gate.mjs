/**
 * tools/guards/oss-toolchain-policy-gate.mjs
 *
 * BTHWANI_DEEP_TOOLS_GOVERNANCE_V5_AND_OSS_TOOLCHAIN_ACTIVATION — OSS Policy Compliance Gate
 *
 * Ensures all tools in the catalog are Open Source or Free (oss_free: true).
 * Strictly forbids paid SaaS/proprietary additions.
 *
 * FAIL: any tool with oss_free !== true is found in the registry.
 */

import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "oss-toolchain-policy-gate";
const violations = [];

const catalogPath = path.join(repoRoot, "tools/toolchain/tool-catalog.v5.json");

if (fs.existsSync(catalogPath)) {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

  for (const entry of catalog.entries || []) {
    if (entry.oss_free !== true) {
      violations.push({
        file: "tools/toolchain/tool-catalog.v5.json",
        line: 0,
        message: `PROPRIETARY_TOOL_FORBIDDEN: Tool '${entry.id}' is not marked as open source/free. Paid/SaaS tools are prohibited.`,
      });
    }
  }
}

fail(guardId, violations);
