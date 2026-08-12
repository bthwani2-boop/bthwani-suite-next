import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
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
  "tools/guards/opa",
];

function execute(binary) {
  execFileSync(binary, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });
}

function downloadWithRetry(url, destination) {
  execFileSync(
    "curl",
    [
      "--fail",
      "--silent",
      "--show-error",
      "--location",
      "--retry",
      "5",
      "--retry-all-errors",
      "--retry-delay",
      "2",
      "--connect-timeout",
      "20",
      "--max-time",
      "180",
      "--output",
      destination,
      url,
    ],
    { cwd: repoRoot, stdio: "inherit" },
  );
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function expectedChecksum(checksumsPath, archive) {
  const line = fs
    .readFileSync(checksumsPath, "utf8")
    .split(/\r?\n/u)
    .find((entry) => entry.trim().endsWith(` ${archive}`));
  if (!line) throw new Error(`locked Conftest checksum entry is missing for ${archive}`);
  const expected = line.trim().split(/\s+/u)[0]?.toLowerCase();
  if (!/^[0-9a-f]{64}$/u.test(expected ?? "")) {
    throw new Error(`locked Conftest checksum entry is invalid for ${archive}`);
  }
  return expected;
}

function installLockedBinary() {
  const installDir = path.join(os.homedir(), ".cache", "bthwani-tools", `conftest-${version}`);
  const binary = path.join(installDir, "conftest");
  if (fs.existsSync(binary)) return binary;

  fs.mkdirSync(installDir, { recursive: true });
  const archive = `conftest_${version.slice(1)}_Linux_x86_64.tar.gz`;
  const baseUrl = `https://github.com/open-policy-agent/conftest/releases/download/${version}`;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bthwani-conftest-"));
  try {
    const archivePath = path.join(tempDir, archive);
    const checksumsPath = path.join(tempDir, "checksums.txt");
    downloadWithRetry(`${baseUrl}/${archive}`, archivePath);
    downloadWithRetry(`${baseUrl}/checksums.txt`, checksumsPath);

    const expected = expectedChecksum(checksumsPath, archive);
    const actual = sha256(archivePath);
    if (actual !== expected) {
      throw new Error(`Conftest archive checksum mismatch: expected ${expected}, got ${actual}`);
    }

    execFileSync("tar", ["-xzf", archivePath, "-C", tempDir, "conftest"], {
      cwd: repoRoot,
      stdio: "inherit",
    });
    const extracted = path.join(tempDir, "conftest");
    fs.copyFileSync(extracted, binary);
    fs.chmodSync(binary, 0o755);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
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
