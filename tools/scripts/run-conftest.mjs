import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { hasBinary, repoRoot } from "./_external-tool-runner.mjs";

const version = "v0.55.0";
const args = [
  "test",
  "governance/agents/agent-registry.json",
  "governance/skills/skills-registry.json",
  "governance/guards/guard-registry.json",
  "--policy",
  "governance/policies",
];

function execute(binary) {
  execFileSync(binary, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });
}

function installLockedBinary() {
  const installDir = path.join(os.homedir(), ".cache", "bthwani-tools", `conftest-${version}`);
  const binary = path.join(installDir, "conftest");
  if (fs.existsSync(binary)) return binary;

  fs.mkdirSync(installDir, { recursive: true });
  const archive = `conftest_${version.slice(1)}_Linux_x86_64.tar.gz`;
  const baseUrl = `https://github.com/open-policy-agent/conftest/releases/download/${version}`;
  const script = [
    "set -euo pipefail",
    `tmp_dir=\"$(mktemp -d)\"`,
    `trap 'rm -rf \"$tmp_dir\"' EXIT`,
    `cd \"$tmp_dir\"`,
    `curl -fsSLO \"${baseUrl}/${archive}\"`,
    `curl -fsSLO \"${baseUrl}/checksums.txt\"`,
    `grep \" ${archive}$\" checksums.txt | sha256sum --check -`,
    `tar -xzf \"${archive}\" conftest`,
    `install -m 0755 conftest \"${binary}\"`,
  ].join("\n");
  execSync(script, { cwd: repoRoot, stdio: "inherit", shell: "/bin/bash" });
  return binary;
}

try {
  if (hasBinary("conftest")) execute("conftest");
  else execute(installLockedBinary());
  console.log(`[CONFTEST PASS] OPA policies verified with locked version ${version}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[CONFTEST FAIL] ${message} decision=FIX_REQUIRED`);
  process.exit(1);
}
