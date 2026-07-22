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

  const workflow = full || starts(".github/") || has((file) =>
    file === "tools/scripts/run-actionlint.mjs" ||
    file === "tools/scripts/run-zizmor.mjs" ||
    file === "tools/scripts/run-pinact.mjs"
  );

  const governance = full || equals("AGENTS.md", "GEMINI.md") || starts(".agents/", "governance/") || has((file) =>
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

  const frontend = full || workspaceManifest || starts("apps/", "shared/") || includes("/frontend/", "/clients/generated/");
  const contracts = full || starts("contracts/") || includes("/contracts/", "/clients/generated/") || has((file) => file.endsWith(".openapi.yaml"));
  const database = full || includes("/database/", "/migrations/") || starts("infra/docker/");
  const runtime = full || starts("infra/") || has((file) =>
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

  const heavy = full || workspaceManifest || sharedBrain || database || runtime || (contracts && frontend);
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
    jrn040
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
  const outputs = {
    base_sha: baseSha,
    head_sha: headSha,
    mode,
    ...classification
  };

  writeGitHubOutputs(outputs);
  process.stdout.write(`${JSON.stringify({ files: uniqueSorted(files), ...outputs }, null, 2)}\n`);
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectExecution) {
  main();
}
