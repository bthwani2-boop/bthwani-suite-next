#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const MAX_CONCURRENCY = 8;

function parseArguments(argv) {
  let concurrency = 2;
  const guards = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--concurrency") {
      concurrency = Number(argv[++index]);
      continue;
    }
    if (argument.startsWith("--concurrency=")) {
      concurrency = Number(argument.slice("--concurrency=".length));
      continue;
    }
    guards.push(argument);
  }

  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > MAX_CONCURRENCY) {
    throw new Error(`--concurrency must be an integer between 1 and ${MAX_CONCURRENCY}`);
  }
  if (guards.length === 0) throw new Error("At least one guard path is required");

  const normalized = guards.map((guard) => guard.replaceAll("\\", "/").replace(/^\.\//, ""));
  for (const guard of normalized) {
    if (!guard.startsWith("tools/guards/") || guard.includes("..") || !guard.endsWith(".mjs")) {
      throw new Error(`Guard path is outside the supported guard surface: ${guard}`);
    }
  }

  return { concurrency: Math.min(concurrency, normalized.length), guards: normalized };
}

function runGuard(guard) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(process.execPath, [guard], {
      cwd: repositoryRoot,
      stdio: "inherit",
      shell: false,
      windowsHide: true,
    });

    child.once("error", (error) => resolve({ guard, status: 1, error, elapsedMs: Date.now() - startedAt }));
    child.once("close", (status, signal) => resolve({ guard, status: status ?? 1, signal, elapsedMs: Date.now() - startedAt }));
  });
}

async function runSuite({ concurrency, guards }) {
  const results = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < guards.length) {
      const index = nextIndex;
      nextIndex += 1;
      const guard = guards[index];
      console.log(`[guard-suite] start ${guard}`);
      const result = await runGuard(guard);
      results[index] = result;
      const outcome = result.status === 0 ? "PASS" : "FAIL";
      console.log(`[guard-suite] ${outcome} ${guard} (${(result.elapsedMs / 1000).toFixed(2)}s)`);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

try {
  const options = parseArguments(process.argv.slice(2));
  const results = await runSuite(options);
  const failures = results.filter((result) => result.status !== 0);
  if (failures.length > 0) {
    for (const failure of failures) {
      const detail = failure.error?.message || (failure.signal ? `signal=${failure.signal}` : `exit=${failure.status}`);
      console.error(`[guard-suite] failed guard=${failure.guard} ${detail}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`[guard-suite] all ${results.length} guards passed with concurrency=${options.concurrency}`);
  }
} catch (error) {
  console.error(`[guard-suite] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
