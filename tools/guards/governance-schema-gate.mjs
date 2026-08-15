import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "governance-schema-gate";
const violations = [];
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const absolute = (relative) => path.join(repoRoot, relative);
const exists = (relative) => fs.existsSync(absolute(relative));
const readText = (relative) => (exists(relative) ? fs.readFileSync(absolute(relative), "utf8") : "");

function readJson(relative, label = "JSON") {
  if (!exists(relative)) {
    violations.push({ file: relative, line: 0, message: `MISSING_${label}` });
    return null;
  }
  try {
    return JSON.parse(readText(relative));
  } catch (error) {
    violations.push({ file: relative, line: 0, message: `INVALID_JSON ${error.message}` });
    return null;
  }
}

function compileSchema(relative) {
  const schema = readJson(relative, "SCHEMA");
  if (!schema) return null;
  try {
    return ajv.compile(schema);
  } catch (error) {
    violations.push({ file: relative, line: 0, message: `SCHEMA_COMPILE_FAILURE ${error.message}` });
    return null;
  }
}

function validateDocument(documentPath, schemaPath, label) {
  const document = readJson(documentPath, label);
  const validate = compileSchema(schemaPath);
  if (!document || !validate) return document;
  if (!validate(document)) {
    for (const error of validate.errors ?? []) {
      violations.push({
        file: documentPath,
        line: 0,
        message: `${label}_SCHEMA_VIOLATION ${error.instancePath || "/"} ${error.message}`,
      });
    }
  }
  return document;
}

function listFiles(relativeRoot) {
  if (!exists(relativeRoot)) return [];
  const files = [];
  const walk = (directory, relative) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const nextAbsolute = path.join(directory, entry.name);
      const nextRelative = path.posix.join(relative.replaceAll("\\", "/"), entry.name);
      if (entry.isDirectory()) walk(nextAbsolute, nextRelative);
      else files.push(nextRelative);
    }
  };
  walk(absolute(relativeRoot), relativeRoot);
  return files.sort();
}

function requireExactDirectory(relative, allowedFiles = [], allowedDirs = []) {
  if (!exists(relative)) {
    violations.push({ file: relative, line: 0, message: "MISSING_REQUIRED_DIRECTORY" });
    return;
  }
  const files = new Set(allowedFiles);
  const dirs = new Set(allowedDirs);
  for (const entry of fs.readdirSync(absolute(relative), { withFileTypes: true })) {
    const child = `${relative}/${entry.name}`;
    if (entry.isDirectory() && !dirs.has(entry.name)) {
      violations.push({ file: child, line: 0, message: `UNCLASSIFIED_DIRECTORY ${entry.name}` });
    } else if (entry.isFile() && !files.has(entry.name)) {
      violations.push({ file: child, line: 0, message: `UNCLASSIFIED_FILE ${entry.name}` });
    }
  }
}

function registeredToolPolicyFiles(registryPath, registry) {
  const allowed = new Set(["README.md"]);
  if (registry && !Array.isArray(registry.entries)) {
    violations.push({ file: registryPath, line: 0, message: "AGENT_TOOL_REGISTRY_ENTRIES_REQUIRED" });
    return [...allowed];
  }
  for (const tool of registry?.entries ?? []) {
    const id = String(tool?.id ?? "<unknown>");
    const policyPath = String(tool?.policy_path ?? "").replaceAll("\\", "/");
    if (path.posix.dirname(policyPath) !== ".agents/tools" || path.posix.extname(policyPath) !== ".md") {
      violations.push({ file: registryPath, line: 0, message: `TOOL_POLICY_PATH_INVALID ${id}:${policyPath || "<missing>"}` });
      continue;
    }
    if (!exists(policyPath)) {
      violations.push({ file: registryPath, line: 0, message: `REGISTERED_TOOL_POLICY_MISSING ${id}:${policyPath}` });
      continue;
    }
    allowed.add(path.posix.basename(policyPath));
  }
  return [...allowed].sort();
}

