import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "governance-schema-gate";
const violations = [];
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function readJson(relativePath, kind = "JSON") {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    violations.push({ file: relativePath, line: 0, message: `MISSING_${kind}` });
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    violations.push({ file: relativePath, line: 0, message: `INVALID_JSON ${error.message}` });
    return undefined;
  }
}

function compileSchema(schemaRelative) {
  const schema = readJson(schemaRelative, "SCHEMA");
  if (!schema) return undefined;
  try {
    return ajv.compile(schema);
  } catch (error) {
    violations.push({ file: schemaRelative, line: 0, message: `SCHEMA_COMPILE_FAILURE ${error.message}` });
    return undefined;
  }
}

function validateDocument(documentRelative, schemaRelative, label) {
  const document = readJson(documentRelative, label);
  const validate = compileSchema(schemaRelative);
  if (!document || !validate) return undefined;
  if (!validate(document)) {
    for (const error of validate.errors ?? []) {
      violations.push({
        file: documentRelative,
        line: 0,
        message: `${label}_SCHEMA_VIOLATION ${error.instancePath || "/"} ${error.message} ${JSON.stringify(error.params)}`,
      });
    }
  }
  return document;
}

function markerForAuthorityPath(authorityPath) {
  const full = path.join(repoRoot, authorityPath);
  if (fs.existsSync(full) && fs.statSync(full).isDirectory()) return `${authorityPath}/**`;
  return authorityPath;
}

const authorityRelative = "governance/authority/authority-precedence.json";
const decisionRelative = "governance/contracts/decision-vocabulary.json";
const agentRelative = "governance/agents/agent-registry.json";
const skillRelative = "governance/skills/skills-registry.json";
const guardRelative = "governance/guards/guard-registry.json";
const assuranceRelative = "governance/guards/guard-assurance.json";
const bindingRelative = "governance/guards/frontend-binding-registry.json";
const enforcementRelative = "governance/github/repository-enforcement.json";
const saasRelative = "governance/saas/saas-governance.json";
const decisionIndexRelative = "governance/00_DECISION_INDEX.md";

const authority = validateDocument(authorityRelative, "governance/authority/authority-precedence.schema.json", "AUTHORITY");
const decisions = validateDocument(decisionRelative, "governance/contracts/decision-vocabulary.schema.json", "DECISION");
const agents = validateDocument(agentRelative, "governance/agents/agent-schema.json", "AGENT");
const skills = validateDocument(skillRelative, "governance/skills/skills-schema.json", "SKILL");
const guards = validateDocument(guardRelative, "governance/guards/guard-schema.json", "GUARD");
const guardAssurance = validateDocument(assuranceRelative, "governance/guards/guard-assurance.schema.json", "GUARD_ASSURANCE");
const frontendBindings = validateDocument(bindingRelative, "governance/guards/frontend-binding-registry.schema.json", "FRONTEND_BINDING");
const repositoryEnforcement = validateDocument(enforcementRelative, "governance/github/repository-enforcement.schema.json", "GITHUB_ENFORCEMENT");
const saasGovernance = validateDocument(saasRelative, "governance/saas/saas-governance.schema.json", "SAAS_GOVERNANCE");
readJson("tools/guards/guard-manifest.json", "GUARD_MANIFEST");

