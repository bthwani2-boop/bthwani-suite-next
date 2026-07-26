import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("central catalog runtime portability", () => {
  const script = source("../database/scripts/apply-central-catalog-seed.ps1");

  it("derives every runtime input from the resolved repository root", () => {
    assert.match(script, /\$RepoRoot = \(Resolve-Path \(Join-Path \$PSScriptRoot "\.\.\/\.\.\/\.\.\/\.\."\)\)\.Path/);
    for (const variable of [
      "ComposeFile",
      "EnvFile",
      "Migration30",
      "Migration31",
      "Migration32",
      "Seed",
      "Verify",
    ]) {
      assert.match(script, new RegExp(`\\$${variable} = Join-Path \\$RepoRoot`));
    }
  });

  it("does not pass Windows-only relative paths to Docker", () => {
    assert.doesNotMatch(script, /["']\.\\\\infra\\\\/);
    assert.doesNotMatch(script, /["']\.\\\\services\\\\/);
    assert.match(script, /"--env-file", \$EnvFile/);
    assert.match(script, /"-f", \$ComposeFile/);
    assert.match(script, /docker @composeArguments/);
  });

  it("fails before convergence when a required input is absent", () => {
    assert.match(script, /Test-Path -LiteralPath \$file -PathType Leaf/);
    assert.match(script, /throw "Required file missing: \$file"/);
  });
});
