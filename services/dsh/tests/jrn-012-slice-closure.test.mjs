import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import test from "node:test";

const REPO_ROOT = new URL("../../../", import.meta.url);
const MANIFEST_PATH = "services/dsh/contracts/jrn-012-slice-closure.json";

async function readRepo(path) {
  return readFile(new URL(path, REPO_ROOT), "utf8");
}

async function readManifest() {
  return JSON.parse(await readRepo(MANIFEST_PATH));
}

function expectedSliceIds() {
  return Array.from({ length: 18 }, (_, index) => `FS-${String(index + 1).padStart(2, "0")}`);
}

test("JRN-012 registers exactly FS-01 through FS-18 as code-closed", async () => {
  const manifest = await readManifest();
  assert.equal(manifest.journeyId, "JRN-012");
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

test("every JRN-012 slice points to existing code and proves its markers", async () => {
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

test("JRN-012 closure cannot hide internal code gaps behind independent review", async () => {
  const manifest = await readManifest();
  const serialized = JSON.stringify(manifest);
  assert.doesNotMatch(serialized, /IMPLEMENTED_PENDING|DEFINED_NOT_PROVEN|FIX_REQUIRED|NEEDS_EVIDENCE/);
  assert.match(serialized, /READY_FOR_INDEPENDENT_REVIEW/);
  assert.ok(Array.isArray(manifest.independentReviewPending));
  assert.ok(manifest.independentReviewPending.length > 0);

  const productTruth = JSON.parse(await readRepo(
    "governance/product/contracts/jrn-012-order-preparation-readiness.product-truth.json",
  ));
  assert.equal(productTruth.decision, "READY_FOR_REVIEW");
  assert.equal(productTruth.owner, "DSH");
  assert.equal(productTruth.truthOwnership.financialTruth, "WLT");
});

test("JRN-012 issue gate is represented in backend tests and cross-layer closure tests", async () => {
  const goTest = await readRepo("services/dsh/backend/internal/http/partner_order_workboard_test.go");
  const closureTest = await readRepo("services/dsh/tests/jrn-012-order-preparation-closure.test.mjs");
  for (const marker of [
    "preparing issue blocks ready",
    "resolve_issue",
    "report_issue",
  ]) {
    assert.ok(goTest.includes(marker), `Go action test is missing ${marker}`);
  }
  for (const marker of [
    "atomically blocks invalid readiness",
    "OpenAPI declares every live preparation capability",
    "partner UI reports and resolves issues",
  ]) {
    assert.ok(closureTest.includes(marker), `closure test is missing ${marker}`);
  }
});