const authorityPath = "governance/authority/authority-precedence.json";
const decisionPath = "governance/contracts/decision-vocabulary.json";
const agentPath = "governance/agents/agent-registry.json";
const skillPath = "governance/skills/skills-registry.json";
const guardPath = "governance/guards/guard-registry.json";
const assurancePath = "governance/guards/guard-assurance.json";
const guardSetsPath = "governance/guards/guard-sets.json";
const bindingPath = "governance/guards/frontend-binding-registry.json";
const workflowPath = "governance/github/workflow-registry.json";
const singleOwnerPath = "governance/authority/single-owner-mode.json";
const agentToolRegistryPath = "governance/tools/agent-tool-registry.json";
const sdlcRoot = "governance/contracts/sdlc";

const authority = validateDocument(authorityPath, "governance/authority/authority-precedence.schema.json", "AUTHORITY");
const decisions = validateDocument(decisionPath, "governance/contracts/decision-vocabulary.schema.json", "DECISION");
const agents = validateDocument(agentPath, "governance/agents/agent-schema.json", "AGENT");
const skills = validateDocument(skillPath, "governance/skills/skills-schema.json", "SKILL");
const guards = validateDocument(guardPath, "governance/guards/guard-schema.json", "GUARD");
const assurance = validateDocument(assurancePath, "governance/guards/guard-assurance.schema.json", "GUARD_ASSURANCE");
const guardSets = validateDocument(guardSetsPath, "governance/guards/guard-sets.schema.json", "GUARD_SETS");
const bindings = validateDocument(bindingPath, "governance/guards/frontend-binding-registry.schema.json", "FRONTEND_BINDING");
validateDocument(workflowPath, "governance/github/workflow-registry.schema.json", "WORKFLOW_REGISTRY");
const singleOwner = validateDocument(singleOwnerPath, "governance/authority/single-owner-mode.schema.json", "SINGLE_OWNER_MODE");
const agentTools = readJson(agentToolRegistryPath, "AGENT_TOOL_REGISTRY");

requireExactDirectory("governance", ["GOVERNANCE.md"], ["agents", "authority", "contracts", "github", "guards", "policies", "product", "skills", "tools"]);
requireExactDirectory("governance/policies", ["engineering.md", "security.md", "delivery.md", "repository-retention-policy.json"]);
requireExactDirectory("governance/github", ["master-protection.ruleset.json", "workflow-registry.json", "workflow-registry.schema.json"]);
requireExactDirectory("governance/product", ["PRD.md", "platform-model.yaml", "product-truth.schema.json", "product-truth.compatibility.schema.json"], ["contracts"]);
requireExactDirectory("governance/tools", [path.posix.basename(agentToolRegistryPath)]);
requireExactDirectory(".agents", ["INDEX.md"], ["skills", "tools"]);
requireExactDirectory(".agents/tools", registeredToolPolicyFiles(agentToolRegistryPath, agentTools));
requireExactDirectory("tools/prompting", [
  "01-diagnose-plan-package.md",
  "02-execute-verify-close.md",
  "03-end-to-end-fail-closed.md",
  "04-journey-multisurface-operational-diagnosis.md",
  "BTHWANI_CHATGPT_GITHUB_EXECUTION_CARD_ONE_PAGE.md",
], ["bthwani-orchestrator"]);
requireExactDirectory("tools/prompting/bthwani-orchestrator", [
  "00-ORCHESTRATOR.md",
  "01-CORE-CONTRACT.md",
  "02-DISCOVERY-DIAGNOSIS.md",
  "03-DECISIONS-COVERAGE-ANTI-DRIFT.md",
  "04-PACKAGE-EXECUTION.md",
  "05-VERIFICATION-CLEANUP-CLOSURE.md",
  "06-CONCURRENCY-RESUME-RECOVERY.md",
], ["contracts", "source-map"]);
requireExactDirectory("tools/prompting/bthwani-orchestrator/contracts", [
  "DIAGNOSIS-OUTPUT-CONTRACT.md",
  "DECISION-OUTPUT-CONTRACT.md",
  "EXECUTION-PACKAGE-CONTRACT.md",
  "EVIDENCE-CONTRACT.md",
  "CLOSURE-CONTRACT.md",
]);
requireExactDirectory("tools/prompting/bthwani-orchestrator/source-map", ["SOURCE-RULE-TRACEABILITY.md"]);
requireExactDirectory("plans", [], ["diagnose-implementing", "smsm-dsh-wlt-journeys"]);
requireExactDirectory("plans/diagnose-implementing/_template", [
  "01-DIAGNOSIS.template.md",
  "02-EXECUTION.template.md",
  "03-VERIFICATION-CLOSURE.template.md",
]);

