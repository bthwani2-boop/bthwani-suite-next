import { appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ZERO_SHA = /^0+$/u;
const normalizePath = (value) => String(value ?? "").trim().replaceAll("\\", "/").replace(/^\.\//u, "");
const sorted = (values) => [...new Set(values.map(normalizePath).filter(Boolean))].sort();
const hasPath = (files, predicate) => files.some(predicate);
const startsWithAny = (file, prefixes) => prefixes.some((prefix) => file.startsWith(prefix));
const isDependencyManifest = (file) => /(^|\/)(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|go\.mod|go\.sum|requirements[^/]*\.txt|poetry\.lock|Cargo\.lock)$/u.test(file);
const isDockerFile = (file) => file === ".dockerignore" || /(^|\/)(Dockerfile(?:\..*)?|[^/]*\.dockerfile)$/u.test(file);

// Risk classes map changed files to mandatory proof dimensions. They replace
// the historical "changed file category -> rough owner checks" selection with
// a Canonical matrix: Changed Files -> Owner -> Capability -> Journey ->
// Risk Class -> Mandatory Proofs. A risk class never widens owner routing;
// it only adds the proof dimensions the class's failure model requires.
const isAuthorizationPath = (file) =>
  /(^|\/)(rbac|authorization|permissions)(\/|$)/u.test(file) ||
  /operator[_-]?context/iu.test(file) ||
  file.startsWith("services/dsh/backend/internal/auth/");
const isIdempotencyPath = (file) =>
  /(^|\/)[^/]*(idempot|attempt|replay|mutation[_-]?receipt|outbox)[^/]*($|\/|\.)/iu.test(file);
const isOrderJourneyPath = (file) =>
  /^services\/dsh\/backend\/internal\/(orders|dispatch|partnerdelivery|pickup|incident|checkoutpaymentsaga)\//u.test(file) ||
  /cancellation/iu.test(file);
const isWltFinancialPath = (file) =>
  /^services\/wlt\/(backend|database|contracts)\//u.test(file);
const isIdentityPath = (file) =>
  file.startsWith("core/identity/");
const isSchemaRuntimePath = (file) =>
  /\/database\/(migrations|tests)\//u.test(file);
const isMigrationPath = (file) => /\/database\/migrations\//u.test(file);
const isWorkflowAuthorityPath = (file) => file.startsWith(".github/workflows/") || file.startsWith(".github/actions/");
const isRenderedWebExperiencePath = (file) =>
  file.startsWith("apps/control-panel/runtime/") ||
  /^services\/[^/]+\/frontend\/control-panel\//u.test(file) ||
  /^services\/[^/]+\/frontend\/shared\//u.test(file) ||
  file.startsWith("shared/ui-kit/");
const isMobileExperiencePath = (file) =>
  /^apps\/app-(?:client|partner|captain|field)\/runtime\//u.test(file) ||
  /^services\/[^/]+\/frontend\/shared\//u.test(file) ||
  file.startsWith("shared/ui-kit/");
const isMigrationAuthorityPath = (file) =>
  file === "infra/docker/scripts/schema-migration-runner.ps1" ||
  file === "tools/scripts/invoke-service-migrations.ps1" ||
  file === "tools/scripts/invoke-database-upgrade-truth.ps1" ||
  file === "tools/scripts/test-service-migration-runner.ps1" ||
  file === "tools/scripts/generate-migration-manifest.mjs" ||
  file === "tools/scripts/lib/migration-manifest-state.mjs" ||
  file === "tools/guards/migration-manifest-drift-gate.mjs" ||
  file === "tools/verification/migration-amendments.json";

export function resolveFullScope({ fullScope = process.env.CI_FULL_SCOPE, mode = process.env.CI_MODE } = {}) {
  return String(fullScope ?? "false").trim().toLowerCase() === "true" ||
    String(mode ?? "").trim().toLowerCase() === "full";
}


const BACKEND_CLAIM_KEYS = [
  ["dsh", "backend:dsh"],
  ["wlt", "backend:wlt"],
  ["identity", "backend:identity"],
  ["workforce", "backend:workforce"],
  ["platform", "backend:platform-control"],
  ["providers", "backend:providers"],
];

export function deriveRequiredClaims(classification) {
  const claims = [];
  if (classification.full_scope === true || classification.ci_control_plane === true) {
    claims.push(
      "control:assurance-authority-drift",
      "control:ci-source-immutability",
      "control:sonar-coverage-ownership",
    );
  }
  if (classification.full_scope === true || classification.database_changed === true) {
    claims.push("control:migration-manifest");
  }
  if (classification.diagnostics_required === true) claims.push("contracts:diagnostics");
  if (classification.verification_required === true) claims.push("node:verification");
  for (const [key, claimId] of BACKEND_CLAIM_KEYS) {
    if (classification[key] === true && classification.backend_required === true) claims.push(claimId);
  }
  if (classification.runtime_required === true) claims.push("runtime:verification");
  return [...new Set(claims)];
}

export function deriveClosureRequiredClaims(classification) {
  return [...new Set([
    "change:verification",
    "analysis:sonar",
    "analysis:codeql",
    "analysis:semgrep",
    "security:remote",
    "semantic:review",
    classification.rendered_web_required === true ? "experience:rendered-web-baseline" : "",
    classification.rendered_web_required === true ? "experience:rendered-web-attestation" : "",
    classification.mobile_evidence_required === true ? "experience:mobile-device" : "",
    classification.dependency_changed === true ? "dependency:review" : "",
    classification.dependency_changed === true ? "dependency:lockfile" : "",
    classification.infrastructure === true ? "docker:policy" : "",
  ].filter(Boolean))];
}

export function applyForcedVerification(classification, forcedClaims = []) {
  const next = {...classification};
  for (const claimId of [...new Set(forcedClaims.map((value) => String(value).trim()).filter(Boolean))]) {
    switch (claimId) {
      case "control:assurance-authority-drift":
      case "control:ci-source-immutability":
      case "control:sonar-coverage-ownership":
        next.ci_control_plane = true;
        break;
      case "control:migration-manifest":
        next.database_changed = true;
        break;
      case "contracts:diagnostics":
        next.contracts = true;
        next.diagnostics_required = true;
        break;
      case "node:verification":
        next.node = true;
        next.verification_required = true;
        break;
      case "backend:dsh":
        next.dsh = true;
        break;
      case "backend:wlt":
        next.wlt = true;
        break;
      case "backend:identity":
        next.identity = true;
        break;
      case "backend:workforce":
        next.workforce = true;
        break;
      case "backend:platform-control":
        next.platform = true;
        break;
      case "backend:providers":
        next.providers = true;
        break;
      case "runtime:verification":
        next.runtime_required = true;
        break;
      default:
        throw new Error(`UNKNOWN_FORCED_CI_CLAIM:${claimId}`);
    }
  }

  next.backend = ["dsh", "wlt", "identity", "workforce", "platform", "providers"].some((key) => next[key] === true);
  next.backend_required = next.backend;
  next.required_jobs = [
    next.diagnostics_required === true ? "diagnostics" : "",
    next.verification_required === true ? "node" : "",
    next.backend_required === true ? "backends" : "",
    next.runtime_required === true ? "runtime" : "",
  ].filter(Boolean);
  next.required_claims = deriveRequiredClaims(next);
  next.closure_required_claims = deriveClosureRequiredClaims(next);
  return next;
}

export function classifyFiles(inputFiles, options = {}) {
  const files = sorted(inputFiles);
  const fullScope = options.fullScope === true;

  const moduleChanged = (prefixes) => fullScope || hasPath(files, (file) => startsWithAny(file, prefixes));
  const riskClass = (predicate) => fullScope || hasPath(files, predicate);
  const frontend = fullScope || hasPath(files, (file) =>
    startsWithAny(file, ["apps/", "shared/"]) || /(^|\/)(services\/[^/]+\/frontend)\//u.test(file),
  );
  const contracts = fullScope || hasPath(files, (file) =>
    file.startsWith("contracts/") || file.endsWith(".openapi.yaml") || file.includes("/contracts/") || file.includes("/clients/generated/"),
  );
  // Migration-authority files govern every service's ledger truth, so they
  // route to the full backend matrix and its database verification.
  const migrationAuthority = fullScope || hasPath(files, isMigrationAuthorityPath);

  const databaseChanged = fullScope || migrationAuthority || hasPath(files, (file) => file.includes("/database/") || file.includes("/migrations/"));
  const infrastructure = fullScope || hasPath(files, (file) => file.startsWith("infra/") || isDockerFile(file));
  const ciControlPlane = fullScope || hasPath(files, (file) =>
    file === "sonar-project.properties" ||
    startsWithAny(file, [
      ".github/",
      ".agents/",
      ".opencodereview/",
      "tools/scripts/",
      "tools/guards/",
      "tools/mobile/",
      "tools/verification/",
      "tools/assurance/",
      "tools/prompting/",
      "governance/",
    ]),
  );
  const dependencyChanged = fullScope || hasPath(files, isDependencyManifest);
  const renderedWebRequired = fullScope || hasPath(files, isRenderedWebExperiencePath);
  const mobileEvidenceRequired = fullScope || hasPath(files, isMobileExperiencePath);

  const dsh = moduleChanged(["services/dsh/backend/", "services/dsh/database/"]) || migrationAuthority;
  const wlt = moduleChanged(["services/wlt/backend/", "services/wlt/database/"]) || migrationAuthority;
  const identity = moduleChanged(["core/identity/backend/", "core/identity/database/"]) || migrationAuthority;
  const workforce = moduleChanged(["core/workforce/backend/", "core/workforce/database/"]) || migrationAuthority;
  const platform = moduleChanged(["core/platform-control/backend/", "core/platform-control/database/"]) || migrationAuthority;
  const providers = moduleChanged(["core/providers/backend/", "core/providers/database/"]) || migrationAuthority;
  const backend = dsh || wlt || identity || workforce || platform || providers;

  const node = fullScope || frontend || contracts || ciControlPlane || dependencyChanged;

  // Mandatory-proof risk classes. Runtime is mandatory for every class whose
  // failure model is only falsifiable in a running system: authorization and
  // OperatorContext authority, idempotency/replay/concurrency, order journey
  // state machines, WLT wallet/commission/payout/refund truth, identity/RBAC, and
  // schema/migration changes that runtime consumes. Plain infrastructural changes
  // keep their existing runtime requirement.
  const authorization = riskClass(isAuthorizationPath);
  const idempotency = riskClass(isIdempotencyPath);
  const orderJourney = riskClass(isOrderJourneyPath);
  const wltFinancial = riskClass(isWltFinancialPath);
  const identityRbac = riskClass(isIdentityPath);
  const schemaRuntime = riskClass(isSchemaRuntimePath) || migrationAuthority;
  const runtimeRequired = fullScope || infrastructure || authorization || idempotency ||
    orderJourney || wltFinancial || identityRbac || schemaRuntime;
  const riskClasses = [
    authorization ? "authorization" : "",
    idempotency ? "idempotency" : "",
    orderJourney ? "order_journey" : "",
    wltFinancial ? "wlt_monetary" : "",
    identityRbac ? "identity_rbac" : "",
    schemaRuntime ? "schema_runtime" : "",
    infrastructure ? "infrastructure" : "",
  ].filter(Boolean);

  // Human review is a changed-candidate risk decision, not a verification-mode
  // side effect. Full-scope verification must therefore not manufacture a human
  // approval requirement for unrelated bytes. Keep this policy centralized here
  // so Final Closure consumes the same changed-file truth as every other caller.
  const humanReviewRequired = hasPath(files, (file) =>
    isAuthorizationPath(file) ||
    isWltFinancialPath(file) ||
    isIdentityPath(file) ||
    isMigrationPath(file) ||
    isMigrationAuthorityPath(file) ||
    isWorkflowAuthorityPath(file) ||
    /cancellation/iu.test(file),
  );

  const diagnosticsRequired = contracts;
  const verificationRequired = node;
  const backendRequired = backend;
  const sonarRequired = fullScope || frontend || contracts || backend || dependencyChanged || hasPath(files, (file) => file === "sonar-project.properties");
  const requiredJobs = [
    diagnosticsRequired ? "diagnostics" : "",
    verificationRequired ? "node" : "",
    backendRequired ? "backends" : "",
    runtimeRequired ? "runtime" : "",
  ].filter(Boolean);

  const classification = {
    changed_count: files.length,
    full_scope: fullScope,
    dependency_changed: dependencyChanged,
    rendered_web_required: renderedWebRequired,
    mobile_evidence_required: mobileEvidenceRequired,
    infrastructure,
    ci_control_plane: ciControlPlane,
    frontend,
    contracts,
    dsh,
    wlt,
    identity,
    workforce,
    platform,
    providers,
    backend,
    database_changed: databaseChanged,
    database: databaseChanged,
    backend_database_changed: databaseChanged,
    node,
    node_contracts: contracts,
    node_ci_control_plane: ciControlPlane,
    node_dependency_changed: dependencyChanged,
    node_platform: platform,
    migration_authority: migrationAuthority,
    risk_classes: riskClasses,
    human_review_required: humanReviewRequired,
    verification_required: verificationRequired,
    backend_required: backendRequired,
    diagnostics_required: diagnosticsRequired,
    runtime_required: runtimeRequired,
    sonar_required: sonarRequired,
    required_jobs: requiredJobs,
  };
  classification.required_claims = deriveRequiredClaims(classification);
  classification.closure_required_claims = deriveClosureRequiredClaims(classification);
  return classification;
}

function readChangedFiles(baseSha, headSha) {
  const validBase = baseSha && !ZERO_SHA.test(baseSha) && baseSha !== headSha;
  const args = validBase
    ? ["diff", "--name-only", "--diff-filter=ACMRDTUXB", baseSha, headSha, "--"]
    : ["show", "--pretty=format:", "--name-only", headSha, "--"];
  return execFileSync("git", args, { encoding: "utf8" }).split(/\r?\n/u).map(normalizePath).filter(Boolean);
}

function serialize(value) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.join(",");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value ?? "");
}

function writeOutputs(outputs) {
  if (!process.env.GITHUB_OUTPUT) return;
  appendFileSync(process.env.GITHUB_OUTPUT, `${Object.entries(outputs).map(([key, value]) => `${key}=${serialize(value)}`).join("\n")}\n`, "utf8");
}

function main() {
  const baseSha = String(process.env.CI_BASE_SHA ?? "").trim();
  const headSha = String(process.env.CI_HEAD_SHA ?? "HEAD").trim() || "HEAD";
  const fullScope = resolveFullScope();
  const provided = String(process.env.CI_CHANGED_FILES ?? "").trim();
  const files = provided ? provided.split(/\r?\n/u).map(normalizePath).filter(Boolean) : readChangedFiles(baseSha, headSha);
  const classification = classifyFiles(files, { fullScope });
  const outputs = { base_sha: baseSha, head_sha: headSha, ...classification };
  writeOutputs(outputs);
  process.stdout.write(`${JSON.stringify(outputs, null, 2)}\n`);
}

if (process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1].replaceAll("\\", "/"))) main();
