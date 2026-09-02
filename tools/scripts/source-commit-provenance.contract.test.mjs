import assert from "node:assert/strict";
import {execFileSync, spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const helperPath = path.join(root, "tools/scripts/lib/source-commit-provenance.ps1");
const psConsumers = [
  "tools/scripts/invoke-service-migrations.ps1",
  "tools/scripts/invoke-service-seeds.ps1",
  "tools/scripts/invoke-database-upgrade-truth.ps1",
  "tools/scripts/test-service-migration-runner.ps1",
  "services/dsh/database/scripts/invoke-dsh-database.ps1",
  "services/dsh/database/scripts/test-dsh-migration-runner.ps1",
  "infra/docker/scripts/invoke-runtime-database-migrations.ps1",
  "infra/docker/scripts/invoke-runtime-database-seeds.ps1",
  "infra/docker/scripts/runtime.ps1",
  "infra/docker/scripts/export-runtime-snapshot.ps1",
  "tools/scripts/run-lian-full-runtime-closure.ps1",
];

function psQuote(value) {
  return String(value).replaceAll("'", "''");
}

test("source/evidence provenance readers share checked-out Git HEAD semantics", () => {
  assert.match(read("tools/scripts/lib/source-commit-provenance.ps1"), /Resolve-BthwaniCheckedOutSourceCommitSha/u);
  for (const relativePath of psConsumers) {
    const source = read(relativePath);
    assert.match(source, /source-commit-provenance.ps1/u, relativePath);
    assert.ok(!source.includes("$env:GITHUB_SHA"), relativePath);
  }
  assert.doesNotMatch(read("tools/scripts/capture-tool-evidence.mjs"), /process.env.GITHUB_SHA/u);
  assert.ok(read("infra/docker/scripts/schema-migration-runner.ps1").includes("[ValidatePattern('^[0-9a-fA-F]{40}$')][string]$SourceCommitSha"));
  assert.ok(read(".github/workflows/ci-backends.yml").includes("-SourceCommitSha $env:CANDIDATE_SHA"));
});

test("PowerShell resolver treats workflow GITHUB_SHA as non-authoritative", () => {
  const actual = execFileSync("git", ["rev-parse", "--verify", "HEAD"], {cwd: root, encoding: "utf8"}).trim().toLowerCase();
  const wrong = actual === "f".repeat(40) ? "e".repeat(40) : "f".repeat(40);
  const command = [
    `. '${psQuote(helperPath)}'`,
    `$env:GITHUB_SHA='${wrong}'`,
    `$resolved = Resolve-BthwaniCheckedOutSourceCommitSha -RepoRoot '${psQuote(root)}' -ExpectedSourceCommitSha '${actual}'`,
    `if ($resolved -ne '${actual}') { throw 'resolver returned wrong checkout SHA' }`,
  ].join("; ");
  const result = spawnSync("pwsh", ["-NoProfile", "-Command", command], {cwd: root, encoding: "utf8"});
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("PowerShell resolver fails closed on an explicit candidate mismatch", () => {
  const actual = execFileSync("git", ["rev-parse", "--verify", "HEAD"], {cwd: root, encoding: "utf8"}).trim().toLowerCase();
  const wrong = actual === "f".repeat(40) ? "e".repeat(40) : "f".repeat(40);
  const command = [
    `. '${psQuote(helperPath)}'`,
    `Resolve-BthwaniCheckedOutSourceCommitSha -RepoRoot '${psQuote(root)}' -ExpectedSourceCommitSha '${wrong}'`,
  ].join("; ");
  const result = spawnSync("pwsh", ["-NoProfile", "-Command", command], {cwd: root, encoding: "utf8"});
  assert.notEqual(result.status, 0, "mismatched source candidate unexpectedly succeeded");
  assert.match(`${result.stderr}
${result.stdout}`, /SOURCE_COMMIT_PROVENANCE_MISMATCH/u);
});
