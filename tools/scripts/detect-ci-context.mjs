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
  const security = workflow || starts("governance/security/", "tools/security/");

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
  const runtimeTooling = starts("tools/scripts/runtime/") || equals(
    "tools/scripts/invoke-runtime-phase.ps1"
  );
  const runtime = full || financialChanged || mobileTooling || runtimeTooling || starts("infra/") || has((file) =>
    file.endsWith("service.manifest.ts") ||
    file.endsWith("start.ps1") ||
    /(^|\/)(next|metro|babel|app)\.config\.[cm]?[jt]s$/.test(file) ||
    /(^|\/)eas\.json$/.test(file) ||
    /(^|\/)runtime\.env(?:\.|$)/.test(file)
  );

  const sharedBrain = full || starts("shared/", "services/dsh/frontend/shared/", "services/wlt/frontend/shared/") || equals(
    "contracts/master.openapi.yaml",
    "governance/27_FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md"
  );

  const journeyIds = new Set();
  for (const file of files) {
    for (const match of file.matchAll(/jrn[-_ ]?(\d{3})/gi)) {
      journeyIds.add(`JRN-${match[1]}`);
    }
  }

  const journey = full || Boolean(manualJourney) || journeyIds.size > 0 || sharedBrain || has((file) =>
    file.startsWith("governance/product/") ||
    file.startsWith("governance/product-truth/") ||
    file.startsWith("governance/evidence/") ||
    /tools\/guards\/jrn[-_]?\d{3}/i.test(file) ||
    file === "tools/scripts/run-journey-gate.ps1"
  );

  const jrn040 = manualJourney === "JRN-040" || journeyIds.has("JRN-040") || has((file) =>
    /jrn[-_]?040/i.test(file) ||
    file === "services/dsh/tsconfig.jrn-040.json" ||
    file === "services/dsh/frontend/control-panel/platform/PlatformChangeWorkflowPanel.tsx"
  );

  const heavy = full || mobileTooling || workspaceManifest || sharedBrain || database || runtime || (contracts && frontend);
  const policy = governance || workflow || infrastructure || security;
  const node = frontend || contracts || journey || jrn040;

  let journeyScope = "";
  if (full) {
    journeyScope = "PROJECT-WIDE";
  } else if (manualJourney) {
    journeyScope = manualJourney;
  } else if (journeyIds.size > 0) {
    journeyScope = uniqueSorted([...journeyIds]).join(",");
  } else if (sharedBrain) {
    journeyScope = "PROJECT-WIDE";
  }

  // Progressive remediation system outputs (governance/remediation/**, spec S6.2).
  const remediationGovernanceChanged = full || starts("governance/remediation/");
  const taskContractChanged = full || starts("governance/remediation/tasks/", "governance/remediation/iterations/");
  const remediationToolingChanged = full || starts("tools/remediation/");
  const cleanupChanged = full || starts("governance/cleanup/") || equals(
    "tools/scripts/apply-repository-cleanup.mjs",
    "tools/guards/cleanup-policy-gate.mjs",
    "tools/scripts/check-repository-hygiene.mjs"
  );
  const nativeChanged = full || mobileTooling || starts("apps/mobile/") || has((file) =>
    /(^|\/)(android|ios)\//.test(file) ||
    /(^|\/)(app|eas)\.json$/.test(file) ||
    file.endsWith("google-services.json") ||
    file.endsWith("GoogleService-Info.plist")
  );
  const visualChanged = full || starts("shared/ui-kit/") || has((file) =>
    file.includes("/design-tokens/") ||
    file.endsWith(".snap") ||
    /ui-kit-visual-contract/i.test(file)
  );
  const tenantIsolationChanged = full || starts("governance/saas/") || has((file) =>
    /tenant/i.test(file) || /isolation/i.test(file)
  );
  const migrationChanged = full || includes("/migrations/");
  const sharedContractChanged = full || starts("contracts/") || includes("/contracts/", "/clients/generated/") || has((file) => file.endsWith(".openapi.yaml"));
  const recoveryChanged = full || starts("governance/runbooks/") || has((file) =>
    /backup/i.test(file) || /restore/i.test(file) || /recovery/i.test(file) || /rollback/i.test(file)
  );
  const observabilityChanged = full || starts("tools/observability/") || has((file) =>
    /observability/i.test(file) || /\botel\b/i.test(file) || /(^|\/)tracing\//i.test(file)
  );

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
    shared_brain: sharedBrain,
    heavy,
    jrn040,
    platform_change_sets: jrn040,
    task_contract_changed: taskContractChanged,
    cleanup_changed: cleanupChanged,
    native_changed: nativeChanged,
    visual_changed: visualChanged,
    tenant_isolation_changed: tenantIsolationChanged,
    financial_changed: financialChanged,
    migration_changed: migrationChanged,
    shared_contract_changed: sharedContractChanged,
    recovery_changed: recoveryChanged,
    observability_changed: observabilityChanged,
    remediation_governance_changed: remediationGovernanceChanged,
    remediation_tooling_changed: remediationToolingChanged
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

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    throw new Error("Usage: detect-ci-context.mjs <base-sha> <head-sha> [mode] [journey]");
  }
  const [baseSha, headSha, mode = "affected", journey = ""] = args;
  const changedFiles = readChangedFiles(baseSha, headSha);
  const result = classifyFiles(changedFiles, { mode, journey });
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  for (const [key, value] of Object.entries(result)) {
    appendFileSync(resolve(outputFile), `${key}=${serializeOutput(value)}\n`);
  }
}

const isEntrypoint = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  main();
}
