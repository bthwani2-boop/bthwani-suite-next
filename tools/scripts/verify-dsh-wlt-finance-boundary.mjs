import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";

const outputJsonPath = path.join(repoRoot, ".diagnostics/operational-journey-factory/dsh-wlt-finance-boundary-proof.json");

const violations = [];

// Audit files in services/dsh targeting wallet, ledger, commission, settlements
function walk(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", "build", ".next", ".git", ".diagnostics", ".nx", ".turbo"].includes(entry.name)) continue;
      walk(full, results);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

const dshSourceFiles = walk(path.join(repoRoot, "services/dsh"));
for (const file of dshSourceFiles) {
  const content = fs.readFileSync(file, "utf8");
  const rel = path.relative(repoRoot, file).replace(/\\/g, "/");

  // Check for local state mutations or ledger truth modification in DSH
  const financialKeywords = [
    /\bwalletBalance\s*=\s*/,
    /\bwalletMutation\s*=\s*/,
    /\bcommissionRate\s*=\s*/,
    /\bsettlePayment\s*=\s*/,
    /\bupdateLedgerTruth\b/
  ];

  for (const regex of financialKeywords) {
    if (regex.test(content)) {
      violations.push({
        file: rel,
        type: "WLT_DSH_FINANCE_BOUNDARY_VIOLATION",
        reason: `DSH code contains financial mutation logic: ${regex.toString()}`
      });
    }
  }
}

fs.mkdirSync(path.dirname(outputJsonPath), { recursive: true });
fs.writeFileSync(outputJsonPath, JSON.stringify({
  generated_at: new Date().toISOString(),
  violations_count: violations.length,
  violations,
  status: violations.length === 0 ? "BOUNDARY_CLEAN" : "BOUNDARY_VIOLATIONS_DETECTED"
}, null, 2), "utf8");

console.log(`WLT/DSH financial boundary verified with ${violations.length} violations.`);