for (const required of [
  "governance/GOVERNANCE.md",
  "governance/product/PRD.md",
  "governance/policies/engineering.md",
  "governance/policies/security.md",
  "governance/policies/delivery.md",
]) {
  if (!/^Status:\s*ACTIVE_CANONICAL\s*$/m.test(readText(required))) {
    violations.push({ file: required, line: 0, message: "ACTIVE_CANONICAL_STATUS_REQUIRED" });
  }
}

for (const retired of [
  "governance/README.md",
  "governance/domains",
  "governance/product/decisions",
  "governance/policies/product.md",
  "governance/policies/contracts.md",
  "governance/policies/data.md",
  "governance/policies/runtime.md",
  "governance/policies/release.md",
  "governance/policies/governance.rego",
  "governance/github/repository-enforcement.json",
  "governance/github/repository-enforcement.schema.json",
  "governance/github/full-verification-policy.json",
  "governance/27_FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md",
  "governance/runbooks",
  "governance/prompting",
  "governance/partners",
  "governance/operational_journey_protocol_package",
  "tools/diagnose-implementing",
  "tools/plans",
  "tools/implementing",
  "tools/important-scripts",
  "tools/contracts",
  "tools/rules",
  ".agents/README.md",
  ".agents/AGENT_SYSTEM_UPDATE_POLICY.md",
  ".agents/AUTHORITY_BOUNDARY.md",
  ".agents/COMMAND_SAFETY_POLICY.md",
  ".agents/EVIDENCE_GATE_ROUTER.md",
  ".agents/GRAPHIFY.md",
  ".agents/PONYTAIL_RULE.md",
  ".agents/RESTORE_DECISION.md",
  ".agents/SKILL_CATALOG.md",
  ".agents/UPDATE_POLICY.md",
  ".agents/rules",
  ".agents/adapters",
  ".agents/hooks",
  "plans/diagnose-implementing/new-unit.mjs",
  "plans/diagnose-implementing/_template/START-HERE.template.md",
  "plans/diagnose-implementing/_template/MANIFEST.template.json",
  "plans/diagnose-implementing/_template/GLOBAL-DIAGNOSIS.template.md",
  "plans/diagnose-implementing/_template/COVERAGE.template.json",
  "plans/diagnose-implementing/_template/EXECUTION-ORDER.template.json",
  "plans/diagnose-implementing/_template/CLOSURE.template.md",
  "plans/diagnose-implementing/_template/unit",
]) {
  if (exists(retired)) violations.push({ file: retired, line: 0, message: "RETIRED_OR_PARALLEL_PATH_REINTRODUCED" });
}

