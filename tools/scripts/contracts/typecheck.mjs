import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { normalizeOpenApiMetadata } from "./normalize-openapi-metadata.mjs";
import { composeContext } from "../openapi-context-composer.mjs";

const contexts = ["identity", "workforce", "platform-control", "providers", "dsh", "wlt"];

const repoRoot = new URL("../../..", import.meta.url);
const tempDir = mkdtempSync(join(tmpdir(), "bthwani-contracts-"));

function firstActionableDiagnostic(output) {
  const lines = String(output ?? "")
    .replace(/\u001b\[[0-9;]*m/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    lines.find((line) => /\b(?:error|warning)\b/i.test(line) && !/^\d+\s+(?:errors?|warnings?)/i.test(line))
    ?? lines.find((line) => /\d+:\d+/.test(line))
    ?? lines.at(-1)
    ?? "command failed"
  ).replace(/\s+/g, " ").slice(0, 220);
}

function run(label, command, args, options = {}) {
  const { rejectWarnings = false, ...spawnOptions } = options;
  let executable = command;
  let effectiveArgs = args;
  if (process.platform === "win32" && command === "pnpm") {
    const pnpmCli = join(dirname(process.execPath), "node_modules", "corepack", "dist", "pnpm.js");
    if (!existsSync(pnpmCli)) throw new Error(`${label}: pnpm corepack entrypoint not found`);
    executable = process.execPath;
    effectiveArgs = [pnpmCli, ...args];
  }
  const result = spawnSync(executable, effectiveArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false,
    ...spawnOptions,
  });

  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}\n${result.error?.message ?? ""}`.trim();

  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${label}: ${firstActionableDiagnostic(combined)}`);
  }

  if (rejectWarnings && /\bYou have\s+[1-9]\d*\s+warnings?\b/i.test(combined)) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${label}: warnings are forbidden`);
  }

  if (spawnOptions.stdio !== "pipe") return;
  if (result.stderr) process.stderr.write(result.stderr);
}

function materializeNormalizedContract(source, sourceLabel) {
  const output = join(tempDir, ...sourceLabel.split("/"));
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, normalizeOpenApiMetadata(source, sourceLabel), "utf8");
  return output;
}

function materializeSharedContracts() {
  const sharedContract = "contracts/shared/common.openapi.yaml";
  const output = join(tempDir, ...sharedContract.split("/"));
  mkdirSync(dirname(output), { recursive: true });
  copyFileSync(new URL(sharedContract, repoRoot), output);
}

async function verifyGeneratedBundle(context) {
  const result = await composeContext(context, { write: false });
  const committed = readFileSync(new URL(result.bundlePath, repoRoot), "utf8").replace(/\r\n/g, "\n");
  const expected = result.bundle.replace(/\r\n/g, "\n");
  if (committed !== expected) {
    throw new Error(
      `${context} generated bundle drift: run 'pnpm openapi:compose:${context}' and commit the deterministic output`,
    );
  }
  console.log(`${context} generated bundle: PASS (${result.sourceDigest})`);
  return result;
}

try {
  run("contracts-foundation", "node", ["tools/scripts/contracts/foundation.mjs"], {
    stdio: "inherit",
  });
  materializeSharedContracts();
  const verificationContracts = [];
  for (const context of contexts) {
    const result = context === "dsh" || context === "wlt"
      ? await verifyGeneratedBundle(context)
      : await composeContext(context, { write: false });
    verificationContracts.push({
      source: result.bundlePath,
      normalized: materializeNormalizedContract(result.bundle, result.bundlePath),
    });
  }

  for (const contract of verificationContracts) {
    run(`redocly ${contract.source}`, "pnpm", [
      "exec",
      "redocly",
      "lint",
      "--config",
      ".redocly.yaml",
      "--max-problems",
      "1000",
      contract.normalized,
    ], { stdio: "pipe", rejectWarnings: true });
  }

  for (const contract of verificationContracts) {
    const tsOut = join(tempDir, `${basename(contract.normalized)}.ts`);
    run(`openapi-typescript ${contract.source}`, "pnpm", [
      "exec",
      "openapi-typescript",
      contract.normalized,
      "-o",
      tsOut,
    ]);
  }

  console.log("contracts-typecheck: PASS (read-only, zero warnings)");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
