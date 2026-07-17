import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-manifest";
const violations = [];
const sdlcRoot = path.join(repoRoot, "governance/operational_journey_protocol_package/sdlc");

const requiredFiles = [
  "README.md", "lifecycle.state-machine.yaml", "roles-and-authority.yaml", "gate-catalog.yaml",
  "quality-profile.yaml", "security-profile.yaml", "test-profile.yaml", "defect-policy.yaml",
  "exception-policy.yaml", "metrics.yaml", "artifact-manifest.schema.json", "change-impact.schema.json",
  "templates/capability-intake.yaml", "templates/requirements.yaml", "templates/architecture-review.yaml",
  "templates/threat-model.yaml", "templates/test-plan.yaml", "templates/pentest-scope.yaml",
  "templates/release-readiness.yaml", "templates/production-verification.yaml", "templates/closure-decision.yaml",
];

for (const relative of requiredFiles) {
  const fullPath = path.join(sdlcRoot, relative);
  if (!fs.existsSync(fullPath)) {
    violations.push({ file: `governance/operational_journey_protocol_package/sdlc/${relative}`, message: "MISSING_SDLC_SUPPORT_FILE" });
    continue;
  }
  if (fs.readFileSync(fullPath, "utf8").trim() === "") violations.push({ file: `governance/operational_journey_protocol_package/sdlc/${relative}`, message: "EMPTY_SDLC_SUPPORT_FILE" });
}

const schemaFiles = [
  "governance/authority/authority-precedence.schema.json",
  "governance/contracts/decision-vocabulary.schema.json",
  "governance/agents/agent-schema.json",
  "governance/skills/skills-schema.json",
  "governance/guards/guard-schema.json",
  "governance/product/product-truth.schema.json",
  "governance/operational_journey_protocol_package/sdlc/artifact-manifest.schema.json",
  "governance/operational_journey_protocol_package/sdlc/change-impact.schema.json",
];
const ajv = new Ajv({ allErrors: true, strict: false });
for (const relative of schemaFiles) {
  const fullPath = path.join(repoRoot, relative);
  if (!fs.existsSync(fullPath)) {
    violations.push({ file: relative, message: "MISSING_SDLC_DEPENDENCY_SCHEMA" });
    continue;
  }
  try {
    ajv.compile(JSON.parse(fs.readFileSync(fullPath, "utf8")));
  } catch (error) {
    violations.push({ file: relative, message: `INVALID_JSON_SCHEMA ${error.message}` });
  }
}

const semanticMarkers = new Map([
  ["README.md", ["G6_QA_APPROVED", "notApplicableStages", "applicableEvidenceScopes", "finance", "isolation"]],
  ["lifecycle.state-machine.yaml", [
    "version: 3", "G1_PRODUCT_MODEL_APPROVED", "G5_PRODUCT_ACCEPTED", "G10_PRODUCTION_VERIFIED",
    "PROTOCOL_VIOLATION", "all_applicable_evidence_scopes_required_for_closure",
    "governance_change_requires_governance_contract_authority", "ci_change_requires_ci_workflow_authority",
  ]],
  ["roles-and-authority.yaml", [
    "version: 3", "product_manager_authority:", "product_owner_acceptance_authority:",
    "governance_contract_authority:", "ci_workflow_authority:", "financial_control_authority:",
    "independent_quality_authority:", "application_security_authority:", "release_authority:",
    "may_approve_finance: false", "- finance_approval",
  ]],
  ["gate-catalog.yaml", [
    "version: 3", "G1_PRODUCT_MODEL_APPROVED:", "G5_PRODUCT_ACCEPTED:", "G10_PRODUCTION_VERIFIED:",
    "CLOSED_WITH_EVIDENCE:", "latest_applicable_stage_passed", "PROTOCOL_VIOLATION",
  ]],
  ["artifact-manifest.schema.json", [
    '"schemaVersion": { "const": 3 }', '"applicableEvidenceScopes"', '"passedEvidenceScopes"',
    '"notApplicableStages"', '"stageExclusions"', '"finance"', '"isolation"', '"PROTOCOL_VIOLATION"',
  ]],
  ["change-impact.schema.json", [
    '"schemaVersion": { "const": 3 }', '"visual"', '"qa"', '"wltFinance"', '"tenant"',
    '"governance"', '"ci"', '"release"', '"production"',
  ]],
  ["templates/capability-intake.yaml", ["productImpact:", "productTruthContract:", "productManagerAuthority:", "productOwnerAcceptanceAuthority:"]],
  ["templates/requirements.yaml", ["requiredSurfaces:", "excludedSurfaces:", "forbiddenActions:", "negativeInvariants:"]],
  ["templates/closure-decision.yaml", ["schemaVersion: 3", "applicableEvidenceScopes:", "notApplicableStages:", "stageExclusions:"]],
]);

for (const [relative, markers] of semanticMarkers) {
  const fullPath = path.join(sdlcRoot, relative);
  if (!fs.existsSync(fullPath)) continue;
  const content = fs.readFileSync(fullPath, "utf8");
  for (const marker of markers) if (!content.includes(marker)) violations.push({ file: `governance/operational_journey_protocol_package/sdlc/${relative}`, message: `MISSING_SDLC_SEMANTIC_MARKER ${marker}` });
}

for (const requiredAuthority of [
  "governance/authority/authority-precedence.json",
  "governance/contracts/decision-vocabulary.json",
  "governance/agents/agent-registry.json",
  "governance/skills/skills-registry.json",
  "governance/guards/guard-registry.json",
  "governance/product/PRODUCT_TRUTH_POLICY.md",
  "governance/26_SDLC_TEAM_AND_STAGE_GATES.md",
]) if (!fs.existsSync(path.join(repoRoot, requiredAuthority))) violations.push({ file: requiredAuthority, message: "MISSING_ACTIVE_SDLC_AUTHORITY" });

fail(guardId, violations);
