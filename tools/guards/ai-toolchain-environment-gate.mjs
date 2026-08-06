import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "ai-toolchain-environment-gate";
const violations = [];

const checkCommand = (cmd) => {
  try {
    execSync(`${cmd} --version`, { stdio: "ignore", windowsHide: true });
    return true;
  } catch {
    return false;
  }
};

const checkNx = () => {
  if (checkCommand("nx")) return true;
  const nxBin = path.join(repoRoot, "node_modules", ".bin", "nx");
  return fs.existsSync(nxBin) || fs.existsSync(nxBin + ".cmd");
};

const headSha = () => {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
};

const environmentStatus = {
  timestamp: new Date().toISOString(),
  sourceSha: headSha(),
  tools: {
    node: checkCommand("node"),
    pnpm: checkCommand("pnpm"),
    nx: checkNx(),
    graphify: fs.existsSync(path.join(repoRoot, "tools/scripts/invoke-graphify-toolchain.ps1")),
    leanctx: fs.existsSync(path.join(repoRoot, "tools/scripts/invoke-leanctx-toolchain.ps1")),
    open_code_review: fs.existsSync(path.join(repoRoot, "tools/scripts/invoke-open-code-review-toolchain.ps1"))
  }
};

const outputDir = path.join(repoRoot, ".artifacts", "diagnostics", "ai-toolchain");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
const outputPath = path.join(outputDir, "ai-toolchain-environment-latest.json");
fs.writeFileSync(outputPath, JSON.stringify(environmentStatus, null, 2));

// Ensure critical tools exist
const required = ["node", "pnpm", "nx", "leanctx"];
for (const req of required) {
  if (!environmentStatus.tools[req]) {
    violations.push({ file: "environment", line: 0, message: `MISSING_REQUIRED_AI_TOOLCHAIN_DEPENDENCY: ${req}` });
  }
}

fail(guardId, violations);
