import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import test from "node:test";

const REPO_ROOT = new URL("../../../", import.meta.url);
const MANIFEST_PATH = "services/dsh/contracts/jrn-011-slice-closure.json";

async function readRepo(path) {
  return readFile(new URL(path, REPO_ROOT), "utf8");
}

async function readManifest() {
  return JSON.parse(await readRepo(MANIFEST_PATH));
}

function expectedSliceIds() {
  return Array.from({ length: 18 }, (_, index) => `FS-${String(index + 1).padStart(2, "0")}`);
}

test("JRN-011 registers exactly FS-01 through FS-18 as code-closed", async () => {
  const manifest = await readManifest();
  assert.equal(manifest.journeyId, "JRN-011");
  assert.equal(manifest.closureMode, "CODE_AND_AUTOMATED_EVIDENCE");
  assert.equal(manifest.requiredSliceCount, 18);
  assert.equal(manifest.codeDecision, "CLOSED");
  assert.equal(manifest.releaseDecision, "READY_FOR_INDEPENDENT_REVIEW");
  assert.deepEqual(manifest.slices.map((slice) => slice.id), expectedSliceIds());
  assert.equal(new Set(manifest.slices.map((slice) => slice.id)).size, 18);
  for (const slice of manifest.slices) {
    assert.equal(slice.codeStatus, "CLOSED", `${slice.id} is not code-closed`);
    assert.ok(slice.name.length >= 3, `${slice.id} has no meaningful name`);
    assert.ok(slice.requiredFiles.length > 0, `${slice.id} has no executable evidence files`);
    assert.ok(slice.requiredMarkers.length > 0, `${slice.id} has no executable evidence markers`);
  }
});

test("every JRN-011 slice points to existing code and proves its required markers", async () => {
  const manifest = await readManifest();
  const failures = [];

  for (const slice of manifest.slices) {
    const contents = [];
    for (const path of slice.requiredFiles) {
      assert.ok(!path.startsWith("/") && !path.includes(".."), `${slice.id} contains unsafe evidence path ${path}`);
      try {
        await access(new URL(path, REPO_ROOT), constants.R_OK);
        contents.push(await readRepo(path));
      } catch (error) {
        failures.push(`${slice.id}: missing ${path}: ${error.message}`);
      }
    }
    const joined = contents.join("\n");
    for (const marker of slice.requiredMarkers) {
      if (!joined.includes(marker)) {
        failures.push(`${slice.id}: missing marker ${JSON.stringify(marker)}`);
      }
    }
  }

  assert.deepEqual(failures, []);
});

test("JRN-011 closure manifest cannot hide pending code behind external review", async () => {
  const manifest = await readManifest();
  const serialized = JSON.stringify(manifest);
  assert.doesNotMatch(serialized, /IMPLEMENTED_PENDING|DEFINED_NOT_PROVEN|FIX_REQUIRED|NEEDS_EVIDENCE/);
  assert.match(serialized, /READY_FOR_INDEPENDENT_REVIEW/);

  const evidence = JSON.parse(await readRepo("governance/evidence/jrn-011-order-truth-evidence.json"));
  assert.equal(evidence.decision, "READY_FOR_REVIEW");
  assert.equal(evidence.zeroGate.unresolvedInternalGaps, 0);
  assert.equal(evidence.zeroGate.failedRequiredInternalChecks, 0);
  assert.equal(evidence.nextJourneyStarted, false);
});

test("JRN-011 CI is required to execute static, Go, PostgreSQL, TypeScript and live DB lifecycle gates", async () => {
  const workflow = await readRepo(".github/workflows/jrn-011-order-truth-verify.yml");
  for (const marker of [
    "static-integrity:",
    "go-contracts:",
    "database-invariants:",
    "typescript-binding:",
    "TestCreateOrderTruthLifecycleDBIntegration",
    "jrn-011/order-truth",
  ]) {
    assert.ok(workflow.includes(marker), `workflow is missing required gate ${marker}`);
  }
});
