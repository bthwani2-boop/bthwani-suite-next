import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ZERO_SHA = /^0+$/;

function normalizePath(value) {
  return String(value ?? "").trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

function normalizeJourney(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function uniqueInOrder(values) {
  return [...new Set(values.filter(Boolean))];
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const FOUNDATION_GUARDS = JSON.parse(
  readFileSync(resolve(repositoryRoot, "governance/guards/guard-sets.json"), "utf8"),
).guardSets.foundation;

function resolveFoundationGuards({
  fullScope,
  changedFiles,
  workflow,
  infrastructure,
  workspaceManifest,
  ciRouter,
  contractsChanged,
  backendChanged,
  frontend,
}) {
  if (fullScope) return [...FOUNDATION_GUARDS];

  const files = changedFiles.map(normalizePath);
  const has = (predicate) => files.some(predicate);
  const starts = (...prefixes) => has((file) => prefixes.some((prefix) => file.startsWith(prefix)));
  const equals = (...names) => has((file) => names.includes(file));
  const governanceFiles = starts("governance/", ".agents/") || equals("AGENTS.md", "CLAUDE.md", "GEMINI.md", "LEAN-CTX.md", "opencode.json");
  const guardSourcesChanged = starts("tools/guards/");
  const guardOrTooling = starts("tools/guards/", "tools/scripts/");

  const selected = ["source-integrity"];
  if (governanceFiles) {
    selected.push(
      "governance-schema",
      "agent-governance",
      "authority-separation",
      "sdlc",
      "cleanup-policy",
    );
  }
  if (governanceFiles || guardSourcesChanged) selected.push("guard-registry");

  if (guardOrTooling || workflow || infrastructure || workspaceManifest || ciRouter || contractsChanged || backendChanged || frontend) {
    selected.push("required-command-integrity", "no-broken-imports");
  }
  if (contractsChanged || backendChanged) {
    selected.push("runtime-config", "api-binding", "backend-api-binding");
  }
  if (frontend) selected.push("runtime-config", "ui-kit-boundary");

  return [...new Set(selected)];
}

export function classifyFiles(inputFiles, options = {}) {
  const files = uniqueSorted(inputFiles.map(normalizePath));
  const mode = String(options.mode ?? "affected").trim().toLowerCase();
  const verificationDepth = String(options.verificationDepth ?? (mode === "full" ? "full" : "affected"))
    .trim()
    .toLowerCase();
  const executionPhase = String(options.executionPhase ?? "pr").trim().toLowerCase() || "pr";
  const manualJourney = normalizeJourney(options.journey);
  const fullScope = mode === "full";
  const full = fullScope;
  const has = (predicate) => files.some(predicate);
  const starts = (...prefixes) => has((file) => prefixes.some((prefix) => file.startsWith(prefix)));
  const equals = (...names) => has((file) => names.includes(file));
  const includes = (...parts) => has((file) => parts.some((part) => file.includes(part)));
  const productFiles = files.filter((file) =>
    !file.startsWith("tools/guards/") &&
    !file.startsWith("governance/") &&
    !file.startsWith(".agents/") &&
    !file.startsWith(".github/"),
  );
  const hasProduct = (predicate) => productFiles.some(predicate);

  const workspaceManifest = equals("package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "nx.json");
  const ciRouter = has((file) => file === "tools/scripts/detect-ci-context.mjs" || file === "tools/scripts/detect-ci-context.test.mjs");
  const mobileTooling = full || starts("tools/mobile/") || equals(
    "tools/scripts/guard-mobile-apps.mjs",
    "tools/scripts/sync-mobile-apps.mjs",
    "tools/scripts/eas-build-mobile.mjs"
  );
  const mobileRuntimeTransport = full || equals(
    "apps/mobile/start-mobile-runtime.ps1",
    "apps/mobile/mobile-lan.ps1",
    "tools/dev/mobile-dev-gateway.mjs",
    "tools/scripts/verify-mobile-lan-runtime.ps1",
    "services/dsh/frontend/shared/_kernel/mobile-dev-gateway.ts",
    "services/dsh/frontend/shared/_kernel/dsh-api-base-url.ts",
    "services/dsh/frontend/shared/_kernel/workforce-api-base-url.ts",
    "services/dsh/frontend/shared/session/dev-session-broker.adapter.ts",
    "services/dsh/frontend/shared/media/presigned-upload.client.ts",
    "services/dsh/frontend/shared/catalog/catalog-binary-upload.adapter.ts",
    "core/identity/clients/identity-api-config.ts"
  );

  const workflow = full || starts(".github/") || ciRouter || has((file) =>
    file === "tools/scripts/run-actionlint.mjs" ||
    file === "tools/scripts/run-zizmor.mjs" ||
    file === "tools/scripts/run-pinact.mjs"
  );

  const governance = full || mobileTooling || equals("AGENTS.md", "CLAUDE.md", "GEMINI.md", "LEAN-CTX.md", "opencode.json") || starts(".agents/", "governance/") || has((file) =>
    file.startsWith("tools/guards/") || workspaceManifest
  );

  const infrastructure = full || starts("infra/") || has((file) => /(^|\/)Dockerfile(?:\.|$)/.test(file) || file.endsWith(".dockerfile"));

  const dsh = full || starts("services/dsh/backend/", "services/dsh/database/");
  const wlt = full || starts("services/wlt/backend/", "services/wlt/database/");
  const identity = full || starts("core/identity/backend/", "core/identity/database/");
  const workforce = full || starts("core/workforce/backend/", "core/workforce/database/");
  const platform = full || starts("core/platform-control/backend/", "core/platform-control/database/");
  const providers = full || starts("core/providers/backend/", "core/providers/database/");

  const backendApiSurfaceChanged = starts(
    "services/dsh/backend/internal/http/",
    "services/wlt/backend/internal/http/",
    "core/identity/backend/internal/http/"
  ) || equals(
    "services/dsh/backend/cmd/dsh-api/main.go",
    "services/wlt/backend/cmd/wlt-api/main.go",
    "core/identity/backend/cmd/identity-api/main.go",
    "tools/guards/backend-api-binding-gate.mjs"
  );

  const frontend = full || mobileTooling || mobileRuntimeTransport || workspaceManifest || starts("apps/", "shared/") || includes("/frontend/", "/clients/generated/");
  const materializationInputsChanged = full ||
    (workspaceManifest && equals("pnpm-lock.yaml")) ||
    equals(
      "governance/contracts/generated-client-registry.json",
      "tools/scripts/materialize-openapi-artifacts.mjs",
      "tools/scripts/openapi-context-composer.mjs",
    ) ||
    starts("contracts/") ||
    has((file) => /^(?:core|services)\/[^/]+\/contracts\//.test(file) || file.endsWith(".openapi.yaml"));
  const contractsChanged = backendApiSurfaceChanged || materializationInputsChanged || includes("/clients/generated/");
  const databaseChanged = includes("/database/", "/migrations/") || starts("infra/docker/");
  const contracts = full || contractsChanged;
  const database = full || databaseChanged;

  const authChanged = full || starts("core/identity/backend/internal/identity/") || hasProduct((file) => file.startsWith("core/identity/") && /(^|\/)(auth|authentication|activation|otp|token|credential)(\/|[-_.])/i.test(file));
  const sessionChanged = full || hasProduct((file) => /(^|\/)(session|sessions|refresh-token|revocation|device-fingerprint)(\/|[-_.])/i.test(file));
  const authorizationModelChanged = full || starts("core/identity/backend/internal/identity/") || equals("governance/contracts/scope-vocabulary.json") || hasProduct((file) => /(^|\/)(?:[^/]*-)?(rbac|role|roles|permission|permissions|authorization|policy-enforcement)(\/|[-_.])/i.test(file));
  const rbacChanged = full || authorizationModelChanged;
  const privacyChanged = full || hasProduct((file) => /(^|\/)(privacy|consent|retention|redaction|anonymization)(\/|[-_.])/i.test(file));
  const piiChanged = full || hasProduct((file) => /(^|\/)(pii|personal-data|national-id|identity-document)(\/|[-_.])/i.test(file));
  const secretsChanged = full || equals("governance/policies/security.md") || starts("tools/security/") || hasProduct((file) => /(^|\/)(secret|secrets|credential|credentials|signing|keystore|certificate)(\/|[-_.])/i.test(file));
  const operatorContextChanged = full || equals(
    "governance/product/PRD.md",
    "governance/product/platform-model.yaml",
    "governance/policies/security.md",
    "governance/product/contracts/bthwani-platform-model.product-truth.json"
  ) || hasProduct((file) => /(^|\/)(OperatorContext|operator-context|platform-context|tenancy|cross-OperatorContext)(\/|[-_.])/i.test(file));
  const protectedSecurityChanged = authChanged || sessionChanged || rbacChanged || privacyChanged || piiChanged || secretsChanged || operatorContextChanged;
  const workflowSecurity = workflow;
  const securityScan = mobileRuntimeTransport || protectedSecurityChanged || equals("governance/policies/security.md") || starts("tools/security/");
  const security = workflowSecurity || securityScan;

  const financialChanged = full || wlt || starts(
    "services/dsh/backend/internal/wlt/",
    "services/dsh/frontend/shared/finance-wlt-link/",
    "services/dsh/frontend/control-panel/finance/",
    "tools/scripts/finance/",
    "tools/scripts/smoke-wlt-",
    "tools/scripts/smoke-wiremock-"
  ) || hasProduct((file) =>
    /(^|\/)(finance|wallet|commission|settlement|payout|ledger|refund|payment|checkoutfinanceoutbox|fieldcommissionoutbox)(\/|[-_.])/i.test(file) ||
    /dsh-wlt-finance/i.test(file)
  );

  const runtimeTooling = starts("tools/scripts/runtime/") || equals("tools/scripts/invoke-runtime-phase.ps1");
  const nativeChanged = full || starts("apps/mobile/") || has((file) =>
    /(^|\/)(android|ios)\//.test(file) ||
    /(^|\/)(app|eas)\.json$/.test(file) ||
    file.endsWith("google-services.json") ||
    file.endsWith("GoogleService-Info.plist")
  );

  let runtimeProfile = "none";
  if (full || infrastructure || runtimeTooling) runtimeProfile = "full";
  else if (financialChanged) runtimeProfile = "wlt-finance";
  else if (protectedSecurityChanged) runtimeProfile = "identity-security";
  else if (mobileRuntimeTransport) runtimeProfile = "identity-security";
  else if (nativeChanged) runtimeProfile = "mobile-native";
  else if (mobileTooling) runtimeProfile = "mobile-config";

  const runtime = runtimeProfile !== "none";
  const runtimeRequired = runtime && (["closure", "master"].includes(executionPhase) || protectedSecurityChanged);

  const mobile = full || mobileTooling || mobileRuntimeTransport || nativeChanged || starts(
    "apps/app-client/",
    "apps/app-captain/",
    "apps/app-field/",
    "apps/app-partner/",
  );

  const sharedBrain = full || starts("shared/", "services/dsh/frontend/shared/", "services/wlt/frontend/shared/") || equals("contracts/openapi/index.yaml");

  const productJourneyGovernance = has((file) =>
    file.startsWith("governance/product/") ||
    file === "tools/scripts/run-journey-gate.ps1"
  );
  const journey = full || Boolean(manualJourney) || productJourneyGovernance;

  const platformChangeSets = full || has((file) =>
    file === "governance/product/contracts/platform-change-sets.product-truth.json" ||
    file.startsWith("core/platform-control/backend/internal/platformcontrol/change_set_") ||
    file.startsWith("core/platform-control/database/migrations/platform-005_") ||
    file.startsWith("core/platform-control/database/migrations/platform-006_") ||
    file === "core/platform-control/contracts/platform-change-sets.openapi.yaml" ||
    file === "core/platform-control/clients/generated/platform-control-api.ts" ||
    file === "services/dsh/tsconfig.platform-change-sets.json" ||
    file === "services/dsh/frontend/control-panel/platform/PlatformChangeWorkflowPanel.tsx" ||
    file === "tools/guards/platform-change-sets-gate.mjs"
  );

  const cleanupChanged = full || equals(
    "governance/policies/delivery.md",
    "governance/policies/repository-retention-policy.json",
    "tools/scripts/apply-repository-cleanup.mjs",
    "tools/guards/cleanup-policy-gate.mjs",
    "tools/scripts/check-repository-hygiene.mjs"
  );
  const visualChanged = full || starts("shared/ui-kit/") || has((file) => file.includes("/design-tokens/") || file.endsWith(".snap") || /ui-kit-visual-contract/i.test(file));
  const migrationChanged = full || includes("/migrations/");
  const sharedContractChanged = full || starts("contracts/") || includes("/contracts/", "/clients/generated/") || has((file) => file.endsWith(".openapi.yaml"));
  const recoveryChanged = full || starts("docs/runbooks/") || has((file) => /backup/i.test(file) || /restore/i.test(file) || /recovery/i.test(file) || /rollback/i.test(file));
  const observabilityChanged = full || starts("tools/observability/") || has((file) => /observability/i.test(file) || /\botel\b/i.test(file) || /(^|\/)tracing\//i.test(file));

  const governancePolicy = governance;
  const workflowPolicy = workflow;
  const securityPolicy = security;
  const infrastructurePolicy = infrastructure;
  const nomenclatureRequired = workflow || governance || frontend || contracts || dsh || wlt || identity || workforce || platform || providers;
  const policy = governancePolicy || workflowPolicy || securityPolicy || infrastructurePolicy;
  const node = frontend || contracts || journey || platformChangeSets;
  const backendChanged = dsh || wlt || identity || workforce || platform || providers;
  const deepRisk = full || verificationDepth !== "affected" || workflow || security || infrastructure || workspaceManifest || mobileTooling || mobileRuntimeTransport || runtimeTooling || financialChanged || migrationChanged || nativeChanged || recoveryChanged;
  const standardRisk = deepRisk || policy || sharedBrain || database || contracts || backendChanged || journey;
  const verificationTier = deepRisk ? "deep" : standardRisk ? "standard" : "fast";
  const heavy = verificationTier === "deep";
  const diagnostics = full || contracts || (frontend && verificationTier !== "fast");

  let journeyScope = "";
  if (full || productJourneyGovernance) journeyScope = "PROJECT-WIDE";
  else if (manualJourney) journeyScope = manualJourney;

  const nodeScope = uniqueSorted([
    frontend ? "frontend" : "",
    contracts ? "contracts" : "",
    journey ? "journey" : "",
    platformChangeSets ? "platform-change-sets" : ""
  ]).join("-") || "none";

  const foundationGuardIds = resolveFoundationGuards({
    fullScope,
    changedFiles: files,
    workflow,
    infrastructure,
    workspaceManifest,
    ciRouter,
    contractsChanged,
    backendChanged,
    frontend,
  });

  return {
    changed_count: files.length,
    full_scope: fullScope,
    verification_depth: verificationDepth,
    foundation_guard_ids: uniqueInOrder(foundationGuardIds),
    governance,
    workflow,
    infrastructure,
    security,
    policy,
    governance_policy: governancePolicy,
    workflow_policy: workflowPolicy,
    workflow_security_policy: workflowSecurity,
    security_scan_policy: securityScan,
    security_policy: securityPolicy,
    infrastructure_policy: infrastructurePolicy,
    nomenclature_required: nomenclatureRequired,
    frontend,
    contracts,
    journey,
    journey_scope: journeyScope,
    node,
    node_scope: nodeScope,
    dsh,
    wlt,
    identity,
    workforce,
    platform,
    providers,
    database,
    database_changed: databaseChanged,
    contracts_changed: contractsChanged,
    materialization_inputs_changed: materializationInputsChanged,
    runtime,
    runtime_required: runtimeRequired,
    runtime_profile: runtimeProfile,
    mobile,
    shared_brain: sharedBrain,
    heavy,
    verification_tier: verificationTier,
    diagnostics,
    platform_change_sets: platformChangeSets,
    cleanup_changed: cleanupChanged,
    native_changed: nativeChanged,
    visual_changed: visualChanged,
    OperatorContext_isolation_changed: operatorContextChanged,
    financial_changed: financialChanged,
    migration_changed: migrationChanged,
    shared_contract_changed: sharedContractChanged,
    recovery_changed: recoveryChanged,
    observability_changed: observabilityChanged,
    auth_changed: authChanged,
    session_changed: sessionChanged,
    rbac_changed: rbacChanged,
    privacy_changed: privacyChanged,
    pii_changed: piiChanged,
    secrets_changed: secretsChanged,
    OperatorContext_context_changed: operatorContextChanged
  };
}

function readChangedFiles(baseSha, headSha) {
  const validBase = baseSha && !ZERO_SHA.test(baseSha) && baseSha !== headSha;
  const args = validBase
    ? ["diff", "--name-only", "--diff-filter=ACMRDTUXB", baseSha, headSha, "--"]
    : ["show", "--pretty=format:", "--name-only", headSha, "--"];
  try {
    return execFileSync("git", args, { encoding: "utf8" }).split(/\r?\n/).map(normalizePath).filter(Boolean);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to resolve changed files for ${baseSha || "<none>"}..${headSha}: ${message}`);
  }
}

function serializeOutput(value) {
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value ?? "");
}

function writeGitHubOutputs(outputs) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${serializeOutput(value)}`);
  appendFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
}

function main() {
  const baseSha = String(process.env.CI_BASE_SHA ?? "").trim();
  const headSha = String(process.env.CI_HEAD_SHA ?? "HEAD").trim() || "HEAD";
  const mode = String(process.env.CI_MODE ?? "affected").trim() || "affected";
  const verificationDepth = String(process.env.CI_VERIFICATION_DEPTH ?? "").trim() || undefined;
  const journey = String(process.env.CI_JOURNEY ?? "").trim();
  const providedFiles = String(process.env.CI_CHANGED_FILES ?? "").trim();
  const files = providedFiles ? providedFiles.split(/\r?\n/).map(normalizePath).filter(Boolean) : readChangedFiles(baseSha, headSha);
  const executionPhase = String(process.env.CI_EXECUTION_PHASE ?? "pr").trim() || "pr";
  const classification = classifyFiles(files, { mode, journey, executionPhase, verificationDepth });
  const outputs = { base_sha: baseSha, head_sha: headSha, mode, ...classification };
  writeGitHubOutputs(outputs);
  process.stdout.write(`${JSON.stringify({ files: uniqueSorted(files), ...outputs }, null, 2)}\n`);
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectExecution) main();
