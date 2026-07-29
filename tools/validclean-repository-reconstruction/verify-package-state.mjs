import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const packageRoot = path.join(root, "tools/validclean-repository-reconstruction");
const failures = [];
const fail = (message) => failures.push(message);

function read(relativePath) {
  const absolute = path.join(packageRoot, relativePath);
  if (!fs.existsSync(absolute)) {
    fail(`missing package file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolute, "utf8");
}

const readme = read("README.md");
const manifestText = read("plan.manifest.json");
let manifest;
try {
  manifest = JSON.parse(manifestText);
} catch (error) {
  fail(`plan.manifest.json is invalid JSON: ${error.message}`);
  manifest = {};
}

const readmeState = readme.match(/^> الحالة الحاكمة: `([^`]+)`/m)?.[1] ?? "";
const expectedState = "REPOSITORY_WIDE_RECONSTRUCTION_AUTHORIZED";

if (manifest.schemaVersion !== 2) fail(`schemaVersion must be 2, got ${manifest.schemaVersion}`);
if (manifest.status !== expectedState) fail(`manifest status must be ${expectedState}, got ${manifest.status}`);
if (readmeState !== expectedState) fail(`README status must be ${expectedState}, got ${readmeState || "<missing>"}`);
if (readmeState !== manifest.status) fail(`README/manifest state mismatch: ${readmeState} != ${manifest.status}`);

if (manifest.pinnedAudit?.targetSha !== "fbc0139234e2bdb34a8de77d74a6b91297a754b0") {
  fail("pinned audit target must remain fbc0139234e2bdb34a8de77d74a6b91297a754b0");
}
if (manifest.pinnedAudit?.totalTrackedPaths !== 3938) fail("pinned audit totalTrackedPaths must be 3938");
if (manifest.pinnedAudit?.correctedFindings?.P0 !== 56) fail("pinned audit P0 count must be 56");
if (manifest.pinnedAudit?.correctedFindings?.P1 !== 60) fail("pinned audit P1 count must be 60");
if (manifest.pinnedAudit?.correctedFindings?.P2 !== 229) fail("pinned audit P2 count must be 229");

if (manifest.authorization?.implementationAuthorized !== true) fail("implementation must be authorized");
if (manifest.authorization?.mergeToMasterAuthorized !== false) fail("master merge must remain unauthorized");
if (manifest.authorization?.productionDeploymentAuthorized !== false) fail("production deployment must remain unauthorized");
if (manifest.authorization?.forcePushOrHistoryRewriteAuthorized !== false) fail("force push/history rewrite must remain unauthorized");

const expectedDocuments = Array.from({ length: 18 }, (_, index) =>
  index === 0 ? "README.md" : `${String(index - 1).padStart(2, "0")}`,
);
const listed = new Set(manifest.documents ?? []);
for (const document of manifest.documents ?? []) read(document);
for (const number of Array.from({ length: 18 }, (_, i) => String(i).padStart(2, "0"))) {
  const matching = [...listed].filter((entry) => entry.startsWith(`${number}_`));
  if (matching.length !== 1) fail(`expected exactly one document with prefix ${number}_, found ${matching.length}`);
}
if (!listed.has("README.md")) fail("manifest documents must include README.md");

for (const [name, state] of Object.entries(manifest.execution?.slices ?? {})) {
  const allowed = new Set([
    "NOT_STARTED",
    "DIAGNOSIS_COMPLETE",
    "IMPLEMENTATION_IN_PROGRESS",
    "BLOCKED_BY_DEPENDENCY",
    "IMPLEMENTED_PENDING_DB_PROOF",
    "IMPLEMENTED_PENDING_RUNTIME_PROOF",
    "VERIFIED_SAME_SHA",
    "CLOSED_WITH_EVIDENCE",
  ]);
  if (!allowed.has(state)) fail(`slice ${name} has invalid state ${state}`);
}

for (const file of ["README.md", "00_REMOTE_BASELINE_AND_FINDINGS.md", "07_APPROVAL_CHECKPOINT.md"]) {
  const text = read(file);
  if (text.includes("PLAN_ONLY_AWAITING_OWNER_APPROVAL")) fail(`${file} contains obsolete approval-waiting state`);
  if (/implementation_started:\s*false/.test(text)) fail(`${file} incorrectly says implementation has not started`);
}

if (!read("17_FINAL_CLOSURE_MATRIX.md").includes("CLOSED_WITH_EVIDENCE")) {
  fail("final closure matrix must declare CLOSED_WITH_EVIDENCE as the only final state");
}

if (failures.length > 0) {
  console.error("validclean-package-state: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`validclean-package-state: PASS (${manifest.documents.length} documents, state=${manifest.status})`);