const productSchemaRelative = "governance/product/product-truth.schema.json";
const productValidator = compileSchema(productSchemaRelative);
const productContractsDir = path.join(repoRoot, "governance/product/contracts");
if (!fs.existsSync(productContractsDir)) {
  violations.push({ file: "governance/product/contracts", line: 0, message: "MISSING_PRODUCT_TRUTH_CONTRACTS_DIRECTORY" });
} else if (productValidator) {
  const contractFiles = fs.readdirSync(productContractsDir).filter((name) => name.endsWith(".product-truth.json")).sort();
  if (!contractFiles.includes("TEMPLATE.product-truth.json")) violations.push({ file: "governance/product/contracts", line: 0, message: "MISSING_PRODUCT_TRUTH_TEMPLATE" });
  const capabilityIds = new Set();
  for (const fileName of contractFiles) {
    const relative = `governance/product/contracts/${fileName}`;
    const contract = readJson(relative, "PRODUCT_TRUTH_CONTRACT");
    if (!contract) continue;
    if (!productValidator(contract)) {
      for (const error of productValidator.errors ?? []) violations.push({ file: relative, line: 0, message: `PRODUCT_TRUTH_SCHEMA_VIOLATION ${error.instancePath || "/"} ${error.message}` });
      continue;
    }
    if (capabilityIds.has(contract.capabilityId)) violations.push({ file: relative, line: 0, message: `DUPLICATE_PRODUCT_CAPABILITY_ID ${contract.capabilityId}` });
    capabilityIds.add(contract.capabilityId);
    if (contract.owners.productManager === contract.owners.productOwner) violations.push({ file: relative, line: 0, message: "PRODUCT_MANAGER_AND_PRODUCT_OWNER_MUST_BE_SEPARATE" });

    const actorIds = new Set();
    for (const actor of contract.actors) {
      if (actorIds.has(actor.id)) violations.push({ file: relative, line: 0, message: `DUPLICATE_PRODUCT_ACTOR ${actor.id}` });
      actorIds.add(actor.id);
      const overlap = actor.permittedActions.filter((action) => actor.forbiddenActions.includes(action));
      if (overlap.length) violations.push({ file: relative, line: 0, message: `ACTION_BOTH_PERMITTED_AND_FORBIDDEN ${actor.id}: ${overlap.join(", ")}` });
    }

    const surfaceIds = new Set();
    for (const surface of contract.surfaces) {
      if (surfaceIds.has(surface.id)) violations.push({ file: relative, line: 0, message: `DUPLICATE_PRODUCT_SURFACE ${surface.id}` });
      surfaceIds.add(surface.id);
      for (const actorId of surface.actors) if (!actorIds.has(actorId)) violations.push({ file: relative, line: 0, message: `SURFACE_REFERENCES_UNKNOWN_ACTOR ${surface.id} -> ${actorId}` });
      if (surface.required && ["app-client", "app-partner", "app-captain", "app-field", "control-panel"].includes(surface.id) && !surface.routesOrScreens?.length) violations.push({ file: relative, line: 0, message: `REQUIRED_UI_SURFACE_HAS_NO_ROUTE_OR_SCREEN ${surface.id}` });
      if (surface.required && surface.id === "backend" && !surface.operationIds?.length) violations.push({ file: relative, line: 0, message: "REQUIRED_BACKEND_SURFACE_HAS_NO_OPERATION_ID" });
    }
  }
}

if (authority) {
  const ranks = new Set();
  const precedenceIds = new Set();
  const rankById = new Map();
  for (const entry of authority.precedence) {
    if (ranks.has(entry.rank)) violations.push({ file: authorityRelative, line: 0, message: `DUPLICATE_AUTHORITY_RANK ${entry.rank}` });
    if (precedenceIds.has(entry.id)) violations.push({ file: authorityRelative, line: 0, message: `DUPLICATE_PRECEDENCE_ID ${entry.id}` });
    ranks.add(entry.rank);
    precedenceIds.add(entry.id);
    rankById.set(entry.id, entry.rank);
  }

  const documentPaths = new Set();
  const roots = [];
  const decisionIndexPath = path.join(repoRoot, decisionIndexRelative);
  const decisionIndex = fs.existsSync(decisionIndexPath) ? fs.readFileSync(decisionIndexPath, "utf8") : "";
  if (!decisionIndex) violations.push({ file: decisionIndexRelative, line: 0, message: "DECISION_INDEX_MISSING" });

  for (const document of authority.documents) {
    if (documentPaths.has(document.path)) violations.push({ file: authorityRelative, line: 0, message: `DUPLICATE_AUTHORITY_DOCUMENT ${document.path}` });
    documentPaths.add(document.path);
    if (!precedenceIds.has(document.precedenceId)) violations.push({ file: authorityRelative, line: 0, message: `UNKNOWN_PRECEDENCE_ID ${document.precedenceId}` });
    if (document.classification === "ROOT_AUTHORITY") roots.push(document.path);

    const registeredPath = path.join(repoRoot, document.path);
    if (!fs.existsSync(registeredPath)) violations.push({ file: document.path, line: 0, message: "REGISTERED_AUTHORITY_PATH_MISSING" });

    const marker = markerForAuthorityPath(document.path);
    if (decisionIndex && !decisionIndex.includes(document.path) && !decisionIndex.includes(marker)) violations.push({ file: decisionIndexRelative, line: 0, message: `INDEX_MISSING_REGISTERED_AUTHORITY ${document.path}` });

    if (document.classification === "ACTIVE_CANONICAL" && document.path.endsWith(".md") && document.path !== "AGENTS.md" && fs.existsSync(registeredPath)) {
      const content = fs.readFileSync(registeredPath, "utf8");
      if (!/^Status:\s*ACTIVE_CANONICAL\s*$/m.test(content)) violations.push({ file: document.path, line: 0, message: "ACTIVE_CANONICAL_STATUS_DRIFT" });
    }
  }

  if (roots.length !== 1 || roots[0] !== authority.rootAuthority) violations.push({ file: authorityRelative, line: 0, message: `ROOT_AUTHORITY_MISMATCH ${JSON.stringify(roots)}` });

  const activeRanks = authority.documents.filter((document) => ["ROOT_AUTHORITY", "ACTIVE_CANONICAL", "CONDITIONAL_CANONICAL"].includes(document.classification)).map((document) => rankById.get(document.precedenceId));
  const lowerRanks = authority.documents.filter((document) => ["DERIVED_SUPPORT", "HISTORICAL_REFERENCE"].includes(document.classification)).map((document) => rankById.get(document.precedenceId));
  if (activeRanks.length && lowerRanks.length && Math.min(...lowerRanks) <= Math.max(...activeRanks)) violations.push({ file: authorityRelative, line: 0, message: "DERIVED_OR_HISTORICAL_AUTHORITY_OUTRANKS_ACTIVE_AUTHORITY" });

  for (const requiredPath of [
    "governance/contracts",
    "governance/agents",
    "governance/skills",
    "governance/guards",
    "governance/product/product-truth.schema.json",
    "governance/saas",
    "tools/guards/guard-manifest.json",
  ]) {
    if (!documentPaths.has(requiredPath)) violations.push({ file: authorityRelative, line: 0, message: `MACHINE_AUTHORITY_NOT_REGISTERED ${requiredPath}` });
  }
}

