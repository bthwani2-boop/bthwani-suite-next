import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const INVENTORY_FILES = Object.freeze([
  "gap-ledger.json",
  "journey-inventory.json",
  "surface-inventory.json",
  "toolchain-inventory.json",
]);

function countExactValue(value, expected) {
  if (value === expected) return 1;
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + countExactValue(item, expected), 0);
  }
  if (value && typeof value === "object") {
    return Object.values(value).reduce(
      (total, item) => total + countExactValue(item, expected),
      0,
    );
  }
  return 0;
}

function containsMockSuccess(value) {
  if (typeof value === "string") {
    return /mock successful run/i.test(value);
  }
  if (Array.isArray(value)) return value.some(containsMockSuccess);
  if (value && typeof value === "object") {
    return Object.values(value).some(containsMockSuccess);
  }
  return false;
}

export function reconcileDiagnostics({ headSha, branch, documents }) {
  const errors = [];
  const counts = {
    gaps: 0,
    proposedUnfilledJourneys: 0,
    unmappedItems: 0,
  };

  for (const file of INVENTORY_FILES) {
    const document = documents[file];
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      errors.push(`${file}: missing or invalid JSON object`);
      continue;
    }
    if (document.head_sha !== headSha) {
      errors.push(`${file}: stale head_sha ${document.head_sha ?? "MISSING"}; expected ${headSha}`);
    }
    if (document.status !== "DISCOVERY_ONLY") {
      errors.push(`${file}: status must remain DISCOVERY_ONLY`);
    }
    if (containsMockSuccess(document)) {
      errors.push(`${file}: contains fabricated mock-success evidence`);
    }
    if (document.final_closure === true || document.exact_100_percent_claim === true) {
      errors.push(`${file}: discovery inventory cannot assert final closure`);
    }
  }

  const gapLedger = documents["gap-ledger.json"];
  if (gapLedger && typeof gapLedger === "object") {
    if (!Array.isArray(gapLedger.gaps)) {
      errors.push("gap-ledger.json: gaps must be an array");
    } else {
      counts.gaps = gapLedger.gaps.length;
      if (gapLedger.gap_count !== counts.gaps) {
        errors.push(
          `gap-ledger.json: gap_count ${gapLedger.gap_count ?? "MISSING"} does not match ${counts.gaps}`,
        );
      }
    }
  }

  for (const document of Object.values(documents)) {
    counts.proposedUnfilledJourneys += countExactValue(document, "PROPOSED_UNFILLED");
    counts.unmappedItems += countExactValue(document, "UNMAPPED");
  }

  const openDiscoveryItems =
    counts.gaps + counts.proposedUnfilledJourneys + counts.unmappedItems;
  const decision = errors.length > 0 || openDiscoveryItems > 0 ? "FIX_REQUIRED" : "PASS";

  return {
    branch,
    head_sha: headSha,
    scope: "static-discovery",
    counts,
    errors,
    decision,
    does_not_prove: [
      "runtime behavior",
      "product acceptance",
      "security or financial approval",
      "release or production readiness",
      "CLOSED_WITH_EVIDENCE",
    ],
  };
}

function gitValue(repoRoot, args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function readDocuments(diagnosticsDir) {
  return Object.fromEntries(
    INVENTORY_FILES.map((file) => {
      const fullPath = path.join(diagnosticsDir, file);
      if (!fs.existsSync(fullPath)) return [file, null];
      try {
        return [file, JSON.parse(fs.readFileSync(fullPath, "utf8"))];
      } catch (error) {
        return [file, { parse_error: error.message }];
      }
    }),
  );
}

export function runDiagnosticsReconciliation(repoRoot = process.cwd()) {
  const diagnosticsDir = path.join(
    repoRoot,
    ".diagnostics",
    "operational-journey-factory",
  );
  const result = reconcileDiagnostics({
    headSha: gitValue(repoRoot, ["rev-parse", "HEAD"]),
    branch: gitValue(repoRoot, ["branch", "--show-current"]),
    documents: readDocuments(diagnosticsDir),
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.decision !== "PASS") process.exitCode = 1;
  return result;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  runDiagnosticsReconciliation();
}
