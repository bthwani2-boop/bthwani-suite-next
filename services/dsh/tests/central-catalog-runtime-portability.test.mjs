import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("central catalog runtime portability", () => {
  const seedScript = source("../database/scripts/apply-central-catalog-seed.ps1");
  const phaseScript = source("../../../tools/scripts/invoke-runtime-phase.ps1");

  it("derives every runtime input from the resolved repository root", () => {
    assert.match(seedScript, /\$RepoRoot = \(Resolve-Path \(Join-Path \$PSScriptRoot "\.\.\/\.\.\/\.\.\/\.\."\)\)\.Path/);
    for (const variable of [
      "ComposeFile",
      "EnvFile",
      "Migration30",
      "Migration31",
      "Migration32",
      "Seed",
      "Verify",
    ]) {
      assert.match(seedScript, new RegExp(`\\$${variable} = Join-Path \\$RepoRoot`));
    }
  });

  it("does not pass Windows-only relative paths to Docker", () => {
    assert.doesNotMatch(seedScript, /["']\.\\\\infra\\\\/);
    assert.doesNotMatch(seedScript, /["']\.\\\\services\\\\/);
    assert.match(seedScript, /"--env-file", \$EnvFile/);
    assert.match(seedScript, /"-f", \$ComposeFile/);
    assert.match(seedScript, /docker @composeArguments/);
  });

  it("fails before convergence when a required input is absent", () => {
    assert.match(seedScript, /Test-Path -LiteralPath \$file -PathType Leaf/);
    assert.match(seedScript, /throw "Required file missing: \$file"/);
  });

  it("runs complete selected-profile seeds before catalog convergence", () => {
    const prerequisiteIndex = phaseScript.indexOf('=== runtime:seed-prerequisites ===');
    const seedInvocationIndex = phaseScript.indexOf('& $RuntimeScript -Action seed -Profiles $Profiles');
    const convergenceIndex = phaseScript.indexOf('=== runtime:catalog-convergence ===');
    const catalogInvocationIndex = phaseScript.indexOf('& $CatalogSeedScript');

    assert.ok(prerequisiteIndex >= 0, "seed prerequisite marker is missing");
    assert.ok(seedInvocationIndex > prerequisiteIndex, "seed invocation must follow its marker");
    assert.ok(convergenceIndex > seedInvocationIndex, "catalog convergence must follow local seeds");
    assert.ok(catalogInvocationIndex > convergenceIndex, "catalog script must follow convergence marker");
    assert.match(phaseScript, /Runtime seed prerequisites failed with exit code/);
    assert.match(phaseScript, /Central catalog convergence failed with exit code/);
  });
});
