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

const authority = validateDocument(
  "governance/authority/authority-precedence.json",
  "governance/authority/authority-precedence.schema.json",
  "AUTHORITY",
);
const decisions = validateDocument(
  "governance/contracts/decision-vocabulary.json",
  "governance/contracts/decision-vocabulary.schema.json",
  "DECISION",
);
const agents = validateDocument(
  "governance/agents/agent-registry.json",
  "governance/agents/agent-schema.json",
  "AGENT",
);
const skills = validateDocument(
  "governance/skills/skills-registry.json",
  "governance/skills/skills-schema.json",
  "SKILL",
);
const guards = validateDocument(
  "governance/guards/guard-registry.json",
  "governance/guards/guard-schema.json",
  "GUARD",
);
const guardAssurance = validateDocument(
  "governance/guards/guard-assurance.json",
  "governance/guards/guard-assurance.schema.json",
  "GUARD_ASSURANCE",
);
const frontendBindings = validateDocument(
  "governance/guards/frontend-binding-registry.json",
  "governance/guards/frontend-binding-registry.schema.json",
  "FRONTEND_BINDING",
);
const repositoryEnforcement = validateDocument(
  "governance/github/repository-enforcement.json",
  "governance/github/repository-enforcement.schema.json",
  "GITHUB_ENFORCEMENT",
);

const productSchemaRelative = "governance/product/product-truth.schema.json";
const productValidator = compileSchema(productSchemaRelative);
const productContractsDir = path.join(repoRoot, "governance/product/contracts");
if (!fs.existsSync(productContractsDir)) {
  violations.push({ file: "governance/product/contracts", line: 0, message: "MISSING_PRODUCT_TRUTH_CONTRACTS_DIRECTORY" });
} else if (productValidator) {
  const contractFiles = fs.readdirSync(productContractsDir)
    .filter((name) => name.endsWith(".product-truth.json"))
    .sort();
  if (!contractFiles.includes("TEMPLATE.product-truth.json")) {
    violations.push({ file: "governance/product/contracts", line: 0, message: "MISSING_PRODUCT_TRUTH_TEMPLATE" });
  }
  const capabilityIds = new Set();
  for (const fileName of contractFiles) {
    const relative = `governance/product/contracts/${fileName}`;
    const contract = readJson(relative, "PRODUCT_TRUTH_CONTRACT");
    if (!contract) continue;
    if (!productValidator(contract)) {
      for (const error of productValidator.errors ?? []) {
        violations.push({ file: relative, line: 0, message: `PRODUCT_TRUTH_SCHEMA_VIOLATION ${error.instancePath || "/"} ${error.message}` });
      }
      continue;
    }
    if (capabilityIds.has(contract.capabilityId)) {
      violations.push({ file: relative, line: 0, message: `DUPLICATE_PRODUCT_CAPABILITY_ID ${contract.capabilityId}` });
    }
    capabilityIds.add(contract.capabilityId);
    if (contract.owners.productManager === contract.owners.productOwner) {
      violations.push({ file: relative, line: 0, message: "PRODUCT_MANAGER_AND_PRODUCT_OWNER_MUST_BE_SEPARATE" });
    }

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
      for (const actorId of surface.actors) {
        if (!actorIds.has(actorId)) violations.push({ file: relative, line: 0, message: `SURFACE_REFERENCES_UNKNOWN_ACTOR ${surface.id} -> ${actorId}` });
      }
      if (surface.required && ["app-client", "app-partner", "app-captain", "app-field", "control-panel"].includes(surface.id) && !surface.routesOrScreens?.length) {
        violations.push({ file: relative, line: 0, message: `REQUIRED_UI_SURFACE_HAS_NO_ROUTE_OR_SCREEN ${surface.id}` });
      }
      if (surface.required && surface.id === "backend" && !surface.operationIds?.length) {
        violations.push({ file: relative, line: 0, message: "REQUIRED_BACKEND_SURFACE_HAS_NO_OPERATION_ID" });
      }
    }
  }
}

