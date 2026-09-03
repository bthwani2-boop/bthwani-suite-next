#!/usr/bin/env node
/**
 * check-eugene-migrations.mjs — bounded-acceptance gate for Eugene migration
 * lock-safety findings.
 *
 * Doctrine: applied migration files are immutable (migration-amendments.json
 * policy: IMMUTABLE_AFTER_APPLY). Their lock-safety findings are frozen
 * historical facts that cannot be retroactively fixed. This gate therefore:
 *   - lints every migration file in the given directories with the pinned
 *     Eugene binary (pure syntax-tree analysis, no database required);
 *   - fails CLOSED on any finding NOT present in the checked-in baseline
 *     ledger (new migrations or edited statements introduce new debt -> red);
 *   - accepts baseline entries as bounded, documented historical debt.
 *
 * Usage:
 *   node tools/scripts/check-eugene-migrations.mjs --directory <dir> [--directory <dir2>...]
 *   node tools/scripts/check-eugene-migrations.mjs --regenerate --directory <dir>...
 *
 * Regeneration policy: the baseline may only be regenerated when a governed
 * migration amendment (tools/verification/migration-amendments.json) removed
 * historical findings, or when linting coverage is intentionally extended.
 * Regenerating to "make CI green" without removing the underlying findings is
 * a governance violation.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";

const baselineRelative = "tools/verification/eugene-migration-baseline.json";

function parseArgs(argv) {
  const args = { directories: [], regenerate: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--directory" || argv[i] === "-d") {
      args.directories.push(argv[(i += 1)]);
    } else if (argv[i] === "--regenerate") {
      args.regenerate = true;
    } else {
      console.error(`unknown argument: ${argv[i]}`);
      process.exit(2);
    }
  }
  if (args.directories.length === 0) {
    console.error("usage: check-eugene-migrations.mjs --directory <dir> [--regenerate]");
    process.exit(2);
  }
  return args;
}

function eugeneBinary() {
  if (process.platform === "win32") {
    try {
      execFileSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "eugene", "--version"], { stdio: "ignore" });
      return "eugene";
    } catch {
      // not on path
    }
  } else {
    for (const candidate of ["eugene", path.join(process.env.RUNNER_TEMP || "", "eugene")]) {
      if (!candidate) continue;
      try {
        execFileSync(candidate, ["--version"], { stdio: "ignore" });
        return candidate;
      } catch {
        // try next candidate
      }
    }
  }
  console.error("eugene binary is not available on PATH (expected pinned 0.8.3)");
  process.exit(2);
}

function lintFile(binary, file) {
  const normalizedFile = file.replace(/\\/g, "/");
  // eugene lint exits non-zero when findings exist; capture stdout for parsing.
  let stdout = "";
  try {
    if (process.platform === "win32") {
      stdout = execFileSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", binary, "lint", normalizedFile], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } else {
      stdout = execFileSync(binary, ["lint", normalizedFile], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    }
  } catch (error) {
    stdout = `${error.stdout || ""}`;
    if (!stdout && error.stderr) {
      // Hard parse/runtime failure (not a findings list) — fail closed loudly.
      console.error(`eugene lint failed for ${normalizedFile}: ${error.stderr}`);
      process.exit(2);
    }
  }
  const findings = [];
  for (const line of stdout.split("\n")) {
    const match = line.match(/^(.*?):(\d+)\s+(E\d+|W\d+)\s+(.*)$/);
    if (match) {
      findings.push({ file: match[1].replace(/\\/g, "/"), line: Number(match[2]), hintId: match[3], message: match[4].trim() });
    }
  }
  return findings;
}

function keyOf(finding) {
  return `${finding.file}::${finding.line}::${finding.hintId}`;
}

const args = parseArgs(process.argv.slice(2));
const binary = eugeneBinary();
const baselinePath = path.join(repoRoot, baselineRelative);
const baseline = fs.existsSync(baselinePath)
  ? JSON.parse(fs.readFileSync(baselinePath, "utf8"))
  : { findings: [] };
const acceptedKeys = new Set((baseline.findings || []).map(keyOf));

const allFiles = [];
for (const directory of args.directories) {
  for (const file of fs.readdirSync(path.join(repoRoot, directory), { withFileTypes: true })) {
    if (file.isFile() && file.name.endsWith(".sql")) {
      allFiles.push(path.join(directory, file.name));
    }
  }
}

const collected = [];
for (const relativeFile of allFiles.sort()) {
  const absolute = path.join(repoRoot, relativeFile);
  for (const finding of lintFile(binary, relativeFile)) {
    collected.push({ ...finding, file: relativeFile });
  }
  void absolute;
}

if (args.regenerate) {
  const next = {
    schemaVersion: 1,
    policy: {
      doctrine:
        "Applied migration files are immutable; their Eugene lock-safety findings are frozen historical facts. This ledger records the bounded accepted debt. The gate fails closed on any finding not listed here. Regeneration is allowed only when governed migration amendments removed the underlying findings or coverage was intentionally extended.",
      eugeneVersion: "0.8.3",
      generatedAt: new Date().toISOString(),
    },
    findings: collected.map((f) => ({ file: f.file, line: f.line, hintId: f.hintId, message: f.message })),
  };
  fs.writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`baseline regenerated: ${collected.length} findings across ${allFiles.length} migration files`);
  process.exit(0);
}

const newFindings = collected.filter((f) => !acceptedKeys.has(keyOf(f)));
const lintedDirPrefixes = args.directories.map((d) => `${d.replace(/\/+$/, "")}/`);
const wasLinted = (file) => lintedDirPrefixes.some((prefix) => file.startsWith(prefix));
const producedKeys = new Set(collected.map(keyOf));
const staleKeys = [...acceptedKeys].filter((k) => wasLinted(k.split("::")[0]) && !producedKeys.has(k));

if (newFindings.length > 0) {
  console.error(`eugene-baseline: FAIL — ${newFindings.length} new lock-safety finding(s) not in the accepted baseline:`);
  for (const f of newFindings) {
    console.error(`  ${f.file}:${f.line} ${f.hintId} ${f.message}`);
  }
  console.error("New migrations must be written to avoid these lock-safety hints (see https://kaveland.no/eugene/hints/).");
  process.exit(1);
}

if (staleKeys.length > 0) {
  console.error(`eugene-baseline: baseline contains ${staleKeys.length} stale entries no longer produced (drift).`);
  console.error("Regenerate the baseline via the governed regeneration policy to keep the ledger exact.");
  process.exit(1);
}

console.log(`eugene-baseline: PASS — ${collected.length} accepted historical findings, 0 new, ${allFiles.length} files linted.`);
