import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { repoRoot } from "../guards/_guard-utils.mjs";

const outDir = path.join(repoRoot, ".diagnostics", "operational-journey-factory");

function headSha() {
  try {
    return execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return "HEAD_UNAVAILABLE";
  }
}

function readJson(name, fallback) {
  const file = path.join(outDir, name);
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const ledgerSchema = `
schema: execution_ledger
version: 1.0
sections:
  atomic_scope:
    boundaries: []
    file_decisions: []
  surfaces: []
  backend:
    apis: []
    database: []
  runtime:
    docker_env: []
    toolchain: []
  cleanup:
    moves_merges_deletes: []
  gaps:
    ledger: []
`;

const closureSchema = `
schema: verification_closure
version: 1.0
sections:
  numeric_gate:
    unbound_controls: 0
    contract_mismatches: 0
    permission_mismatches: 0
    failed_required_checks: 0
    unresolved_internal_gaps: 0
    duplicate_truth_owners: 0
    runtime_journeys_unverified: 0
  live_code_closure:
    docs_only_changes_allowed_for_closure: false
    governance_only_changes_allowed_for_closure: false
    diagnostics_only_changes_allowed_for_closure: false
    checklist_only_changes_allowed_for_closure: false
    generated_output_only_changes_allowed_for_closure: false
  zero_defect_checks: []
  frontend_backend_acceptance: []
  final_decision:
    result: ""
    reason: ""
    remaining_external_blockers: []
`;

fs.writeFileSync(path.join(outDir, "01_EXECUTION_LEDGER.yaml"), ledgerSchema.trim() + "\\n");
fs.writeFileSync(path.join(outDir, "02_VERIFICATION_CLOSURE.yaml"), closureSchema.trim() + "\\n");

console.log("Built operational journey package (Execution Ledger & Verification Closure)");
