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

const EXPECTED_SLICES = [
  ["FS-01", "Product truth"],
  ["FS-02", "Roles, permissions"],
  ["FS-03", "States, transitions"],
  ["FS-04", "Truth ownership"],
  ["FS-05", "Database migrations"],
  ["FS-06", "OpenAPI"],
  ["FS-07", "Backend routes"],
  ["FS-08", "Events, outbox"],
  ["FS-09", "Shared frontend brain"],
  ["FS-10", "All required surfaces"],
  ["FS-11", "Visible loading"],
  ["FS-12", "Cross-surface read-after-write"],
  ["FS-13", "Security, privacy"],
  ["FS-14", "Accessibility, Arabic RTL"],
  ["FS-15", "SLA, monitoring"],
  ["FS-16", "Cleanup of legacy"],
  ["FS-17", "Targeted verification"],
  ["FS-18", "Same-commit evidence"],
];

test("JRN-012 registers canonical FS-01 through FS-18 as code-closed", async () => {
  const manifest = await readManifest();
  assert.equal(manifest.journeyId, "JRN-012");
  assert.equal(manifest.requiredSliceCount, 18);
  assert.equal(manifest.codeDecision, "CLOSED");
  assert.equal(manifest.releaseDecision, "READY_FOR_INDEPENDENT_REVIEW");
  assert.deepEqual(
    manifest.slices.map((slice) => slice.id),
    EXPECTED_SLICES.map(([id]) => id),
  );
  assert.equal(new Set(manifest.slices.map((slice) => slice.id)).size, 18);
  for (const [index, slice] of manifest.slices.entries()) {
    assert.equal(slice.codeStatus, "CLOSED", `${slice.id} is not code-closed`);
    assert.ok(slice.name.startsWith(EXPECTED_SLICES[index][1]), `${slice.id} does not match the canonical slice definition`);
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

test("JRN-012 code closure remains distinct from release and production approval", async () => {
  const manifest = await readManifest();
  assert.deepEqual(manifest.openCodeGaps, []);
  assert.match(manifest.releaseDecision, /READY_FOR_INDEPENDENT_REVIEW/);
  assert.ok(Array.isArray(manifest.remainingReleaseGates));
  assert.ok(manifest.remainingReleaseGates.some((gate) => gate.includes("same-commit CI status")));
  assert.ok(Array.isArray(manifest.independentReviewPending));
  assert.ok(manifest.independentReviewPending.length > 0);

  const productTruth = JSON.parse(await readRepo(
    "governance/product/contracts/jrn-012-order-preparation-readiness.product-truth.json",
  ));
  assert.equal(productTruth.decision, "READY_FOR_REVIEW");
  assert.equal(productTruth.owner, "DSH");
  assert.equal(productTruth.truthOwnership.financialTruth, "WLT");
  assert.equal(productTruth.codeZeroGate, "IMPLEMENTED");
  assert.equal(productTruth.releaseGate, "PENDING_INDEPENDENT_APPROVALS");
  assert.ok(productTruth.operationalSupport.rollback.length > 0);
});

test("JRN-012 removes the legacy partner row adapter and enforces all critical gates", async () => {
  const adapter = await readRepo("services/dsh/frontend/shared/partner/partner.adapters.ts");
  assert.doesNotMatch(adapter, /mapRuntimeRowToPartnerOrderItem/);
  assert.doesNotMatch(adapter, /@deprecated/);
  assert.match(adapter, /No compatibility projection for legacy rows/);
  assert.match(adapter, /exposes ready while preparation issues are open/);
  assert.match(adapter, /exposes resolve_issue without a resolvable issue/);

  const goTest = await readRepo("services/dsh/backend/internal/http/partner_order_workboard_test.go");
  for (const marker of [
    "preparing resolvable issue blocks ready",
    "preparing pending substitution blocks ready and resolve",
    "handoff exception blocks confirmation",
  ]) {
    assert.ok(goTest.includes(marker), `Go action test is missing ${marker}`);
  }

  const closureTest = await readRepo("services/dsh/tests/jrn-012-order-preparation-closure.test.mjs");
  for (const marker of [
    "atomic readiness",
    "OpenAPI declares every live preparation capability",
    "partner and client perform real issue and substitution workflows",
    "captain and operator surfaces read the same preparation truth",
  ]) {
    assert.ok(closureTest.includes(marker), `closure test is missing ${marker}`);
  }
});