for (const required of [
  "governance/contracts/full-verification-policy.json",
  "tools/guards/opa/governance.rego",
  "plans/diagnose-implementing/README.md",
  "plans/diagnose-implementing/new-package.mjs",
  "plans/diagnose-implementing/validate-package.mjs",
  "plans/diagnose-implementing/_template/01-DIAGNOSIS.template.md",
  "plans/diagnose-implementing/_template/02-EXECUTION.template.md",
  "plans/diagnose-implementing/_template/03-VERIFICATION-CLOSURE.template.md",
  "tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md",
  "tools/prompting/bthwani-orchestrator/source-map/SOURCE-RULE-TRACEABILITY.md",
  "plans/smsm-dsh-wlt-journeys/04-JOURNEY-REGISTRY.yaml",
  `${sdlcRoot}/README.md`,
  `${sdlcRoot}/lifecycle.state-machine.yaml`,
  `${sdlcRoot}/roles-and-authority.yaml`,
  `${sdlcRoot}/gate-catalog.yaml`,
  `${sdlcRoot}/artifact-manifest.schema.json`,
  `${sdlcRoot}/change-impact.schema.json`,
]) {
  if (!exists(required)) violations.push({ file: required, line: 0, message: "REQUIRED_GOVERNANCE_OR_PLAN_PATH_MISSING" });
}

const canonicalProductSchema = "governance/product/product-truth.schema.json";
const compatibilityProductSchema = "governance/product/product-truth.compatibility.schema.json";
const canonicalProductValidator = compileSchema(canonicalProductSchema);
const compatibilityProductValidator = compileSchema(compatibilityProductSchema);
const productContractsRoot = "governance/product/contracts";