if (decisions) {
  const canonicalIds = new Set();
  const canonicalClass = new Map();
  const decisionById = new Map();
  for (const decision of decisions.canonicalDecisions) {
    if (canonicalIds.has(decision.id)) violations.push({ file: decisionRelative, line: 0, message: `DUPLICATE_CANONICAL_DECISION ${decision.id}` });
    canonicalIds.add(decision.id);
    canonicalClass.set(decision.id, decision.class);
    decisionById.set(decision.id, decision);
  }

  const aliases = new Set();
  for (const alias of decisions.aliases) {
    if (aliases.has(alias.alias) || canonicalIds.has(alias.alias)) violations.push({ file: decisionRelative, line: 0, message: `DUPLICATE_OR_SHADOWING_ALIAS ${alias.alias}` });
    aliases.add(alias.alias);
    if (!canonicalIds.has(alias.canonical)) violations.push({ file: decisionRelative, line: 0, message: `UNKNOWN_ALIAS_TARGET ${alias.alias} -> ${alias.canonical}` });
  }

  const closedId = decisions.closureRules.closedDecision;
  if (canonicalClass.get(closedId) !== "closed") violations.push({ file: decisionRelative, line: 0, message: "INVALID_CLOSED_DECISION" });
  if (decisions.closureRules.scopePolicy !== "ALL_APPLICABLE") violations.push({ file: decisionRelative, line: 0, message: "CLOSURE_MUST_REQUIRE_ALL_APPLICABLE_SCOPES" });
  if (decisionById.get(closedId)?.scopePolicy !== "ALL_APPLICABLE") violations.push({ file: decisionRelative, line: 0, message: "CLOSED_DECISION_SCOPE_POLICY_DRIFT" });

  const baseScopes = new Set(decisions.closureRules.baseRequiredScopes ?? []);
  if (!baseScopes.has("static")) violations.push({ file: decisionRelative, line: 0, message: "CLOSURE_BASE_STATIC_SCOPE_MISSING" });
  const conditionalScopes = new Set(decisions.closureRules.conditionalRequiredScopes ?? []);
  for (const scope of ["product", "runtime", "visual", "qa", "security", "finance", "isolation", "governance", "ci", "release", "production"]) {
    if (!conditionalScopes.has(scope)) violations.push({ file: decisionRelative, line: 0, message: `CLOSURE_CONDITIONAL_SCOPE_MISSING ${scope}` });
  }
  for (const classId of ["fail", "blocked", "pending"]) if (!(decisions.closureRules.forbiddenOpenClasses ?? []).includes(classId)) violations.push({ file: decisionRelative, line: 0, message: `CLOSURE_FORBIDDEN_OPEN_CLASS_MISSING ${classId}` });
}

if (saasGovernance && decisions) {
  const canonicalIds = new Set(decisions.canonicalDecisions.map((entry) => entry.id));
  if (!canonicalIds.has(saasGovernance.canonicalDecision)) violations.push({ file: saasRelative, line: 0, message: `SAAS_DECISION_NOT_CANONICAL ${saasGovernance.canonicalDecision}` });
  if (saasGovernance.commercialActivationState === "BLOCKED_BY_POLICY" && ["PASS", "CLOSED_WITH_EVIDENCE"].includes(saasGovernance.canonicalDecision)) violations.push({ file: saasRelative, line: 0, message: "SAAS_BLOCKED_STATE_CANNOT_PASS_OR_CLOSE" });
}

