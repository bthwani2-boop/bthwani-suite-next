import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-manifest";
const violations = [];
const sdlcRootRelative = "governance/contracts/sdlc";
const sdlcRoot = path.join(repoRoot, sdlcRootRelative);
const exists = (relative) => fs.existsSync(path.join(repoRoot, relative));

const requiredFiles = [
  "README.md", "lifecycle.state-machine.yaml", "roles-and-authority.yaml", "gate-catalog.yaml",
  "quality-profile.yaml", "security-profile.yaml", "test-profile.yaml", "defect-policy.yaml",
  "exception-policy.yaml", "metrics.yaml", "artifact-manifest.schema.json", "change-impact.schema.json",
  "templates/capability-intake.yaml", "templates/requirements.yaml", "templates/architecture-review.yaml",
  "templates/threat-model.yaml", "templates/test-plan.yaml", "templates/pentest-scope.yaml",
  "templates/release-readiness.yaml", "templates/production-verification.yaml", "templates/closure-decision.yaml"
];
for (const relative of requiredFiles) {
  const full = path.join(sdlcRoot, relative);
  if (!fs.existsSync(full)) violations.push({ file: `${sdlcRootRelative}/${relative}`, message: "MISSING_SDLC_CONTRACT_FILE" });
  else if (!fs.readFileSync(full, "utf8").trim()) violations.push({ file: `${sdlcRootRelative}/${relative}`, message: "EMPTY_SDLC_CONTRACT_FILE" });
}

const schemaFiles = [
  "governance/authority/authority-precedence.schema.json", "governance/contracts/decision-vocabulary.schema.json",
  "governance/agents/agent-schema.json", "governance/skills/skills-schema.json", "governance/guards/guard-schema.json",
  "governance/guards/guard-assurance.schema.json", "governance/github/workflow-registry.schema.json",
  "governance/product/product-truth.schema.json", `${sdlcRootRelative}/artifact-manifest.schema.json`, `${sdlcRootRelative}/change-impact.schema.json`
];
const ajv = new Ajv({ allErrors: true, strict: false });
for (const relative of schemaFiles) {
  if (!exists(relative)) { violations.push({ file: relative, message: "MISSING_SDLC_DEPENDENCY_SCHEMA" }); continue; }
  try { ajv.compile(JSON.parse(fs.readFileSync(path.join(repoRoot, relative), "utf8"))); }
  catch (error) { violations.push({ file: relative, message: `INVALID_JSON_SCHEMA ${error.message}` }); }
}

const semanticMarkers = new Map([
  ["README.md", ["notApplicableStages", "applicableEvidenceScopes", "finance", "isolation", "governance", "ci"]],
  ["lifecycle.state-machine.yaml", ["version: 3", "G1_PRODUCT_MODEL_APPROVED", "G4_IMPLEMENTATION_VERIFIED", "G5_PRODUCT_ACCEPTED", "G10_PRODUCTION_VERIFIED", "PROTOCOL_VIOLATION", "same_commit_evidence_required", "all_applicable_evidence_scopes_required_for_closure"]],
  ["roles-and-authority.yaml", ["version: 3", "product_manager_authority:", "product_owner_acceptance_authority:", "governance_contract_authority:", "ci_workflow_authority:", "financial_control_authority:", "independent_reviewer:", "application_security_authority:", "release_authority:", "risk_acceptance_authority:"]],
  ["gate-catalog.yaml", ["version: 3", "G1_PRODUCT_MODEL_APPROVED:", "G4_IMPLEMENTATION_VERIFIED:", "owner: independent_reviewer", "G5_PRODUCT_ACCEPTED:", "G10_PRODUCTION_VERIFIED:", "CLOSED_WITH_EVIDENCE:"]],
  ["artifact-manifest.schema.json", ['"schemaVersion": { "const": 3 }', '"applicableEvidenceScopes"', '"passedEvidenceScopes"', '"notApplicableStages"', '"stageExclusions"', '"finance"', '"isolation"', '"governance"', '"ci"']],
  ["change-impact.schema.json", ['"schemaVersion": { "const": 3 }', '"visual"', '"qa"', '"wltFinance"', '"operatorContext"', '"governance"', '"ci"', '"release"', '"production"']],
  ["templates/capability-intake.yaml", ["productImpact:", "productTruthContract:"]],
  ["templates/requirements.yaml", ["requiredSurfaces:", "excludedSurfaces:", "forbiddenActions:", "negativeInvariants:"]],
  ["templates/closure-decision.yaml", ["schemaVersion: 3", "applicableEvidenceScopes:", "notApplicableStages:", "stageExclusions:"]]
]);
for (const [relative, markers] of semanticMarkers) {
  const full = path.join(sdlcRoot, relative);
  if (!fs.existsSync(full)) continue;
  const content = fs.readFileSync(full, "utf8");
  for (const marker of markers) if (!content.includes(marker)) violations.push({ file: `${sdlcRootRelative}/${relative}`, message: `MISSING_SDLC_SEMANTIC_MARKER ${marker}` });
}

for (const requiredAuthority of [
  "governance/GOVERNANCE.md", "governance/product/PRD.md", "governance/product/platform-model.yaml",
  "governance/policies/engineering.md", "governance/policies/security.md", "governance/policies/delivery.md",
  "governance/authority/authority-precedence.json", "governance/contracts/decision-vocabulary.json",
  "governance/contracts/full-verification-policy.json", "governance/agents/agent-registry.json",
  "governance/skills/skills-registry.json", "governance/guards/guard-registry.json",
  "governance/guards/guard-assurance.json", "governance/github/workflow-registry.json"
]) if (!exists(requiredAuthority)) violations.push({ file: requiredAuthority, message: "MISSING_ACTIVE_SDLC_AUTHORITY" });

fail(guardId, violations);
