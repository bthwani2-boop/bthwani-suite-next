import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";
import { spawnSync } from "node:child_process";
import { normalizeOpenApiMetadata } from "./normalize-openapi-metadata.mjs";
import { composeContext } from "../openapi-context-composer.mjs";
import { resolvePackageManagerInvocation } from "../lib/package-manager-invocation.mjs";
import { writeToolEvidence } from "../capture-tool-evidence.mjs";

const contexts = ["identity", "workforce", "platform-control", "providers", "dsh", "wlt"];

const repoRoot = new URL("../../..", import.meta.url);
const tempDir = mkdtempSync(join(tmpdir(), "bthwani-contracts-"));
const redoclyEnvironment = {
  ...process.env,
  // Contract verification must be deterministic and must not start background
  // update or telemetry network work that can outlive the CLI on Windows.
  REDOCLY_SUPPRESS_UPDATE_NOTICE: "true",
  REDOCLY_TELEMETRY: "off",
};

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
  const invocation = resolvePackageManagerInvocation(command, args, process.env);
  const result = spawnSync(invocation.executable, invocation.args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false,
    ...spawnOptions,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}\n${result.error?.message ?? ""}`.trim();
  const toolId = label.toLowerCase().replace(/[^a-z0-9_-]+/gu, "-").replace(/^-+|-+$/gu, "") || "contracts-tool";
  const exitCode = result.error ? 1 : (result.status ?? 1);
  const warningsRejected = rejectWarnings && /\bYou have\s+[1-9]\d*\s+warnings?\b/i.test(combined);
  try {
    writeToolEvidence({
      toolId,
      status: exitCode === 0 && !warningsRejected ? "PASS" : "FAIL",
      exitCode: warningsRejected ? 1 : exitCode,
      rawText: combined,
      rawPath: [invocation.executable, ...invocation.args].join(" "),
      claim: `${label} contract evidence`,
      scope: "exact candidate contract",
    });
  } catch (error) {
    process.stderr.write(`[${label}] evidence capture failed: ${error.message}\n`);
  }

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    throw new Error(`${label}: ${firstActionableDiagnostic(combined)}`);
  }

  if (warningsRejected) {
    throw new Error(`${label}: warnings are forbidden`);
  }
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

try {
  run("contracts-foundation", "node", ["tools/scripts/contracts/foundation.mjs"], {
    stdio: "inherit",
  });
  materializeSharedContracts();

  const verificationContracts = [];
  for (const context of contexts) {
    const result = await composeContext(context, { write: false });
    verificationContracts.push({
      source: result.bundlePath,
      normalized: materializeNormalizedContract(result.bundle, result.bundlePath),
    });
    console.log(`${context} deterministic composition: PASS (${result.sourceDigest})`);
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
    ], {
      stdio: "pipe",
      rejectWarnings: true,
      env: redoclyEnvironment,
    });
  }

  for (const contract of verificationContracts) {
    const tsOut = join(tempDir, `${basename(contract.normalized)}.ts`);
    // Generation equivalence runs through the same Node API as the canonical
    // materializer; a subprocess bridge here would duplicate that mechanism
    // and cannot carry dash-leading flags through governed Windows argv.
    const ast = await openapiTS(pathToFileURL(contract.normalized));
    writeFileSync(tsOut, astToString(ast), "utf8");
  }

  console.log("contracts-typecheck: PASS (read-only deterministic composition, zero warnings)");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
