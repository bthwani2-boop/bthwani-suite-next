import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { normalizeOpenApiMetadata } from "../contracts/normalize-openapi-metadata.mjs";
import { composeContext } from "../scripts/openapi-context-composer.mjs";

const contracts = [
  "contracts/openapi/index.yaml",
  "core/identity/contracts/identity.openapi.yaml",
  "core/platform-control/contracts/platform-control.openapi.yaml",
  "core/providers/contracts/providers.openapi.yaml",
  "core/workforce/contracts/workforce.openapi.yaml",
  "services/dsh/contracts/generated/dsh.bundle.openapi.yaml",
  "services/wlt/contracts/generated/wlt.bundle.openapi.yaml",
];

const repoRoot = new URL("../..", import.meta.url);
const tempDir = mkdtempSync(join(tmpdir(), "bthwani-contracts-"));
const ruleset = join(tempDir, "spectral.yaml");
const normalizedContracts = [];
writeFileSync(
  ruleset,
  `extends: [spectral:oas]
rules:
  duplicated-entry-in-enum:
    description: Enum values must not have duplicate entry.
    severity: warn
    recommended: true
    message: "{{error}}"
    given:
      - "$..[?(@property !== 'properties' && @ != null && @.enum && @.enum.constructor.name === 'Array')]"
    then:
      field: enum
      function: schema
      functionOptions:
        schema:
          type: array
          uniqueItems: true
  oas3-unused-component: off
`,
  "utf8",
);

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
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
    ...options,
  });

  if (result.status !== 0) {
    const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${label}: ${firstActionableDiagnostic(combined)}`);
  }

  if (options.stdio !== "pipe") return;
  if (result.stderr) process.stderr.write(result.stderr);
}

function materializeNormalizedContract(contract) {
  const output = join(dirname(contract), `.${basename(contract)}.normalized-${process.pid}.yaml`);
  const source = readFileSync(new URL(contract, repoRoot), "utf8");
  writeFileSync(new URL(output, repoRoot), normalizeOpenApiMetadata(source, contract), "utf8");
  normalizedContracts.push(output);
  return output;
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
}

try {
  run("contracts-foundation", "node", ["tools/important-scripts/contracts-foundation.mjs"], {
    stdio: "inherit",
  });
  await verifyGeneratedBundle("dsh");
  await verifyGeneratedBundle("wlt");

  const verificationContracts = contracts.map((contract) => ({
    source: contract,
    normalized: materializeNormalizedContract(contract),
  }));

  for (const contract of verificationContracts) {
    run(`spectral ${contract.source}`, "pnpm", [
      "exec",
      "spectral",
      "lint",
      "--ruleset",
      ruleset,
      "--fail-severity",
      "warn",
      contract.normalized,
    ], { stdio: "pipe" });
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
  for (const contract of normalizedContracts) rmSync(new URL(contract, repoRoot), { force: true });
  rmSync(tempDir, { recursive: true, force: true });
}