if (authority) {
  const ranks = new Set();
  const precedenceIds = new Set();
  const rankById = new Map();
  for (const entry of authority.precedence) {
    if (ranks.has(entry.rank)) violations.push({ file: "governance/authority/authority-precedence.json", line: 0, message: `DUPLICATE_AUTHORITY_RANK ${entry.rank}` });
    if (precedenceIds.has(entry.id)) violations.push({ file: "governance/authority/authority-precedence.json", line: 0, message: `DUPLICATE_PRECEDENCE_ID ${entry.id}` });
    ranks.add(entry.rank);
    precedenceIds.add(entry.id);
    rankById.set(entry.id, entry.rank);
  }

  const documentPaths = new Set();
  const roots = [];
  for (const document of authority.documents) {
    if (documentPaths.has(document.path)) violations.push({ file: "governance/authority/authority-precedence.json", line: 0, message: `DUPLICATE_AUTHORITY_DOCUMENT ${document.path}` });
    documentPaths.add(document.path);
    if (!precedenceIds.has(document.precedenceId)) violations.push({ file: "governance/authority/authority-precedence.json", line: 0, message: `UNKNOWN_PRECEDENCE_ID ${document.precedenceId}` });
    if (document.classification === "ROOT_AUTHORITY") roots.push(document.path);
    if (["ROOT_AUTHORITY", "ACTIVE_CANONICAL", "CONDITIONAL_CANONICAL", "ADAPTER"].includes(document.classification) && !fs.existsSync(path.join(repoRoot, document.path))) {
      violations.push({ file: document.path, line: 0, message: "REGISTERED_AUTHORITY_PATH_MISSING" });
    }
  }
  if (roots.length !== 1 || roots[0] !== authority.rootAuthority) {
    violations.push({ file: "governance/authority/authority-precedence.json", line: 0, message: `ROOT_AUTHORITY_MISMATCH ${JSON.stringify(roots)}` });
  }

  const activeRanks = authority.documents
    .filter((document) => ["ROOT_AUTHORITY", "ACTIVE_CANONICAL", "CONDITIONAL_CANONICAL"].includes(document.classification))
    .map((document) => rankById.get(document.precedenceId));
  const lowerRanks = authority.documents
    .filter((document) => ["DERIVED_SUPPORT", "HISTORICAL_REFERENCE"].includes(document.classification))
    .map((document) => rankById.get(document.precedenceId));
  if (activeRanks.length && lowerRanks.length && Math.min(...lowerRanks) <= Math.max(...activeRanks)) {
    violations.push({ file: "governance/authority/authority-precedence.json", line: 0, message: "DERIVED_OR_HISTORICAL_AUTHORITY_OUTRANKS_ACTIVE_AUTHORITY" });
  }

  const decisionIndex = fs.readFileSync(path.join(repoRoot, "governance/00_DECISION_INDEX.md"), "utf8");
  for (const marker of ["governance/authority/authority-precedence.json", "ACTIVE_CANONICAL", "DERIVED_SUPPORT", "HISTORICAL_REFERENCE"]) {
    if (!decisionIndex.includes(marker)) violations.push({ file: "governance/00_DECISION_INDEX.md", line: 0, message: `INDEX_MISSING_AUTHORITY_MARKER ${marker}` });
  }
}

if (decisions) {
  const canonicalIds = new Set();
  const canonicalClass = new Map();
  for (const decision of decisions.canonicalDecisions) {
    if (canonicalIds.has(decision.id)) violations.push({ file: "governance/contracts/decision-vocabulary.json", line: 0, message: `DUPLICATE_CANONICAL_DECISION ${decision.id}` });
    canonicalIds.add(decision.id);
    canonicalClass.set(decision.id, decision.class);
  }
  const aliases = new Set();
  for (const alias of decisions.aliases) {
    if (aliases.has(alias.alias) || canonicalIds.has(alias.alias)) violations.push({ file: "governance/contracts/decision-vocabulary.json", line: 0, message: `DUPLICATE_OR_SHADOWING_ALIAS ${alias.alias}` });
    aliases.add(alias.alias);
    if (!canonicalIds.has(alias.canonical)) violations.push({ file: "governance/contracts/decision-vocabulary.json", line: 0, message: `UNKNOWN_ALIAS_TARGET ${alias.alias} -> ${alias.canonical}` });
  }
  if (canonicalClass.get(decisions.closureRules.closedDecision) !== "closed") {
    violations.push({ file: "governance/contracts/decision-vocabulary.json", line: 0, message: "INVALID_CLOSED_DECISION" });
  }
}