if (guards && guardAssurance) {
  const registeredGuardIds = new Set(guards.entries.map((entry) => entry.id));
  const assuranceIds = new Set();
  for (const entry of guardAssurance.entries) {
    if (assuranceIds.has(entry.guardId)) violations.push({ file: assuranceRelative, line: 0, message: `DUPLICATE_GUARD_ASSURANCE ${entry.guardId}` });
    assuranceIds.add(entry.guardId);
    if (!registeredGuardIds.has(entry.guardId)) violations.push({ file: assuranceRelative, line: 0, message: `ASSURANCE_REFERENCES_UNKNOWN_GUARD ${entry.guardId}` });
    if (entry.closureEligible !== false) violations.push({ file: assuranceRelative, line: 0, message: `SCOPE_GUARD_MUST_NOT_BE_CLOSURE_ELIGIBLE ${entry.guardId}` });
  }
  for (const requiredId of [
    "governance-schema", "agent-governance", "authority-separation", "saas-governance", "guard-registry", "sdlc", "go-routes-ci",
    "frontend-feature-binding", "logic-coverage", "runtime-real-bindings", "live-cross-journey-integrity",
    "performance-budget", "a11y", "a11y-runtime", "workflow-lint", "workflow-security", "actions-pin",
  ]) {
    if (!assuranceIds.has(requiredId)) violations.push({ file: assuranceRelative, line: 0, message: `REQUIRED_GUARD_ASSURANCE_MISSING ${requiredId}` });
  }
}

if (repositoryEnforcement) {
  const codeownersRelative = ".github/CODEOWNERS";
  const codeownersPath = path.join(repoRoot, codeownersRelative);
  if (!fs.existsSync(codeownersPath)) {
    violations.push({ file: codeownersRelative, line: 0, message: "CODEOWNERS_FILE_MISSING" });
  } else {
    const codeowners = fs.readFileSync(codeownersPath, "utf8");
    const actualOwners = [...new Set([...codeowners.matchAll(/@([A-Za-z0-9-]+)/g)].map((match) => match[1]))].sort();
    const declaredOwners = [...repositoryEnforcement.observed.codeowners].sort();
    if (JSON.stringify(actualOwners) !== JSON.stringify(declaredOwners)) violations.push({ file: enforcementRelative, line: 0, message: `CODEOWNERS_EVIDENCE_DRIFT declared=${declaredOwners.join(",")} actual=${actualOwners.join(",")}` });
    const actualMode = actualOwners.length > 1 ? "MULTI_OWNER_ROUTING" : "SINGLE_OWNER_ROUTING";
    if (repositoryEnforcement.observed.codeownersMode !== actualMode) violations.push({ file: enforcementRelative, line: 0, message: `CODEOWNERS_MODE_DRIFT declared=${repositoryEnforcement.observed.codeownersMode} actual=${actualMode}` });
  }

  const observed = repositoryEnforcement.observed;
  const claims = repositoryEnforcement.claims;
  const independentlyProven = observed.independentReviewerIdentityState === "PROVEN" && observed.codeownersMode === "MULTI_OWNER_ROUTING";
  if (claims.separationOfDutiesProven !== independentlyProven) violations.push({ file: enforcementRelative, line: 0, message: "SEPARATION_OF_DUTIES_CLAIM_DOES_NOT_MATCH_EVIDENCE" });
  const sameCommitCiProven = observed.sameCommitWorkflowRunsState === "PROVEN_PASS";
  if (claims.sameCommitCiProven !== sameCommitCiProven) violations.push({ file: enforcementRelative, line: 0, message: "SAME_COMMIT_CI_CLAIM_DOES_NOT_MATCH_EVIDENCE" });
  const highRiskAllowed = independentlyProven && sameCommitCiProven && observed.branchProtectionState === "PROVEN" && observed.requiredChecksState === "PROVEN";
  if (claims.highRiskClosureAllowed !== highRiskAllowed) violations.push({ file: enforcementRelative, line: 0, message: "HIGH_RISK_CLOSURE_CLAIM_DOES_NOT_MATCH_EVIDENCE" });
  if (!claims.separationOfDutiesProven && repositoryEnforcement.decision === "CLOSED_WITH_EVIDENCE") violations.push({ file: enforcementRelative, line: 0, message: "CLOSURE_FORBIDDEN_WITHOUT_GITHUB_DUTY_SEPARATION" });
  if (!claims.sameCommitCiProven && repositoryEnforcement.decision === "PASS") violations.push({ file: enforcementRelative, line: 0, message: "PASS_FORBIDDEN_WITHOUT_SAME_COMMIT_CI" });
}

for (const [label, registry] of [["AGENT", agents], ["SKILL", skills], ["GUARD", guards], ["FRONTEND_BINDING", frontendBindings]]) {
  if (registry?.entries && new Set(registry.entries.map((entry) => entry.id)).size !== registry.entries.length) violations.push({ file: `<${label.toLowerCase()}-registry>`, line: 0, message: `${label}_DUPLICATE_ID` });
}

fail(guardId, violations);
