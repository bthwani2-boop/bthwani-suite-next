import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fail, repoRoot, toPosix, listCodeFiles, read, lineNumber } from "./_guard-utils.mjs";

const guardId = "foundation-cross-journey-remediation-gate";
const violations = [];

const remediationDir = path.join(repoRoot, "governance/operational_journey_factory/generated/f00-foundation-cross-journey-remediation");

// 1. Check generated package missing
if (!fs.existsSync(remediationDir)) {
  violations.push({ file: "governance/operational_journey_factory/generated/f00-foundation-cross-journey-remediation", line: 0, message: "GENERATED_PACKAGE_MISSING" });
} else {
  const requiredFiles = [
    "00_INDEX.md",
    "01_TRUTH_LOCK.md",
    "02_TOOLCHAIN_EXECUTION_MATRIX.md",
    "03_LIVE_CODE_SURFACE_CLASSIFICATION.md",
    "04_CROSS_JOURNEY_GAP_LEDGER.md",
    "05_GRAPH_KNIP_DEPENDENCY_TRIAGE.md",
    "06_FRONTEND_SURFACE_REMEDIATION.md",
    "07_SHARED_API_LOGIC_SPLIT.md",
    "08_BACKEND_API_DATABASE_BINDING.md",
    "09_WLT_DSH_FINANCE_BOUNDARY.md",
    "10_RUNTIME_CI_SECURITY_REMEDIATION.md",
    "11_FILE_DECISION_MATRIX.md",
    "12_CLOSURE_GATE.md"
  ];
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(remediationDir, file))) {
      violations.push({ file: `governance/operational_journey_factory/generated/f00-foundation-cross-journey-remediation/${file}`, line: 0, message: "MISSING_REMEDIATION_FILE" });
    }
  }
}

// 2. Check raw diagnostics committed under governance
function checkRawDiagnostics(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      checkRawDiagnostics(full);
    } else if (/\.(json|raw|log)$/i.test(name)) {
      violations.push({ file: toPosix(path.relative(repoRoot, full)), line: 0, message: "RAW_DIAGNOSTIC_TRACKED_IN_GOVERNANCE" });
    }
  }
}
checkRawDiagnostics(path.join(repoRoot, "governance/operational_journey_factory"));

// 3. Check head_sha mismatch
let currentHeadSha = "UNKNOWN";
try {
  currentHeadSha = execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
} catch (e) {
  violations.push({ file: "git", line: 0, message: "COULD_NOT_DETERMINE_HEAD_SHA" });
}

if (currentHeadSha !== "UNKNOWN" && fs.existsSync(remediationDir)) {
  const indexContent = fs.readFileSync(path.join(remediationDir, "00_INDEX.md"), "utf8");
  if (!indexContent.includes(currentHeadSha)) {
    violations.push({ file: "governance/operational_journey_factory/generated/f00-foundation-cross-journey-remediation/00_INDEX.md", line: 0, message: `HEAD_SHA_MISMATCH: expected ${currentHeadSha}` });
  }
}

// 4. Check gaps in ledger and surface counts
const diagnosticsDir = path.join(repoRoot, ".diagnostics/operational-journey-factory");
const gapLedgerPath = path.join(diagnosticsDir, "gap-ledger.json");
const surfaceInventoryPath = path.join(diagnosticsDir, "surface-inventory.json");

if (fs.existsSync(gapLedgerPath)) {
  try {
    const gapLedger = JSON.parse(fs.readFileSync(gapLedgerPath, "utf8"));
    const openGaps = (gapLedger.gaps || []).filter((gap) => gap.status === "OPEN");
    for (const [idx, gap] of openGaps.entries()) {
      violations.push({ file: gapLedgerPath, line: 0, message: `OPEN_GAP_FOUND: ${gap.gap_id}` });
    }

    const unassignedGaps = (gapLedger.gaps || []).filter((gap) => !gap.owner || gap.owner === "unassigned");
    for (const gap of unassignedGaps) {
      violations.push({ file: gapLedgerPath, line: 0, message: `UNASSIGNED_OWNER: ${gap.gap_id}` });
    }

    const invalidActionGaps = (gapLedger.gaps || []).filter((gap) => !gap.required_action || gap.required_action.trim() === "");
    for (const gap of invalidActionGaps) {
      violations.push({ file: gapLedgerPath, line: 0, message: `EMPTY_REQUIRED_ACTION: ${gap.gap_id}` });
    }

    const invalidCommandGaps = (gapLedger.gaps || []).filter((gap) => !gap.verification || gap.verification.trim() === "" || gap.verification.includes("unknown command") || gap.verification.includes("undefined"));
    for (const gap of invalidCommandGaps) {
      violations.push({ file: gapLedgerPath, line: 0, message: `UNDEFINED_VERIFICATION_COMMAND: ${gap.gap_id}` });
    }
  } catch (err) {
    violations.push({ file: ".diagnostics/operational-journey-factory/gap-ledger.json", line: 0, message: `FAILED_TO_PARSE_GAP_LEDGER: ${err.message}` });
  }
}