if (guards && guardAssurance) {
  const registeredGuardIds = new Set(guards.entries.map((entry) => entry.id));
  const assuranceIds = new Set();
  for (const entry of guardAssurance.entries) {
    if (assuranceIds.has(entry.guardId)) {
      violations.push({ file: "governance/guards/guard-assurance.json", line: 0, message: `DUPLICATE_GUARD_ASSURANCE ${entry.guardId}` });
    }
    assuranceIds.add(entry.guardId);
    if (!registeredGuardIds.has(entry.guardId)) {
      violations.push({ file: "governance/guards/guard-assurance.json", line: 0, message: `ASSURANCE_REFERENCES_UNKNOWN_GUARD ${entry.guardId}` });
    }
    if (entry.closureEligible !== false) {
      violations.push({ file: "governance/guards/guard-assurance.json", line: 0, message: `SCOPE_GUARD_MUST_NOT_BE_CLOSURE_ELIGIBLE ${entry.guardId}` });
    }
  }
  for (const requiredId of [
    "governance-schema",
    "agent-governance",
    "guard-registry",
    "sdlc",
    "go-routes-ci",
    "frontend-feature-binding",
    "logic-coverage",
    "runtime-real-bindings",
    "live-cross-journey-integrity",
    "performance-budget",
    "a11y",
    "workflow-lint",
    "workflow-security",
  ]) {
    if (!assuranceIds.has(requiredId)) {
      violations.push({ file: "governance/guards/guard-assurance.json", line: 0, message: `REQUIRED_GUARD_ASSURANCE_MISSING ${requiredId}` });
    }
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
    if (JSON.stringify(actualOwners) !== JSON.stringify(declaredOwners)) {
      violations.push({ file: "governance/github/repository-enforcement.json", line: 0, message: `CODEOWNERS_EVIDENCE_DRIFT declared=${declaredOwners.join(",")} actual=${actualOwners.join(",")}` });
    }
    const actualMode = actualOwners.length > 1 ? "MULTI_OWNER_ROUTING" : "SINGLE_OWNER_ROUTING";
    if (repositoryEnforcement.observed.codeownersMode !== actualMode) {
      violations.push({ file: "governance/github/repository-enforcement.json", line: 0, message: `CODEOWNERS_MODE_DRIFT declared=${repositoryEnforcement.observed.codeownersMode} actual=${actualMode}` });
    }
  }

  const observed = repositoryEnforcement.observed;
  const claims = repositoryEnforcement.claims;
  const enforcementProven = observed.branchProtectionState === "PROVEN"
    && observed.requiredChecksState === "PROVEN"
    && observed.independentReviewerIdentityState === "PROVEN"
    && observed.codeownersMode === "MULTI_OWNER_ROUTING";
  if (claims.separationOfDutiesProven && observed.codeowners.length < 2) {
    violations.push({ file: "governance/github/repository-enforcement.json", line: 0, message: "SEPARATION_OF_DUTIES_CLAIM_WITH_SINGLE_OWNER" });
  }
  if (claims.highRiskClosureAllowed && !enforcementProven) {
    violations.push({ file: "governance/github/repository-enforcement.json", line: 0, message: "HIGH_RISK_CLOSURE_ALLOWED_WITHOUT_PROVEN_GITHUB_ENFORCEMENT" });
  }
  if (repositoryEnforcement.decision === "PASS" && !enforcementProven) {
    violations.push({ file: "governance/github/repository-enforcement.json", line: 0, message: "GITHUB_ENFORCEMENT_PASS_WITH_UNPROVEN_CONTROLS" });
  }
}

for (const [label, registry] of [["AGENT", agents], ["SKILL", skills], ["GUARD", guards], ["FRONTEND_BINDING", frontendBindings]]) {
  if (registry?.entries && new Set(registry.entries.map((entry) => entry.id)).size !== registry.entries.length) {
    violations.push({ file: `<${label.toLowerCase()}-registry>`, line: 0, message: `${label}_DUPLICATE_ID` });
  }
}

fail(guardId, violations);
