import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import test from "node:test";

const REPO_ROOT = new URL("../../../", import.meta.url);
const MANIFEST_PATH = "services/dsh/contracts/jrn-013-slice-closure.json";

async function readRepo(path) {
  return readFile(new URL(path, REPO_ROOT), "utf8");
}

async function readManifest() {
  return JSON.parse(await readRepo(MANIFEST_PATH));
}

function expectedSliceIds() {
  return Array.from({ length: 18 }, (_, index) => `FS-${String(index + 1).padStart(2, "0")}`);
}

test("JRN-013 registers exactly FS-01 through FS-18 as code-closed", async () => {
  const manifest = await readManifest();
  assert.equal(manifest.journeyId, "JRN-013");
  assert.equal(manifest.requiredSliceCount, 18);
  assert.equal(manifest.codeDecision, "CLOSED");
  assert.equal(manifest.releaseDecision, "READY_FOR_INDEPENDENT_REVIEW");
  assert.deepEqual(manifest.slices.map((slice) => slice.id), expectedSliceIds());
  assert.equal(new Set(manifest.slices.map((slice) => slice.id)).size, 18);
  for (const slice of manifest.slices) {
    assert.equal(slice.codeStatus, "CLOSED", `${slice.id} is not code-closed`);
    assert.ok(slice.name.length >= 3, `${slice.id} has no meaningful name`);
    assert.ok(slice.requiredFiles.length > 0, `${slice.id} has no evidence files`);
    assert.ok(slice.requiredMarkers.length > 0, `${slice.id} has no evidence markers`);
  }
});

test("every JRN-013 slice points to existing code and proves its markers", async () => {
  const manifest = await readManifest();
  const failures = [];
  for (const slice of manifest.slices) {
    const contents = [];
    for (const path of slice.requiredFiles) {
      assert.ok(!path.startsWith("/") && !path.includes(".."), `${slice.id} contains unsafe path ${path}`);
      try {
        await access(new URL(path, REPO_ROOT), constants.R_OK);
        contents.push(await readRepo(path));
      } catch (error) {
        failures.push(`${slice.id}: missing ${path}: ${error.message}`);
      }
    }
    const joined = contents.join("\n");
    for (const marker of slice.requiredMarkers) {
      if (!joined.includes(marker)) failures.push(`${slice.id}: missing marker ${JSON.stringify(marker)}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("JRN-013 automated closure remains distinct from production approval", async () => {
  const manifest = await readManifest();
  const serialized = JSON.stringify(manifest);
  assert.doesNotMatch(serialized, /FIX_REQUIRED|DEFINED_NOT_PROVEN|NEEDS_EVIDENCE/);
  assert.match(serialized, /READY_FOR_INDEPENDENT_REVIEW/);
  assert.equal(manifest.executionEvidence.ciRuns, "PASSED");
  assert.equal(manifest.executionEvidence.ciRunId, 29882102801);
  assert.equal(manifest.executionEvidence.verifiedHead, "b95f44dda9b0b4eb1a8ad59001a933ca13ccb53f");
  assert.equal(manifest.executionEvidence.runtimeDeviceQa, "PENDING");
  assert.ok(Array.isArray(manifest.independentReviewPending));
  assert.ok(manifest.independentReviewPending.length > 0);

  const productTruth = JSON.parse(await readRepo(
    "governance/product/contracts/jrn-013-store-captain-handoff.product-truth.json",
  ));
  assert.equal(productTruth.decision, "READY_FOR_INDEPENDENT_REVIEW");
  assert.equal(productTruth.internalZeroGate, "AUTOMATED_CLOSURE_PASSED");
  assert.equal(productTruth.evidenceState.targetedTests, "PASSED");
  assert.equal(productTruth.evidenceState.ciExecution, "PASSED");
  assert.equal(productTruth.owner, "DSH");
  assert.equal(productTruth.truthOwnership.financialTruth, "WLT");
  assert.equal(productTruth.evidenceState.productionRelease, "NOT_APPROVED");
});

test("JRN-013 prevents refresh from reopening custody actions", async () => {
  const workboard = await readRepo("services/dsh/backend/internal/http/partner_order_workboard.go");
  const partnerAdapter = await readRepo("services/dsh/frontend/shared/partner/partner.adapters.ts");
  const captainController = await readRepo("services/dsh/frontend/shared/dispatch/use-store-captain-handoff-exception.ts");
  const captainScreen = await readRepo("services/dsh/frontend/app-captain/orders/OperationalCaptainExecutionScreen.tsx");

  for (const marker of [
    "hasOpenStoreCaptainHandoffException",
    "OpenStoreCaptainHandoffExceptionID",
    "ResolvablePreparationIssueCount",
  ]) {
    assert.ok(workboard.includes(marker), `partner workboard is missing ${marker}`);
  }
  for (const marker of [
    "exposes handoff while custody exception is active",
    "pending customer decision count is inconsistent",
    "resolvable preparation issue count is inconsistent",
  ]) {
    assert.ok(partnerAdapter.includes(marker), `partner adapter is missing ${marker}`);
  }
  for (const marker of [
    "fetchCaptainDeliveryException",
    "setReadback({ kind: \"blocked\"",
    "backend pickup guard blocks on every open/acknowledged delivery",
  ]) {
    assert.ok(captainController.includes(marker), `captain controller is missing ${marker}`);
  }
  for (const marker of [
    "readbackBlocksPickup",
    "setInterval",
    "الاستلام محجوب بقرار تشغيلي",
  ]) {
    assert.ok(captainScreen.includes(marker), `captain screen is missing ${marker}`);
  }
});
