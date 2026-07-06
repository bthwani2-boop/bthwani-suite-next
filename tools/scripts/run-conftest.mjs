/**
 * tools/scripts/run-conftest.mjs
 *
 * BTHWANI_DEEP_TOOLS_GOVERNANCE_V5_AND_OSS_TOOLCHAIN_ACTIVATION — Conftest Wrapper
 *
 * Runs conftest test on registry files if installed, otherwise skips.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";

function hasBinary(cmd) {
  try {
    execSync(process.platform === "win32" ? `where.exe ${cmd}` : `which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (!hasBinary("conftest")) {
  console.log(`\n[CONFTEST SKIP] 'conftest' binary not installed. Skipping local OPA conftest policy validations.`);
  console.log(`                (This check runs as a mandatory job in GitHub Actions CI)\n`);
  process.exit(0);
}

try {
  const registries = [
    "governance/agents/agent-registry.json",
    "governance/skills/skills-registry.json",
    "governance/guards/guard-registry.json"
  ];

  for (const reg of registries) {
    const cmd = `conftest test "${reg}" --policy governance/policies`;
    console.log(`Running: ${cmd}`);
    execSync(cmd, { stdio: "inherit", cwd: repoRoot });
  }
} catch (e) {
  console.error("Conftest detected policy compliance issues.");
  process.exit(1);
}
