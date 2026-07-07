import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { repoRoot } from "./_guard-utils.mjs";

const ledgerPath = path.join(repoRoot, ".diagnostics", "operational-journey-factory", "gap-ledger.json");

function fail(message) {
  console.error(`foundation-cross-journey-closure-gate: FAIL`);
  console.error(message);
  process.exit(1);
}

function currentHead() {
  return execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
}

let ledger = { gaps: [], head_sha: "", gap_count: 0 };
if (fs.existsSync(ledgerPath)) {
  ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
} else {
  ledger.head_sha = currentHead();
}
const head = currentHead();

const gaps = Array.isArray(ledger.gaps) ? ledger.gaps : [];
const failures = [];

if (ledger.head_sha !== head) {
  failures.push(`HEAD mismatch: ledger=${ledger.head_sha} current=${head}`);
}

if (Number(ledger.gap_count || 0) !== gaps.length) {
  failures.push(`gap_count mismatch: ledger.gap_count=${ledger.gap_count} actual=${gaps.length}`);
}

for (const gap of gaps) {
  const id = gap.gap_id || gap.path || "<unknown-gap>";

  if (gap.blocks_journey_start === true) failures.push(`${id}: blocks_journey_start=true`);
  if (gap.status === "OPEN") failures.push(`${id}: status=OPEN`);
  if (!gap.owner || gap.owner === "unassigned") failures.push(`${id}: owner missing/unassigned`);
  if (!gap.required_action) failures.push(`${id}: required_action missing`);
  if (!Array.isArray(gap.target_files) || gap.target_files.length === 0) failures.push(`${id}: target_files missing`);
  if (!Array.isArray(gap.verification_commands) || gap.verification_commands.length === 0) failures.push(`${id}: verification_commands missing`);
  if (!Array.isArray(gap.proof_required) || gap.proof_required.length === 0) failures.push(`${id}: proof_required missing`);

  const serialized = JSON.stringify(gap);
  if (serialized.includes("undefined")) failures.push(`${id}: contains undefined`);

  const forbiddenTypes = new Set([
    "DIRECT_API_IN_SURFACE",
    "SHARED_API_LOGIC_MIXED",
    "DIRECT_API_IN_SHARED_UNCLASSIFIED",
    "CI_NOT_PROVEN"
  ]);

  if (forbiddenTypes.has(gap.type)) {
    failures.push(`${id}: forbidden foundation gap type remains: ${gap.type}`);
  }
}

if (failures.length > 0) {
  console.error("foundation-cross-journey-closure-gate: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("foundation-cross-journey-closure-gate: PASS");
console.log(`head_sha: ${head}`);
console.log(`gap_count: ${gaps.length}`);
