import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_TARGETS = new Set(["typecheck", "lint", "test", "build"]);

export function resolveAffectedPlan(targets, environment = process.env) {
  const normalizedTargets = [...new Set(targets.map((target) => String(target).trim()).filter(Boolean))];
  if (!normalizedTargets.length) throw new Error("At least one affected target is required");
  for (const target of normalizedTargets) {
    if (!ALLOWED_TARGETS.has(target)) throw new Error(`Unsupported affected target: ${target}`);
  }

  const base = String(environment.NX_BASE ?? "").trim();
  const head = String(environment.NX_HEAD ?? "").trim();
  if (!base || !head) {
    throw new Error("NX_BASE and NX_HEAD are required; implicit defaultBase fallback is forbidden");
  }
  if (base === head) throw new Error("NX_BASE and NX_HEAD must identify different revisions");

  return normalizedTargets.map((target) => ({
    target,
    args: ["exec", "nx", "affected", "-t", target, "--base", base, "--head", head, "--outputStyle=stream"],
  }));
}

export function executeAffectedPlan(plan, environment = process.env) {
  for (const step of plan) {
    const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    const result = spawnSync(executable, step.args, {
      cwd: process.cwd(),
      env: environment,
      stdio: "inherit",
      shell: false,
      windowsHide: true,
    });
    if (result.error) throw new Error(`${step.target} could not start: ${result.error.message}`);
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}

function main() {
  const plan = resolveAffectedPlan(process.argv.slice(2));
  executeAffectedPlan(plan);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
