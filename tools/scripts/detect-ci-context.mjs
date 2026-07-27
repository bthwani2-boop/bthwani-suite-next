import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ZERO_SHA = /^0+$/;

function normalizePath(value) {
  return String(value ?? "").trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

function normalizeJourney(value) {
  const match = String(value ?? "").trim().toUpperCase().match(/(?:JRN[-_ ]?)?(\d{1,3})/);
  return match ? `JRN-${match[1].padStart(3, "0")}` : "";
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

export function classifyFiles(inputFiles, options = {}) {
  const files = uniqueSorted(inputFiles.map(normalizePath));
  const mode = String(options.mode ?? "affected").trim().toLowerCase();
  const manualJourney = normalizeJourney(options.journey);
  const full = mode === "full";
  const has = (predicate) => files.some(predicate);
  const starts = (...prefixes) => has((file) => prefixes.some((prefix) => file.startsWith(prefix)));
  const equals = (...names) => has((file) => names.includes(file));
  const includes = (...parts) => has((file) => parts.some((part) => file.includes(part)));

  const workspaceManifest = equals("package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "nx.json");
  const ciRouter = has((file) =>
    file === "tools/scripts/detect-ci-context.mjs" ||
    file === "tools/scripts/detect-ci-context.test.mjs"
  );
  const mobileTooling = full || starts("tools/mobile/") || equals(
    "tools/scripts/guard-mobile-apps.mjs",
    "tools/scripts/sync-mobile-apps.mjs",
    "tools/scripts/eas-build-mobile.mjs"
  );

  const workflow = full || starts(".github/") || ciRouter || has((file) =>
    file === "tools/scripts/run-actionlint.mjs" ||
    file === "tools/scripts/run-zizmor.mjs" ||
    file === "tools/scripts/run-pinact.mjs"
  );

  const governance = full || mobileTooling || equals("AGENTS.md", "GEMINI.md") || starts(".agents/", "governance/") || has((file) =>
    file.startsWith("tools/guards/") || workspaceManifest
  );

  const infrastructure = full || starts("infra/") || has((file) =>
    /(^|\/)Dockerfile(?:\.|$)/.test(file) ||
    file.endsWith(".dockerfile")
  );

  const dsh = full || starts("services/dsh/backend/", "services/dsh/database/");
  const wlt = full || starts("services/wlt/backend/", "services/wlt/database/");
  const identity = full || starts("core/identity/backend/", "core/identity/database/");
  const workforce = full || starts("core/workforce/backend/", "core/workforce/database/");
  const platform = full || starts("core/platform-control/backend/", "core/platform-control/database/");
  const providers = full || starts("core/providers/backend/", "core/providers/database/");

  const backendApiSurface = full || starts(
    "services/dsh/backend/internal/http/",
    "services/wlt/backend/internal/http/",
    "core/identity/backend/internal/http/"
  ) || equals(
    "services/dsh/backend/cmd/dsh-api/main.go",
    "services/wlt/backend/cmd/wlt-api/main.go",
    "core/identity/backend/cmd/identity-api/main.go",
    "tools/guards/backend-api-binding-gate.mjs"
  );

  const frontend = full || mobileTooling || workspaceManifest || starts("apps/", "shared/") || includes("/frontend/", "/clients/generated/");
  const contracts = full || backendApiSurface || starts("contracts/") || includes("/contracts/", "/clients/generated/") || has((file) => file.endsWith(".openapi.yaml"));
  const database = full || includes("/database/", "/migrations/") || starts("infra/docker/");

  const authChanged = full || has((file) =>
    file.startsWith("core/identity/") && /(^|\/)(auth|authentication|activation|otp|token|credential)(\/|[-_.])/i.test(file)
  );
  const sessionChanged = full || has((file) =>
    /(^|\/)(session|sessions|refresh-token|revocation|device-fingerprint)(\/|[-_.])/i.test(file)
  );
  const rbacChanged = full || has((file) =>
    /(^|\/)(rbac|role|roles|permission|permissions|authorization|policy-enforcement)(\/|[-_.])/i.test(file)
  );
  const privacyChanged = full || has((file) =>
    /(^|\/)(privacy|consent|retention|redaction|anonymization)(\/|[-_.])/i.test(file)
  );
  const piiChanged = full || has((file) =>
    /(^|\/)(pii|personal-data|national-id|identity-document)(\/|[-_.])/i.test(file)
  );
  const secretsChanged = full || starts("governance/security/", "tools/security/") || has((file) =>
    /(^|\/)(secret|secrets|credential|credentials|signing|keystore|certificate)(\/|[-_.])/i.test(file)
  );
  const tenantContextChanged = full || starts("governance/saas/") || has((file) =>
    /(^|\/)(tenant|tenancy|tenant-context|tenant-isolation|cross-tenant)(\/|[-_.])/i.test(file)
  );
  const protectedSecurityChanged = authChanged || sessionChanged || rbacChanged || privacyChanged || piiChanged || secretsChanged || tenantContextChanged;
  const security = workflow || protectedSecurityChanged || starts("governance/security/", "tools/security/");

  const financialChanged = full || wlt || starts(
    "services/dsh/backend/internal/wlt/",
    "services/dsh/frontend/shared/finance-wlt-link/",
    "services/dsh/frontend/control-panel/finance/",
    "governance/dsh-wlt",
    "tools/scripts/finance/",
    "tools/scripts/smoke-wlt-",
    "tools/scripts/smoke-wiremock-"
  ) || has((file) =>
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
  else if (nativeChanged) runtimeProfile = "mobile-native";
  else if (mobileTooling) runtimeProfile = "mobile-config";

  const runtime = runtimeProfile !== "none";

  const sharedBrain = full || starts("shared/", "services/dsh/frontend/shared/", "services/wlt/frontend/shared/") || equals(
    "contracts/master.openapi.yaml",
    "governance/27_FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md"
  );

  const journeyIds = new Set();
  for (const file of files) {
    for (const match of file.matchAll(/jrn[-_ ]?(\d{3})/gi)) journeyIds.add(`JRN-${match[1]}`);
  }

  const productJourneyGovernance = has((file) =>
    file.startsWith("governance/product/") ||
    file.startsWith("governance/product-truth/") ||
    file.startsWith("governance/evidence/") ||
    /tools\/guards\/jrn[-_]?\d{3}/i.test(file) ||
    file === "tools/scripts/run-journey-gate.ps1"
  );
  const journey = full || Boolean(manualJourney) || journeyIds.size > 0 || productJourneyGovernance;

  const jrn040 = manualJourney === "JRN-040" || journeyIds.has("JRN-040") || has((file) =>
    /jrn[-_]?040/i.test(file) ||
    file === "services/dsh/tsconfig.jrn-040.json" ||
    file === "services/dsh/frontend/control-panel/platform/PlatformChangeWorkflowPanel.tsx"
  );

  const cleanupChanged = full || starts("governance/cleanup/") || equals(
    "tools/scripts/apply-repository-cleanup.mjs",
    "tools/guards/cleanup-policy-gate.mjs",
    "tools/scripts/check-repository-hygiene.mjs"
  );
  const visualChanged = full || starts("shared/ui-kit/") || has((file) =>
    file.includes("/design-tokens/") ||
    file.endsWith(".snap") ||
    /ui-kit-visual-contract/i.test(file)
  );
  const migrationChanged = full || includes("/migrations/");
  const sharedContractChanged = full || starts("contracts/") || includes("/contracts/", "/clients/generated/") || has((file) => file.endsWith(".openapi.yaml"));
  const recoveryChanged = full || starts("governance/runbooks/") || has((file) =>
    /backup/i.test(file) || /restore/i.test(file) || /recovery/i.test(file) || /rollback/i.test(file)
  );
  const observabilityChanged = full || starts("tools/observability/") || has((file) =>
    /observability/i.test(file) || /\botel\b/i.test(file) || /(^|\/)tracing\//i.test(file)
  );

  const governancePolicy = governance;
  const workflowPolicy = workflow;
  const securityPolicy = security;
  const infrastructurePolicy = infrastructure;
  const nomenclatureRequired = workflow || governance || frontend || contracts || dsh || wlt || identity || workforce || platform || providers;
  const policy = governancePolicy || workflowPolicy || securityPolicy || infrastructurePolicy;
  const node = frontend || contracts || journey || jrn040;
  const backendChanged = dsh || wlt || identity || workforce || platform || providers;
  const deepRisk = full || workflow || security || infrastructure || workspaceManifest || mobileTooling || runtimeTooling || financialChanged || migrationChanged || nativeChanged || recoveryChanged;
  const standardRisk = deepRisk || policy || sharedBrain || database || contracts || backendChanged || journey;
  const verificationTier = deepRisk ? "deep" : standardRisk ? "standard" : "fast";
  const heavy = verificationTier === "deep";
  const diagnostics = full || contracts || (frontend && verificationTier !== "fast");

  let journeyScope = "";
  if (full || productJourneyGovernance) journeyScope = "PROJECT-WIDE";
  else if (manualJourney) journeyScope = manualJourney;
  else if (journeyIds.size > 0) journeyScope = uniqueSorted([...journeyIds]).join(",");

  const nodeScope = uniqueSorted([
    frontend ? "frontend" : "",
    contracts ? "contracts" : "",
    journey ? "journey" : "",
    jrn040 ? "jrn040" : ""
  ]).join("-") || "none";

  return {
    changed_count: files.length,
    governance,
    workflow,
    infrastructure,
    security,
    policy,
    governance_policy: governancePolicy,
    workflow_policy: workflowPolicy,
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
    runtime,
    runtime_profile: runtimeProfile,
    shared_brain: sharedBrain,
    heavy,
    verification_tier: verificationTier,
    diagnostics,
    jrn040,
    platform_change_sets: jrn040,
    cleanup_changed: cleanupChanged,
    native_changed: nativeChanged,
    visual_changed: visualChanged,
    tenant_isolation_changed: tenantContextChanged,
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
    tenant_context_changed: tenantContextChanged
  };
}

function readChangedFiles(baseSha, headSha) {
  const validBase = baseSha && !ZERO_SHA.test(baseSha) && baseSha !== headSha;
  const args = validBase
    ? ["diff", "--name-only", "--diff-filter=ACMRDTUXB", baseSha, headSha, "--"]
    : ["show", "--pretty=format:", "--name-only", headSha, "--"];

  try {
    return execFileSync("git", args, { encoding: "utf8" })
      .split(/\r?\n/)
      .map(normalizePath)
      .filter(Boolean);
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
  const journey = String(process.env.CI_JOURNEY ?? "").trim();
  const providedFiles = String(process.env.CI_CHANGED_FILES ?? "").trim();
  const files = providedFiles
    ? providedFiles.split(/\r?\n/).map(normalizePath).filter(Boolean)
    : readChangedFiles(baseSha, headSha);

  const classification = classifyFiles(files, { mode, journey });
  const outputs = { base_sha: baseSha, head_sha: headSha, mode, ...classification };
  writeGitHubOutputs(outputs);
  process.stdout.write(`${JSON.stringify({ files: uniqueSorted(files), ...outputs }, null, 2)}\n`);
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectExecution) main();
