import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { normalizeOpenApiMetadata } from "../contracts/normalize-openapi-metadata.mjs";

const contracts = [
  "contracts/master.openapi.yaml",
  "core/identity/contracts/auth.openapi.yaml",
  "core/providers/contracts/providers.openapi.yaml",
  "core/workforce/contracts/workforce.openapi.yaml",
  "services/dsh/contracts/generated/dsh.bundle.openapi.yaml",
  "services/wlt/contracts/wlt.openapi.yaml",
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
`,
  "utf8",
);

function run(label, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
    ...options,
  });

  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${label} failed with exit code ${result.status}`);
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

try {
  run("contracts-foundation", "node", ["tools/important-scripts/contracts-foundation.mjs"], {
    stdio: "inherit",
  });
  run("dsh-openapi-modular", "node", ["tools/guards/dsh-openapi-modular-gate.mjs"], {
    stdio: "inherit",
  });

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
    ], { stdio: "inherit" });
  }

  for (const contract of verificationContracts) {
    run(`openapi-typescript ${contract.source}`, "pnpm", [
      "exec",
      "openapi-typescript",
      contract.normalized,
    ]);
  }

  console.log("contracts-typecheck: OK (zero warnings)");
} finally {
  for (const contract of normalizedContracts) rmSync(new URL(contract, repoRoot), { force: true });
  rmSync(tempDir, { recursive: true, force: true });
}