if (!exists(productContractsRoot)) {
  violations.push({ file: productContractsRoot, line: 0, message: "MISSING_PRODUCT_TRUTH_CONTRACTS_DIRECTORY" });
} else if (canonicalProductValidator && compatibilityProductValidator) {
  const capabilityIds = new Set();
  const journeyIds = new Set();
  const files = fs.readdirSync(absolute(productContractsRoot)).filter((name) => name.endsWith(".product-truth.json")).sort();
  if (!files.includes("TEMPLATE.product-truth.json")) {
    violations.push({ file: productContractsRoot, line: 0, message: "MISSING_PRODUCT_TRUTH_TEMPLATE" });
  }
  for (const fileName of files) {
    const relative = `${productContractsRoot}/${fileName}`;
    const contract = readJson(relative, "PRODUCT_TRUTH_CONTRACT");
    if (!contract) continue;
    const canonical = contract.schemaVersion === 1;
    const validate = canonical ? canonicalProductValidator : compatibilityProductValidator;
    if (!validate(contract)) {
      for (const error of validate.errors ?? []) {
        violations.push({ file: relative, line: 0, message: `PRODUCT_TRUTH_SCHEMA_VIOLATION ${error.instancePath || "/"} ${error.message}` });
      }
      continue;
    }
    if (!canonical) {
      if (journeyIds.has(contract.journeyId)) violations.push({ file: relative, line: 0, message: `DUPLICATE_COMPATIBILITY_JOURNEY_ID ${contract.journeyId}` });
      journeyIds.add(contract.journeyId);
      continue;
    }
    if (capabilityIds.has(contract.capabilityId)) violations.push({ file: relative, line: 0, message: `DUPLICATE_PRODUCT_CAPABILITY_ID ${contract.capabilityId}` });
    capabilityIds.add(contract.capabilityId);
    if (contract.owners.productManager === contract.owners.productOwner) {
      violations.push({ file: relative, line: 0, message: "PRODUCT_MANAGER_AND_PRODUCT_OWNER_MUST_BE_SEPARATE" });
    }
    const actors = new Set();
    for (const actor of contract.actors) {
      if (actors.has(actor.id)) violations.push({ file: relative, line: 0, message: `DUPLICATE_PRODUCT_ACTOR ${actor.id}` });
      actors.add(actor.id);
      const overlap = actor.permittedActions.filter((action) => actor.forbiddenActions.includes(action));
      if (overlap.length) violations.push({ file: relative, line: 0, message: `ACTION_BOTH_PERMITTED_AND_FORBIDDEN ${actor.id}` });
    }
    const surfaces = new Set();
    for (const surface of contract.surfaces) {
      if (surfaces.has(surface.id)) violations.push({ file: relative, line: 0, message: `DUPLICATE_PRODUCT_SURFACE ${surface.id}` });
      surfaces.add(surface.id);
      for (const actorId of surface.actors) {
        if (!actors.has(actorId)) violations.push({ file: relative, line: 0, message: `SURFACE_REFERENCES_UNKNOWN_ACTOR ${surface.id}:${actorId}` });
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
    if (ranks.has(entry.rank)) violations.push({ file: authorityPath, line: 0, message: `DUPLICATE_AUTHORITY_RANK ${entry.rank}` });
    if (precedenceIds.has(entry.id)) violations.push({ file: authorityPath, line: 0, message: `DUPLICATE_PRECEDENCE_ID ${entry.id}` });
    ranks.add(entry.rank);
    precedenceIds.add(entry.id);
    rankById.set(entry.id, entry.rank);
  }

  const paths = new Set();
  const activePaths = new Set();
  const roots = [];
  const domainOwners = new Map();
  const index = readText("governance/GOVERNANCE.md");

  for (const document of authority.documents) {
    if (paths.has(document.path)) violations.push({ file: authorityPath, line: 0, message: `DUPLICATE_AUTHORITY_DOCUMENT ${document.path}` });
    paths.add(document.path);
    if (!precedenceIds.has(document.precedenceId)) violations.push({ file: authorityPath, line: 0, message: `UNKNOWN_PRECEDENCE_ID ${document.precedenceId}` });
    if (!exists(document.path)) violations.push({ file: document.path, line: 0, message: "REGISTERED_AUTHORITY_PATH_MISSING" });
    if (document.classification === "ROOT_AUTHORITY") roots.push(document.path);
    if (!index.includes(document.path) && !index.includes(`${document.path}/**`)) {
      violations.push({ file: "governance/GOVERNANCE.md", line: 0, message: `INDEX_MISSING_REGISTERED_AUTHORITY ${document.path}` });
    }
    if (document.path.startsWith("governance/") && ["DERIVED_SUPPORT", "HISTORICAL_REFERENCE"].includes(document.classification)) {
      violations.push({ file: document.path, line: 0, message: "DERIVED_OR_HISTORICAL_ARTIFACT_FORBIDDEN_INSIDE_GOVERNANCE" });
    }
    if (["ROOT_AUTHORITY", "ACTIVE_CANONICAL", "CONDITIONAL_CANONICAL"].includes(document.classification)) {
      activePaths.add(document.path);
      for (const domain of document.authorityDomains) {
        if (domainOwners.has(domain) && domainOwners.get(domain) !== document.path) {
          violations.push({ file: authorityPath, line: 0, message: `DUPLICATE_ACTIVE_AUTHORITY_DOMAIN ${domain}: ${domainOwners.get(domain)} <> ${document.path}` });
        } else {
          domainOwners.set(domain, document.path);
        }
      }
    }
    if (document.classification === "ACTIVE_CANONICAL" && document.path.endsWith(".md") && !/^Status:\s*ACTIVE_CANONICAL\s*$/m.test(readText(document.path))) {
      violations.push({ file: document.path, line: 0, message: "ACTIVE_CANONICAL_STATUS_DRIFT" });
    }
  }

  if (roots.length !== 1 || roots[0] !== authority.rootAuthority) {
    violations.push({ file: authorityPath, line: 0, message: `ROOT_AUTHORITY_MISMATCH ${JSON.stringify(roots)}` });
  }

  const activeRanks = authority.documents
    .filter((document) => ["ROOT_AUTHORITY", "ACTIVE_CANONICAL", "CONDITIONAL_CANONICAL"].includes(document.classification))
    .map((document) => rankById.get(document.precedenceId));
  const lowerRanks = authority.documents
    .filter((document) => ["DERIVED_SUPPORT", "HISTORICAL_REFERENCE"].includes(document.classification))
    .map((document) => rankById.get(document.precedenceId));
  if (activeRanks.length && lowerRanks.length && Math.min(...lowerRanks) <= Math.max(...activeRanks)) {
    violations.push({ file: authorityPath, line: 0, message: "DERIVED_OR_HISTORICAL_AUTHORITY_OUTRANKS_ACTIVE_AUTHORITY" });
  }

  for (const required of [
    "governance/GOVERNANCE.md",
    "governance/product/PRD.md",
    "governance/product/contracts",
    "governance/policies/engineering.md",
    "governance/policies/security.md",
    "governance/policies/delivery.md",
    "governance/contracts",
    "governance/agents",
    "governance/skills",
    "governance/guards",
    "governance/tools/agent-tool-registry.json",
    "governance/authority/authority-precedence.schema.json",
    singleOwnerPath,
    "governance/authority/single-owner-mode.schema.json",
    canonicalProductSchema,
    "governance/product/platform-model.yaml",
    workflowPath,
    "governance/github/master-protection.ruleset.json",
    "plans/diagnose-implementing",
    "plans/smsm-dsh-wlt-journeys",
  ]) {
    if (!paths.has(required)) violations.push({ file: authorityPath, line: 0, message: `REQUIRED_AUTHORITY_NOT_REGISTERED ${required}` });
  }

  const governanceAuthorityRoots = authority.documents
    .filter((document) => document.path.startsWith("governance/"))
    .map((document) => document.path);
  for (const relative of listFiles("governance")) {
    const covered = governanceAuthorityRoots.some((ownerPath) => relative === ownerPath || relative.startsWith(`${ownerPath}/`));
    if (!covered) violations.push({ file: relative, line: 0, message: "UNCLASSIFIED_GOVERNANCE_FILE" });
  }

  for (const relative of listFiles("governance").filter((file) => file.endsWith(".md"))) {
    if (/^Status:\s*ACTIVE_CANONICAL\s*$/m.test(readText(relative)) && !activePaths.has(relative)) {
      const coveredByCanonicalDirectory = authority.documents.some((document) =>
        ["ACTIVE_CANONICAL", "CONDITIONAL_CANONICAL"].includes(document.classification) &&
        relative.startsWith(`${document.path}/`),
      );
      if (!coveredByCanonicalDirectory) violations.push({ file: relative, line: 0, message: "UNREGISTERED_ACTIVE_CANONICAL_DOCUMENT" });
    }
  }
}

if (singleOwner) {
  const allowed = new Set(singleOwner.approvalPolicy.allowedDomains);
  const protectedDomains = new Set(singleOwner.approvalPolicy.protectedDomains);
  for (const domain of [
    "product_model_approval", "implementation_readiness", "product_acceptance", "ux_acceptance",
    "architecture_approval", "governance_contract_approval", "ci_workflow_approval", "implementation_review", "qa_approval",
  ]) if (!allowed.has(domain)) violations.push({ file: singleOwnerPath, line: 0, message: `SINGLE_OWNER_ALLOWED_DOMAIN_MISSING ${domain}` });

  for (const domain of [
    "authentication_authorization_sessions", "pii_privacy_secrets_credentials", "operator_context_isolation",
    "security_approval", "financial_control", "migrations_and_production_data", "critical_high_vulnerability_acceptance",
    "residual_risk_acceptance", "release_approval", "deployment", "production_verification", "final_closure",
  ]) if (!protectedDomains.has(domain)) violations.push({ file: singleOwnerPath, line: 0, message: `SINGLE_OWNER_PROTECTED_DOMAIN_MISSING ${domain}` });

  for (const domain of allowed) if (protectedDomains.has(domain)) {
    violations.push({ file: singleOwnerPath, line: 0, message: `SINGLE_OWNER_DOMAIN_BOTH_ALLOWED_AND_PROTECTED ${domain}` });
  }
  if (singleOwner.status === "ACTIVE" && singleOwner.authoritySource !== "CURRENT_USER_INSTRUCTION") {
    violations.push({ file: singleOwnerPath, line: 0, message: "ACTIVE_SINGLE_OWNER_MODE_REQUIRES_CURRENT_USER_INSTRUCTION" });
  }
}

if (decisions) {
  const ids = new Set();
  const classes = new Map();
  const byId = new Map();
  for (const decision of decisions.canonicalDecisions) {
    if (ids.has(decision.id)) violations.push({ file: decisionPath, line: 0, message: `DUPLICATE_CANONICAL_DECISION ${decision.id}` });
    ids.add(decision.id);
    classes.set(decision.id, decision.class);
    byId.set(decision.id, decision);
  }
  const aliases = new Set();
  for (const alias of decisions.aliases) {
    if (aliases.has(alias.alias) || ids.has(alias.alias)) violations.push({ file: decisionPath, line: 0, message: `DUPLICATE_OR_SHADOWING_ALIAS ${alias.alias}` });
    aliases.add(alias.alias);
    if (!ids.has(alias.canonical)) violations.push({ file: decisionPath, line: 0, message: `UNKNOWN_ALIAS_TARGET ${alias.alias}` });
  }
  const closed = decisions.closureRules.closedDecision;
  if (classes.get(closed) !== "closed" || decisions.closureRules.scopePolicy !== "ALL_APPLICABLE" || byId.get(closed)?.scopePolicy !== "ALL_APPLICABLE") {
    violations.push({ file: decisionPath, line: 0, message: "CLOSED_DECISION_POLICY_DRIFT" });
  }
  for (const scope of ["product", "runtime", "visual", "qa", "security", "finance", "isolation", "governance", "ci", "release", "production"]) {
    if (!(decisions.closureRules.conditionalRequiredScopes ?? []).includes(scope)) {
      violations.push({ file: decisionPath, line: 0, message: `CLOSURE_CONDITIONAL_SCOPE_MISSING ${scope}` });
    }
  }
  for (const decisionClass of ["fail", "blocked", "pending"]) {
    if (!(decisions.closureRules.forbiddenOpenClasses ?? []).includes(decisionClass)) {
      violations.push({ file: decisionPath, line: 0, message: `CLOSURE_FORBIDDEN_OPEN_CLASS_MISSING ${decisionClass}` });
    }
  }
}

if (guards && assurance && guardSets) {
  const registered = new Set(guards.entries.map((entry) => entry.id));
  const assured = new Set();
  for (const entry of assurance.entries) {
    if (assured.has(entry.guardId)) violations.push({ file: assurancePath, line: 0, message: `DUPLICATE_GUARD_ASSURANCE ${entry.guardId}` });
    assured.add(entry.guardId);
    if (!registered.has(entry.guardId)) violations.push({ file: assurancePath, line: 0, message: `ASSURANCE_REFERENCES_UNKNOWN_GUARD ${entry.guardId}` });
    if (entry.closureEligible !== false) violations.push({ file: assurancePath, line: 0, message: `GUARD_MUST_NOT_SELF_GRANT_CLOSURE ${entry.guardId}` });
  }
  const canonicalSet = new Set([...guardSets.guardSets.foundation, ...guardSets.guardSets.journey, ...guardSets.guardSets.governance]);
  for (const id of canonicalSet) {
    if (!registered.has(id)) violations.push({ file: guardSetsPath, line: 0, message: `GUARD_SET_REFERENCES_UNKNOWN_GUARD ${id}` });
    if (!assured.has(id)) violations.push({ file: assurancePath, line: 0, message: `CANONICAL_GUARD_ASSURANCE_MISSING ${id}` });
  }
}

for (const [label, registry] of [["AGENT", agents], ["SKILL", skills], ["GUARD", guards], ["FRONTEND_BINDING", bindings]]) {
  if (registry?.entries && new Set(registry.entries.map((entry) => entry.id)).size !== registry.entries.length) {
    violations.push({ file: `<${label.toLowerCase()}-registry>`, line: 0, message: `${label}_DUPLICATE_ID` });
  }
}

fail(guardId, violations);
