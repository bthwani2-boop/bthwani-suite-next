import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePackageManagerInvocation } from "./lib/package-manager-invocation.mjs";

const ALLOWED_TARGETS = new Set(["typecheck", "lint", "test", "build"]);
const DEFAULT_TARGETS = ["typecheck", "lint", "test"];
const SHA_PATTERN = /^[0-9a-f]{40}$/i;

export function resolveAffectedPlan(targets, environment = process.env) {
  const requestedTargets = Array.isArray(targets) && targets.length ? targets : DEFAULT_TARGETS;
  const normalizedTargets = [...new Set(requestedTargets.map((target) => String(target).trim()).filter(Boolean))];
  if (!normalizedTargets.length) throw new Error("At least one affected target is required");
  for (const target of normalizedTargets) {
    if (!ALLOWED_TARGETS.has(target)) throw new Error(`Unsupported affected target: ${target}`);
  }

  const base = String(environment.NX_BASE ?? "").trim();
  const head = String(environment.NX_HEAD ?? "").trim();
  if (!base || !head) {
    throw new Error("NX_BASE and NX_HEAD are required; implicit defaultBase fallback is forbidden");
  }
  if (!SHA_PATTERN.test(base) || !SHA_PATTERN.test(head)) {
    throw new Error("NX_BASE and NX_HEAD must be full 40-character commit SHAs");
  }
  if (base === head) throw new Error("NX_BASE and NX_HEAD must identify different revisions");

  return {
    targets: normalizedTargets,
    args: [
      "exec",
      "nx",
      "affected",
      "-t",
      ...normalizedTargets,
      "--base",
      base,
      "--head",
      head,
      "--outputStyle=stream",
    ],
  };
}

export function executeAffectedPlan(plan, environment = process.env) {
  const invocation = resolvePackageManagerInvocation("pnpm", plan.args, environment);
  const result = spawnSync(invocation.executable, invocation.args, {
    cwd: process.cwd(),
    env: environment,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  });
  if (result.error) throw new Error(`Affected verification could not start: ${result.error.message}`);
  if (result.signal) throw new Error(`Affected verification terminated by signal ${result.signal}`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function main() {
  const plan = resolveAffectedPlan(process.argv.slice(2));
  executeAffectedPlan(plan);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
