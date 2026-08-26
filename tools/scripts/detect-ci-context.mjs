import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { deriveVerificationRequirement, isVerificationAuthorityChange } from "./verification-requirement.mjs";

const ZERO_SHA = /^0+$/;
const normalizePath = (value) => String(value ?? "").trim().replaceAll("\\", "/").replace(/^\.\//, "");
const sorted = (values) => [...new Set(values.filter(Boolean))].sort();
const normalizeJourney = (value) => String(value ?? "")
  .trim()
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

export function classifyFiles(inputFiles, options = {}) {
  const files = sorted(inputFiles.map(normalizePath));
  const mode = String(options.mode ?? "affected").trim().toLowerCase();
  const executionPhase = String(options.executionPhase ?? "pr").trim().toLowerCase() || "pr";
  const verificationDepth = String(options.verificationDepth ?? (mode === "full" ? "full" : "affected")).trim().toLowerCase();
  const runtimeProofRequested = String(options.runtimeProof ?? "false").trim().toLowerCase() === "true";
  const manualJourney = normalizeJourney(options.journey);

  const has = (predicate) => files.some(predicate);
  const starts = (...prefixes) => has((file) => prefixes.some((prefix) => file.startsWith(prefix)));
  const equals = (...paths) => has((file) => paths.includes(file));
  const includes = (...parts) => has((file) => parts.some((part) => file.includes(part)));

  const verificationAuthorityChanged = isVerificationAuthorityChange(files);
  const authorityRequiresFull = verificationAuthorityChanged && ["closure", "default-branch"].includes(executionPhase);
  const fullScope = mode === "full" || authorityRequiresFull;
  const fullVerification = fullScope || verificationDepth === "full";

  const workspace = equals("package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "nx.json");
  const workflow = starts(".github/") || verificationAuthorityChanged;
  const infrastructure = starts("infra/") || has((file) => /(^|\/)Dockerfile(?:\.|$)/.test(file) || file.endsWith(".dockerfile"));

  const dsh = fullScope || starts("services/dsh/backend/", "services/dsh/database/");
  const wlt = fullScope || starts("services/wlt/backend/", "services/wlt/database/");
  const identity = fullScope || starts("core/identity/backend/", "core/identity/database/");
  const workforce = fullScope || starts("core/workforce/backend/", "core/workforce/database/");
  const platform = fullScope || starts("core/platform-control/backend/", "core/platform-control/database/");
  const providers = fullScope || starts("core/providers/backend/", "core/providers/database/");
  const backend = dsh || wlt || identity || workforce || platform || providers;

  const mobileTooling = starts("tools/mobile/") || equals(
    "tools/scripts/guard-mobile-apps.mjs",
    "tools/scripts/sync-mobile-apps.mjs",
    "tools/scripts/eas-build-mobile.mjs",
  );
  const mobileTransport = equals(
    "tools/mobile/start-mobile-runtime.ps1",
    "tools/mobile/mobile-lan.ps1",
    "tools/dev/mobile-dev-gateway.mjs",
    "tools/scripts/verify-mobile-lan-runtime.ps1",
    "services/dsh/frontend/shared/_kernel/mobile-dev-gateway.ts",
    "services/dsh/frontend/shared/_kernel/dsh-api-base-url.ts",
    "services/dsh/frontend/shared/_kernel/workforce-api-base-url.ts",
    "services/dsh/frontend/shared/session/dev-session-broker.adapter.ts",
    "services/dsh/frontend/shared/media/presigned-upload.client.ts",
    "services/dsh/frontend/shared/catalog/catalog-binary-upload.adapter.ts",
    "core/identity/clients/identity-api-config.ts",
  );
  const nativeChanged = starts("tools/mobile/") || has((file) =>
    /(^|\/)(android|ios)\//.test(file) || /(^|\/)(app|eas)\.json$/.test(file) ||
    file.endsWith("google-services.json") || file.endsWith("GoogleService-Info.plist"),
  );
  const mobile = fullScope || mobileTooling || mobileTransport || nativeChanged || starts(
    "apps/app-client/", "apps/app-captain/", "apps/app-field/", "apps/app-partner/",
  );
  const frontend = fullScope || workspace || mobile || starts("apps/", "shared/") || includes("/frontend/", "/clients/generated/");

  const apiSurface = starts(
    "services/dsh/backend/internal/http/",
    "services/wlt/backend/internal/http/",
    "core/identity/backend/internal/http/",
  ) || equals(
    "services/dsh/backend/cmd/dsh-api/main.go",
    "services/wlt/backend/cmd/wlt-api/main.go",
    "core/identity/backend/cmd/identity-api/main.go",
  );
  const contractSource = starts("contracts/") || has((file) =>
    /^(?:core|services)\/[^/]+\/contracts\//.test(file) || file.endsWith(".openapi.yaml"),
  );
  const contractTooling = equals(
    "tools/scripts/materialize-openapi-artifacts.mjs",
    "tools/scripts/openapi-context-composer.mjs",
    "tools/verification/generated-client-registry.json",
    "tools/verification/frontend-binding-registry.json",
    "tools/verification/frontend-binding-registry.schema.json",
    "tools/verification/security-scope-vocabulary.json",
  );
  const contractsChanged = fullScope || apiSurface || contractSource || contractTooling || includes("/clients/generated/");
  const contracts = contractsChanged;

  const databaseChanged = fullScope || includes("/database/", "/migrations/") || starts("infra/docker/") || equals(
    "tools/verification/migration-amendments.json",
    "tools/verification/aggregate-ownership.json",
  );
  const database = databaseChanged;
  const migrationChanged = includes("/migrations/") || equals("tools/verification/migration-amendments.json");

  const authChanged = starts("core/identity/backend/internal/identity/") || has((file) =>
    file.startsWith("core/identity/") && /(^|\/)(auth|authentication|activation|otp|token|credential)(\/|[-_.])/i.test(file),
  );
  const sessionChanged = has((file) => /(^|\/)(session|sessions|refresh-token|revocation|device-fingerprint)(\/|[-_.])/i.test(file));
  const rbacChanged = starts("core/identity/backend/internal/identity/") || equals("tools/verification/security-scope-vocabulary.json") || has((file) =>
    /(^|\/)(?:[^/]*-)?(rbac|role|roles|permission|permissions|authorization|policy-enforcement)(\/|[-_.])/i.test(file),
  );
  const privacyChanged = has((file) => /(^|\/)(privacy|consent|retention|redaction|anonymization)(\/|[-_.])/i.test(file));
  const piiChanged = has((file) => /(^|\/)(pii|personal-data|national-id|identity-document)(\/|[-_.])/i.test(file));
  const secretsChanged = starts("tools/security/") || has((file) =>
    /(^|\/)(secret|secrets|credential|credentials|signing|keystore|certificate)(\/|[-_.])/i.test(file),
  );
  const protectedSecurityChanged = authChanged || sessionChanged || rbacChanged || privacyChanged || piiChanged || secretsChanged;
  const security = workflow || mobileTransport || protectedSecurityChanged;

  const financialChanged = wlt || starts(
    "services/dsh/backend/internal/wlt/",
    "services/dsh/frontend/shared/finance-wlt-link/",
    "services/dsh/frontend/control-panel/finance/",
    "tools/scripts/finance/",
    "tools/scripts/smoke-wlt-",
    "tools/scripts/smoke-wiremock-",
  ) || has((file) => /(^|\/)(finance|wallet|commission|settlement|payout|ledger|refund|payment)(\/|[-_.])/i.test(file));

  const runtimeTooling = starts("tools/scripts/runtime/") || equals("tools/scripts/invoke-runtime-phase.ps1");
  let runtimeProfile = "none";
  if (fullScope || infrastructure || runtimeTooling) runtimeProfile = "full";
  else if (financialChanged) runtimeProfile = "wlt-finance";
  else if (protectedSecurityChanged || mobileTransport) runtimeProfile = "identity-security";
  else if (nativeChanged) runtimeProfile = "mobile-native";
  else if (mobileTooling) runtimeProfile = "mobile-config";
  if (runtimeProofRequested && runtimeProfile === "none") runtimeProfile = "full";

  const runtime = runtimeProfile !== "none";
  const runtimeRequired = runtime && (
    runtimeProofRequested || fullScope || ["closure", "default-branch"].includes(executionPhase)
  );

  const sharedBrain = starts("shared/", "services/dsh/frontend/shared/", "services/wlt/frontend/shared/");
  const journey = fullScope || Boolean(manualJourney);
  const platformChangeSets = fullScope || has((file) =>
    file.startsWith("core/platform-control/backend/internal/platformcontrol/change_set_") ||
    file.startsWith("core/platform-control/database/migrations/platform-005_") ||
    file.startsWith("core/platform-control/database/migrations/platform-006_") ||
    file === "core/platform-control/contracts/platform-change-sets.openapi.yaml" ||
    file === "core/platform-control/clients/generated/platform-control-api.ts" ||
    file === "services/dsh/tsconfig.platform-change-sets.json" ||
    file === "services/dsh/frontend/control-panel/platform/PlatformChangeWorkflowPanel.tsx" ||
    file === "tools/guards/platform-change-sets-gate.mjs",
  );

  const deepRisk = fullScope || workflow || security || infrastructure || workspace || mobileTooling || mobileTransport ||
    runtimeTooling || financialChanged || migrationChanged || nativeChanged;
  const standardRisk = deepRisk || sharedBrain || database || contracts || backend || journey || platformChangeSets;
  const verificationTier = deepRisk ? "deep" : standardRisk ? "standard" : "fast";
  const heavy = verificationTier === "deep";

  const diagnostics = contracts;
  const node = fullScope || frontend || contracts || journey || platformChangeSets;
  const backendRequired = fullScope || backend;
  const verificationRequired = node;

  const verificationRequirement = deriveVerificationRequirement({
    fullScope,
    verificationDepth: fullVerification ? "full" : "affected",
    diagnostics,
    verification: verificationRequired,
    backend: backendRequired,
    runtimeRequired,
    authorityChange: verificationAuthorityChanged,
  });

  const journeyScope = fullScope ? "PROJECT-WIDE" : manualJourney;
  const nodeScope = sorted([
    frontend ? "frontend" : "",
    contracts ? "contracts" : "",
    journey ? "journey" : "",
    platformChangeSets ? "platform-change-sets" : "",
  ]).join("-") || "none";

  return {
    changed_count: files.length,
    full_scope: fullScope,
    full_verification: fullVerification,
    verification_depth: fullVerification ? "full" : "affected",
    verification_requirement: verificationRequirement,
    required_jobs: verificationRequirement.required_jobs,
    workflow,
    infrastructure,
    security,
    security_scan: mobileTransport || protectedSecurityChanged,
    frontend,
    contracts,
    contracts_changed: contractsChanged,
    materialization_inputs_changed: contractsChanged,
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
    runtime,
    runtime_required: verificationRequirement.runtime_required,
    runtime_profile: runtimeProfile,
    mobile,
    shared_brain: sharedBrain,
    heavy,
    verification_tier: verificationTier,
    diagnostics,
    diagnostics_required: diagnostics,
    verification_required: verificationRequired,
    backend_required: backendRequired,
    platform_change_sets: platformChangeSets,
    native_changed: nativeChanged,
    financial_changed: financialChanged,
    migration_changed: migrationChanged,
    auth_changed: authChanged,
    session_changed: sessionChanged,
    rbac_changed: rbacChanged,
    privacy_changed: privacyChanged,
    pii_changed: piiChanged,
    secrets_changed: secretsChanged,
  };
}

function readChangedFiles(baseSha, headSha) {
  const validBase = baseSha && !ZERO_SHA.test(baseSha) && baseSha !== headSha;
  const args = validBase
    ? ["diff", "--name-only", "--diff-filter=ACMRDTUXB", baseSha, headSha, "--"]
    : ["show", "--pretty=format:", "--name-only", headSha, "--"];
  return execFileSync("git", args, { encoding: "utf8" }).split(/\r?\n/).map(normalizePath).filter(Boolean);
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
  const mode = String(process.env.CI_MODE ?? "affected").trim() || "affected";
  const provided = String(process.env.CI_CHANGED_FILES ?? "").trim();
  const files = provided ? provided.split(/\r?\n/).map(normalizePath).filter(Boolean) : readChangedFiles(baseSha, headSha);
  const classification = classifyFiles(files, {
    mode,
    journey: process.env.CI_JOURNEY,
    executionPhase: process.env.CI_EXECUTION_PHASE,
    verificationDepth: process.env.CI_VERIFICATION_DEPTH,
    runtimeProof: process.env.CI_RUNTIME_PROOF,
  });
  const outputs = { base_sha: baseSha, head_sha: headSha, mode, ...classification };
  writeOutputs(outputs);
  process.stdout.write(`${JSON.stringify(outputs, null, 2)}\n`);
}

if (process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1].replaceAll("\\", "/"))) main();
