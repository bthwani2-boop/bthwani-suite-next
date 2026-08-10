// Locks the HISTORICAL_IMMUTABLE digest-stability rule.
//
// Regression origin: commit 2f1568ed3 removed a trailing space from
// identity-018_session_surface.sql -- a migration the manifest declares
// HISTORICAL_IMMUTABLE -- and updated the manifest digest in the same commit.
// The manifest stayed self-consistent, so every existing check passed, but every
// database that had already recorded the pre-edit digest failed
// GOVERNED_MIGRATION_LEDGER_CONFLICT permanently with no forward path. Clean
// installs never reproduced it because they record the new digest directly.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repositoryRoot = path.resolve(
  new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
  "..",
  "..",
);

const gate = path.join(repositoryRoot, "tools/guards/migration-manifest-drift-gate.mjs");

function runGate(extraArgs) {
  try {
    return {
      status: 0,
      output: execFileSync("node", [gate, ...extraArgs], {
        cwd: repositoryRoot,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (error) {
    return {
      status: error.status ?? 1,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
    };
  }
}

test("the identity-018 amendment authorizes the digest the ledger already holds", () => {
  const amendments = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, "governance/contracts/migration-amendments.json"), "utf8"),
  );
  const amendment = amendments.amendments.find(
    (entry) => entry.service === "identity" && entry.migrationId === "identity-018_session_surface.sql",
  );

  assert.ok(amendment, "identity-018_session_surface.sql must have a registered amendment");
  assert.equal(amendment.classification, "PRE_RELEASE_UNAPPLIED_CORRECTION");
  assert.equal(
    amendment.evidence.productionApprovalEvidence,
    false,
    "an amendment claiming production approval is rejected by the runner",
  );
  assert.ok(
    amendment.acceptedHistoricalSha256?.includes(
      "8518a3dd2f87e8f8ea1bf10ab006794dc0364543deb430aa0f0cb713a3d59adf",
    ),
    "the pre-edit digest must stay authorized or existing databases lose their forward path",
  );

  const manifest = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, "core/identity/database/migrations/manifest.json"), "utf8"),
  );
  const entry = manifest.migrations.find((item) => item.file === "identity-018_session_surface.sql");
  assert.equal(entry.state, "HISTORICAL_IMMUTABLE");
  assert.equal(
    amendment.replacementSha256,
    entry.sha256,
    "the amendment replacement digest must track the manifest digest",
  );
});

test("the gate passes on the current tree", () => {
  const { status, output } = runGate([]);
  assert.equal(status, 0, `migration-manifest-drift-gate must pass:\n${output}`);
});

test("the gate rejects a HISTORICAL_IMMUTABLE digest replaced without an amendment", () => {
  // Measured against a baseline predating the identity convergence work, several
  // frozen identity migrations had their digests replaced with no amendment. If
  // this stops failing, the rule has been silently disabled.
  const { status, output } = runGate(["--service", "identity", "--immutable-baseline", "2f1568ed3^"]);

  assert.equal(status, 1, "unamended digest replacement must fail the gate");
  assert.match(output, /HISTORICAL_IMMUTABLE digest replaced without amendment/);
});

test("a registered amendment is what clears identity-018 against that same baseline", () => {
  // identity-018's digest was replaced by 2f1568ed3 exactly like the migrations
  // reported above, so its absence from the failure list proves the amendment --
  // not a scope loophole -- is what satisfies the gate.
  const { output } = runGate(["--service", "identity", "--immutable-baseline", "2f1568ed3^"]);

  assert.doesNotMatch(
    output,
    /identity-018_session_surface\.sql/,
    "identity-018 must be cleared by its amendment, not reported as a breach",
  );
});
