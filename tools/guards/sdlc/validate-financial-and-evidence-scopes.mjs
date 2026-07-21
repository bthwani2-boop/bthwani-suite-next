import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-financial-and-evidence-scopes";
const violations = [];

function readJson(relative) {
  const full = path.join(repoRoot, relative);
  if (!fs.existsSync(full)) {
    violations.push({ file: relative, message: "REQUIRED_FILE_MISSING" });
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    violations.push({ file: relative, message: `INVALID_JSON ${error.message}` });
    return undefined;
  }
}

function readText(relative) {
  const full = path.join(repoRoot, relative);
  if (!fs.existsSync(full)) {
    violations.push({ file: relative, message: "REQUIRED_FILE_MISSING" });
    return "";
  }
  return fs.readFileSync(full, "utf8");
}

const decisionRelative = "governance/contracts/decision-vocabulary.json";
const agentRelative = "governance/agents/agent-registry.json";
const skillRelative = "governance/skills/skills-registry.json";
const rolesRelative = "governance/operational_journey_protocol_package/sdlc/roles-and-authority.yaml";
const impactSchemaRelative = "governance/operational_journey_protocol_package/sdlc/change-impact.schema.json";
const artifactSchemaRelative = "governance/operational_journey_protocol_package/sdlc/artifact-manifest.schema.json";
const authorityDocRelative = "governance/26_SDLC_TEAM_AND_STAGE_GATES.md";

const decisions = readJson(decisionRelative);
const agents = readJson(agentRelative);
const skills = readJson(skillRelative);
const roles = readText(rolesRelative);
const impactSchema = readText(impactSchemaRelative);
const artifactSchema = readText(artifactSchemaRelative);
const authorityDoc = readText(authorityDocRelative);

if (decisions) {
  if (decisions.schemaVersion !== 3) violations.push({ file: decisionRelative, message: "DECISION_VOCABULARY_VERSION_MUST_BE_3" });
  const scopes = new Set(decisions.closureRules?.conditionalRequiredScopes ?? []);
  for (const scope of ["finance", "isolation"]) if (!scopes.has(scope)) violations.push({ file: decisionRelative, message: `CLOSURE_SCOPE_MISSING ${scope}` });
}

if (agents) {
  if (agents.schemaVersion !== 3) violations.push({ file: agentRelative, message: "AGENT_REGISTRY_VERSION_MUST_BE_3" });
  const finance = (agents.entries ?? []).find((entry) => entry.id === "financial-control-authority");
  if (!finance) violations.push({ file: agentRelative, message: "FINANCIAL_CONTROL_AUTHORITY_MISSING" });
  else {
    if (!(finance.approval_domains ?? []).includes("finance_approval")) violations.push({ file: agentRelative, message: "FINANCIAL_CONTROL_APPROVAL_DOMAIN_MISSING" });
    if ((finance.allowed_modes ?? []).includes("write")) violations.push({ file: agentRelative, message: "FINANCIAL_CONTROL_AUTHORITY_MUST_NOT_WRITE" });
    if (finance.may_final_approve_own_work !== false) violations.push({ file: agentRelative, message: "FINANCIAL_CONTROL_SELF_APPROVAL_FORBIDDEN" });
    if (finance.primary_file !== ".agents/skills/bthwani-dsh-wlt-finance-boundary/SKILL.md") violations.push({ file: agentRelative, message: "FINANCIAL_CONTROL_PRIMARY_SKILL_DRIFT" });
  }
}

if (skills) {
  const financeSkill = (skills.entries ?? []).find((entry) => entry.id === "bthwani-dsh-wlt-finance-boundary");
  if (!financeSkill || financeSkill.contract_level !== "governed" || !["active", "conditional"].includes(financeSkill.status)) violations.push({ file: skillRelative, message: "FINANCIAL_BOUNDARY_SKILL_NOT_ACTIVE_GOVERNED" });
}

for (const marker of ["financial_control_authority:", "- finance_approval", "may_approve_finance: false"]) if (!roles.includes(marker)) violations.push({ file: rolesRelative, message: `FINANCIAL_ROLE_MARKER_MISSING ${marker}` });
for (const marker of ['"wltFinance"', '"tenant"', '"visual"', '"qa"', '"release"', '"production"']) if (!impactSchema.includes(marker)) violations.push({ file: impactSchemaRelative, message: `IMPACT_SCHEMA_MARKER_MISSING ${marker}` });
for (const marker of ['"applicableEvidenceScopes"', '"passedEvidenceScopes"', '"notApplicableStages"', '"stageExclusions"', '"finance"', '"isolation"']) if (!artifactSchema.includes(marker)) violations.push({ file: artifactSchemaRelative, message: `ARTIFACT_SCHEMA_MARKER_MISSING ${marker}` });
for (const marker of ["FINANCIAL_CONTROL_AUTHORITY", "finance", "isolation", "notApplicableStages", "stageExclusions"]) if (!authorityDoc.includes(marker)) violations.push({ file: authorityDocRelative, message: `SDLC_AUTHORITY_MARKER_MISSING ${marker}` });

fail(guardId, violations);
