import { appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ZERO_SHA = /^0+$/u;
const normalizePath = (value) => String(value ?? "").trim().replaceAll("\\", "/").replace(/^\.\//u, "");
const sorted = (values) => [...new Set(values.map(normalizePath).filter(Boolean))].sort();
const hasPath = (files, predicate) => files.some(predicate);
const startsWithAny = (file, prefixes) => prefixes.some((prefix) => file.startsWith(prefix));
const isDependencyManifest = (file) => /(^|\/)(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|go\.mod|go\.sum|requirements[^/]*\.txt|poetry\.lock|Cargo\.lock)$/u.test(file);
const isDockerFile = (file) => file === ".dockerignore" || /(^|\/)(Dockerfile(?:\..*)?|[^/]*\.dockerfile)$/u.test(file);

export function classifyFiles(inputFiles, options = {}) {
  const files = sorted(inputFiles);
  const fullScope = options.fullScope === true;

  const moduleChanged = (prefixes) => fullScope || hasPath(files, (file) => startsWithAny(file, prefixes));
  const frontend = fullScope || hasPath(files, (file) =>
    startsWithAny(file, ["apps/", "shared/"]) || /(^|\/)(services\/[^/]+\/frontend)\//u.test(file),
  );
  const contracts = fullScope || hasPath(files, (file) =>
    file.startsWith("contracts/") || file.endsWith(".openapi.yaml") || file.includes("/contracts/") || file.includes("/clients/generated/"),
  );
  const databaseChanged = fullScope || hasPath(files, (file) => file.includes("/database/") || file.includes("/migrations/"));
  const infrastructure = fullScope || hasPath(files, (file) => file.startsWith("infra/") || isDockerFile(file));
  const ciControlPlane = fullScope || hasPath(files, (file) => file.startsWith(".github/") || file.startsWith("tools/scripts/") || file.startsWith("tools/guards/"));
  const dependencyChanged = fullScope || hasPath(files, isDependencyManifest);

  const dsh = moduleChanged(["services/dsh/backend/", "services/dsh/database/"]);
  const wlt = moduleChanged(["services/wlt/backend/", "services/wlt/database/"]);
  const identity = moduleChanged(["core/identity/backend/", "core/identity/database/"]);
  const workforce = moduleChanged(["core/workforce/backend/", "core/workforce/database/"]);
  const platform = moduleChanged(["core/platform-control/backend/", "core/platform-control/database/"]);
  const providers = moduleChanged(["core/providers/backend/", "core/providers/database/"]);
  const backend = dsh || wlt || identity || workforce || platform || providers;

  const node = fullScope || frontend || contracts || ciControlPlane || dependencyChanged;
  const runtimeRequired = fullScope || infrastructure;
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

  return {
    changed_count: files.length,
    full_scope: fullScope,
    dependency_changed: dependencyChanged,
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
    node,
    verification_required: verificationRequired,
    backend_required: backendRequired,
    diagnostics_required: diagnosticsRequired,
    runtime_required: runtimeRequired,
    sonar_required: sonarRequired,
    required_jobs: requiredJobs,
  };
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
  const fullScope = String(process.env.CI_FULL_SCOPE ?? "false").trim().toLowerCase() === "true";
  const provided = String(process.env.CI_CHANGED_FILES ?? "").trim();
  const files = provided ? provided.split(/\r?\n/u).map(normalizePath).filter(Boolean) : readChangedFiles(baseSha, headSha);
  const classification = classifyFiles(files, { fullScope });
  const outputs = { base_sha: baseSha, head_sha: headSha, ...classification };
  writeOutputs(outputs);
  process.stdout.write(`${JSON.stringify(outputs, null, 2)}\n`);
}

if (process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1].replaceAll("\\", "/"))) main();