// Helper to determine allowed direct API shared files
function isAllowedSharedDirectApiFile(file) {
  return /\.(api|client|transport|adapter|runtime)\.(ts|tsx|js|jsx)$/.test(file)
    || /-(client|transport|adapter|runtime-adapter)\.(ts|tsx|js|jsx)$/.test(file)
    || /\/use-[^/]*controller\.(ts|tsx|js|jsx)$/.test(file)
    || /(http|request|http-request)\.(ts|tsx|js|jsx)$/.test(file)
    || /api-base-url\.(ts|tsx|js|jsx)$/.test(file)
    || /\/shared\/platform\/(feature-flags|platform-vars)\.(ts|tsx|js|jsx)$/.test(file)
    || /\/shared\/runtime\/.*\.(ts|tsx|js|jsx)$/.test(file)
    || /\/shared\/media\/(field-document-media|resolve-dev-media-url)\.(ts|tsx|js|jsx)$/.test(file)
    || /\/_kernel\/.*(http|request|api-base-url).*\.(ts|tsx|js|jsx)$/.test(file);
}

if (fs.existsSync(surfaceInventoryPath)) {
  try {
    const surfaceInventory = JSON.parse(fs.readFileSync(surfaceInventoryPath, "utf8"));
    let directApiInSurfaceCount = 0;
    let businessLogicInSurfaceCount = 0;
    let sharedApiLogicMixedCount = 0;
    let directApiInSharedUnclassifiedCount = 0;

    for (const surface of surfaceInventory.surfaces || []) {
      const directApiFiles = surface.direct_api_signs || [];
      const localLogicFiles = surface.local_business_logic_candidates || [];
      const localLogicSet = new Set(localLogicFiles);

      if (surface.kind === "ui_surface") {
        directApiInSurfaceCount += directApiFiles.length;
        businessLogicInSurfaceCount += localLogicFiles.length;
      } else if (surface.kind === "shared_brain") {
        for (const file of directApiFiles) {
          if (isAllowedSharedDirectApiFile(file)) continue;
          if (localLogicSet.has(file)) {
            sharedApiLogicMixedCount++;
          } else {
            directApiInSharedUnclassifiedCount++;
          }
        }
      }
    }

    if (directApiInSurfaceCount > 0) {
      violations.push({ file: surfaceInventoryPath, line: 0, message: `DIRECT_API_IN_SURFACE: count is ${directApiInSurfaceCount}` });
    }
    if (businessLogicInSurfaceCount > 0) {
      violations.push({ file: surfaceInventoryPath, line: 0, message: `BUSINESS_LOGIC_IN_SURFACE: count is ${businessLogicInSurfaceCount}` });
    }
    if (sharedApiLogicMixedCount > 0) {
      violations.push({ file: surfaceInventoryPath, line: 0, message: `SHARED_API_LOGIC_MIXED: count is ${sharedApiLogicMixedCount}` });
    }
    if (directApiInSharedUnclassifiedCount > 0) {
      violations.push({ file: surfaceInventoryPath, line: 0, message: `DIRECT_API_IN_SHARED_UNCLASSIFIED: count is ${directApiInSharedUnclassifiedCount}` });
    }
  } catch (err) {
    violations.push({ file: ".diagnostics/operational-journey-factory/surface-inventory.json", line: 0, message: `FAILED_TO_PARSE_SURFACE_INVENTORY: ${err.message}` });
  }
}

// 5. WLT/DSH finance ambiguity
const mutationRegex = /\b(createLedger|appendLedger|mutateWallet|setWalletBalance|updateWalletBalance|confirmPaymentProviderResult|createPayout|settlePayout|createRefund|settleRefund|markSettlement|walletBalance\s*=|ledgerEntries\.push|settlementStatus\s*=|payoutStatus\s*=|refundStatus\s*=)\b/g;

for (const file of listCodeFiles()) {
  if (file.startsWith("services/wlt/")) continue;
  if (
    file.startsWith("governance/") ||
    file.startsWith("contracts/") ||
    file.startsWith("tools/")
  ) {
    continue;
  }
  if (file.includes("/tests/") || file.includes("/test/") || file.includes(".test.") || file.includes(".spec.")) continue;

  const content = read(file);
  let match;
  while ((match = mutationRegex.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: `WLT_DSH_FINANCE_BOUNDARY_AMBIGUITY: financial mutation found outside WLT`
    });
  }
}

// 6. Check decision matrix file rules
if (fs.existsSync(remediationDir)) {
  const decisionMatrixPath = path.join(remediationDir, "11_FILE_DECISION_MATRIX.md");
  if (fs.existsSync(decisionMatrixPath)) {
    const content = fs.readFileSync(decisionMatrixPath, "utf8");
    if (content.includes("delete_without_proof")) {
      violations.push({ file: "governance/operational_journey_factory/generated/f00-foundation-cross-journey-remediation/11_FILE_DECISION_MATRIX.md", line: 0, message: "DELETE_WITHOUT_PROOF_DECLARED" });
    }
    if (content.includes("move_without_proof")) {
      violations.push({ file: "governance/operational_journey_factory/generated/f00-foundation-cross-journey-remediation/11_FILE_DECISION_MATRIX.md", line: 0, message: "MOVE_WITHOUT_PROOF_DECLARED" });
    }
    if (content.includes("merge_without_proof")) {
      violations.push({ file: "governance/operational_journey_factory/generated/f00-foundation-cross-journey-remediation/11_FILE_DECISION_MATRIX.md", line: 0, message: "MERGE_WITHOUT_PROOF_DECLARED" });
    }
  }
}

fail(guardId, violations);
