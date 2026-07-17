import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "saas-governance-gate";
const violations = [];

function readJson(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    violations.push({ file: relativePath, line: 0, message: "MISSING_REQUIRED_FILE" });
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    violations.push({ file: relativePath, line: 0, message: `INVALID_JSON ${error.message}` });
    return undefined;
  }
}

function readText(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    violations.push({ file: relativePath, line: 0, message: "MISSING_REQUIRED_FILE" });
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

const statePath = "governance/saas/saas-governance.json";
const schemaPath = "governance/saas/saas-governance.schema.json";
const annexPath = "governance/operational_journey_protocol_package/annexes/SAAS_READINESS_AND_TENANCY_GATES.md";
const authorityPath = "governance/authority/authority-precedence.json";
const decisionsPath = "governance/contracts/decision-vocabulary.json";
const finalJudgePath = ".agents/skills/bthwani-final-journey-closure-judge/SKILL.md";

const state = readJson(statePath);
const schema = readJson(schemaPath);
const authority = readJson(authorityPath);
const decisions = readJson(decisionsPath);
const annex = readText(annexPath);
const finalJudge = readText(finalJudgePath);

if (state && schema) {
  try {
    const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
    if (!validate(state)) {
      for (const error of validate.errors ?? []) violations.push({ file: statePath, line: 0, message: `SAAS_SCHEMA_VIOLATION ${error.instancePath || "/"} ${error.message}` });
    }
  } catch (error) {
    violations.push({ file: schemaPath, line: 0, message: `SAAS_SCHEMA_COMPILE_FAILURE ${error.message}` });
  }
}

const canonicalDecisions = new Set((decisions?.canonicalDecisions ?? []).map((entry) => entry.id));
if (state && !canonicalDecisions.has(state.canonicalDecision)) violations.push({ file: statePath, line: 0, message: `NONCANONICAL_SAAS_DECISION ${state.canonicalDecision}` });

if (state?.commercialActivationState === "BLOCKED_BY_POLICY") {
  if (state.saasReadinessMode === "SAAS_ACTIVE") violations.push({ file: statePath, line: 0, message: "SAAS_ACTIVE_WHILE_COMMERCIAL_ACTIVATION_BLOCKED" });
  if (state.canonicalDecision === "PASS" || state.canonicalDecision === "CLOSED_WITH_EVIDENCE") violations.push({ file: statePath, line: 0, message: "SAAS_ACTIVATION_CLAIM_WITHOUT_ACTIVATION_PERMISSION" });
}

if (state?.commercialActivationState === "ACTIVE") {
  const unresolved = Object.entries(state.activationEvidence ?? {}).filter(([, value]) => value !== "PROVEN");
  for (const [key, value] of unresolved) violations.push({ file: statePath, line: 0, message: `ACTIVE_SAAS_WITH_UNPROVEN_EVIDENCE ${key}=${value}` });
}

const registered = (authority?.documents ?? []).some((entry) => entry.path === "governance/saas" && entry.classification === "ACTIVE_CANONICAL" && entry.precedenceId === "MACHINE_READABLE_CONTRACT");
if (!registered) violations.push({ file: authorityPath, line: 0, message: "SAAS_MACHINE_GOVERNANCE_NOT_REGISTERED" });

for (const marker of [statePath, schemaPath, decisionsPath]) {
  if (!annex.includes(marker)) violations.push({ file: annexPath, line: 0, message: `SAAS_ANNEX_MISSING_REFERENCE ${marker}` });
}

for (const forbiddenDecision of ["SAAS_ACTIVATION_APPROVED", "HARD_BLOCKED_EXTERNAL_ONLY"]) {
  if (annex.includes(forbiddenDecision)) violations.push({ file: annexPath, line: 0, message: `NONCANONICAL_SAAS_DECISION_TOKEN ${forbiddenDecision}` });
}

for (const requiredScope of ["finance", "isolation", "security", "governance", "ci", "release", "production"]) {
  if (!finalJudge.includes(`\`${requiredScope}\``)) violations.push({ file: finalJudgePath, line: 0, message: `FINAL_JUDGE_MISSING_SAAS_RELEVANT_SCOPE ${requiredScope}` });
}

const deferred = new Set(state?.deferredCommercialFeatures ?? []);
for (const requiredFeature of [
  "commercial subscription billing",
  "self-service tenant signup",
  "white-label customization",
  "custom domains",
  "complex usage metering",
  "database per tenant",
]) {
  if (!deferred.has(requiredFeature)) violations.push({ file: statePath, line: 0, message: `DEFERRED_COMMERCIAL_FEATURE_MISSING ${requiredFeature}` });
}

fail(guardId, violations);
