import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const full = args.has("--full");
const concurrencyArg = process.argv.find((v) => v.startsWith("--concurrency="));
const concurrency = Math.max(1, Number(concurrencyArg?.split("=")[1] ?? 3));
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const stamp = new Date().toISOString().replaceAll(":", "-");
const evidenceDir = path.join(tmpdir(), "bthwani-deep-discovery", stamp);
mkdirSync(evidenceDir, { recursive: true });

const checks = [
  ["git-diff-check", "git", ["diff", "--check"]],
  ["ci-routing-regressions", process.execPath, ["--test", "tools/scripts/ci-routing.test.mjs"]],
  ["ci-context-regressions", process.execPath, ["--test", "tools/scripts/detect-ci-context.test.mjs"]],
  ["source-integrity", pnpm, ["run", "guard:source-integrity"]],
  ["fullstack-boundary", pnpm, ["run", "guard:fullstack-boundary"]],
  ["aggregate-ownership", pnpm, ["run", "guard:aggregate-ownership"]],
  ["runtime-config", pnpm, ["run", "guard:runtime-config"]],
  ["control-panel-architecture", pnpm, ["run", "guard:control-panel-architecture"]],
  ["ast-grep-rules", pnpm, ["run", "guard:ast-grep-rules"]],
  ["knip", pnpm, ["run", "diagnostics:knip"]],
  ["jscpd", pnpm, ["run", "diagnostics:jscpd"]],
  ["madge", pnpm, ["run", "diagnostics:madge"]],
];

if (full) {
  for (const target of ["typecheck", "lint", "test", "build"]) {
    checks.push([
      `nx-${target}-fresh`,
      pnpm,
      ["exec", "nx", "run-many", "-t", target, "--all", "--outputStyle=stream", "--skip-nx-cache"],
    ]);
  }
}

function runCheck([id, command, commandArgs]) {
  return new Promise((resolve) => {
    const logPath = path.join(evidenceDir, `${id}.log`);
    const log = createWriteStream(logPath, { flags: "w" });
    const startedAt = new Date().toISOString();
    let settled = false;

    log.write(`COMMAND: ${command} ${commandArgs.join(" ")}\nSTARTED: ${startedAt}\n\n`);

    const finish = (result, trailer) => {
      if (settled) return;
      settled = true;
      if (trailer) log.write(trailer);
      log.end(() => resolve(result));
    };

    const child = spawn(command, commandArgs, {
      cwd: process.cwd(),
      env: { ...process.env, NO_COLOR: "1", CI: process.env.CI ?? "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: process.platform === "win32" && /\.(cmd|bat)$/iu.test(command),
    });

    child.stdout?.pipe(log, { end: false });
    child.stderr?.pipe(log, { end: false });

    child.once("error", (error) => {
      finish(
        {
          id,
          status: "FAIL",
          exitCode: -1,
          logPath,
          startedAt,
          endedAt: new Date().toISOString(),
          error: error.message,
        },
        `\nSPAWN_ERROR: ${error.stack ?? error.message}\n`,
      );
    });

    child.once("close", (code) => {
      finish(
        {
          id,
          status: code === 0 ? "PASS" : "FAIL",
          exitCode: code ?? -1,
          logPath,
          startedAt,
          endedAt: new Date().toISOString(),
        },
        `\nEXIT_CODE: ${code}\n`,
      );
    });
  });
}

async function main() {
  const pending = [...checks];
  const results = [];
  const workers = Array.from({ length: Math.min(concurrency, pending.length) }, async () => {
    while (pending.length) {
      const check = pending.shift();
      if (!check) return;
      process.stdout.write(`START ${check[0]}\n`);
      const result = await runCheck(check);
      results.push(result);
      process.stdout.write(`${result.status} ${result.id} (${result.exitCode})\n`);
    }
  });

  await Promise.all(workers);

  results.sort((a, b) => a.id.localeCompare(b.id));
  const manifest = {
    schemaVersion: 1,
    mode: full ? "FULL_FRESH_DISCOVERY" : "DIAGNOSTIC_DISCOVERY",
    generatedAt: new Date().toISOString(),
    evidenceDir,
    results,
    counts: {
      pass: results.filter((r) => r.status === "PASS").length,
      fail: results.filter((r) => r.status === "FAIL").length,
    },
  };

  const manifestPath = path.join(evidenceDir, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  process.stdout.write(`\nEVIDENCE_MANIFEST=${manifestPath}\n`);

  for (const result of results.filter((r) => r.status !== "PASS")) {
    process.stdout.write(`FAILED ${result.id}: ${result.logPath}\n`);
  }

  process.exitCode = manifest.counts.fail > 0 ? 1 : 0;
}

try {
  await main();
} catch (error) {
  const fatalPath = path.join(evidenceDir, "collector-fatal.log");
  writeFileSync(fatalPath, `${error?.stack ?? error}\n`);
  process.stderr.write(`COLLECTOR_FATAL=${fatalPath}\n`);
  process.exitCode = 2;
}