import { execFileSync, spawn } from "node:child_process";
import crypto from "node:crypto";
import { closeSync, constants, createWriteStream, fstatSync, lstatSync, mkdtempSync, openSync, readFileSync, readlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  buildEvidenceEnvelope,
  buildUnifiedRootGraph,
  summarizeEvidenceConsumption,
} from "./lib/evidence-envelope.mjs";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const git = (args, cwd = process.cwd()) => execFileSync("git", args, {
  cwd,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}).trim();
const gitRaw = (args, cwd = process.cwd()) => execFileSync("git", args, {
  cwd,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

const isSafeRelativePath = (root, relativePath) => {
  const absolute = path.resolve(root, relativePath);
  const relative = path.relative(root, absolute);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
};

/**
 * Local discovery runs on the working tree, so HEAD alone is not a candidate
 * identity. Include tracked/staged/unstaged changes and untracked files in a
 * digest so evidence cannot be silently attributed to the wrong source.
 */
export function captureCandidate(root = process.cwd()) {
  const repositoryRoot = path.resolve(root);
  const headSha = git(["rev-parse", "HEAD"], repositoryRoot);
  const status = gitRaw(["status", "--porcelain=v1", "-z"], repositoryRoot);
  const trackedDiff = gitRaw(["diff", "--binary", "--no-ext-diff", "HEAD", "--"], repositoryRoot);
  const untrackedFiles = gitRaw(["ls-files", "--others", "--exclude-standard", "-z"], repositoryRoot)
    .split("\0")
    .filter(Boolean)
    .sort();
  const digest = crypto.createHash("sha256");
  digest.update(`head\0${headSha}\0status\0${status}\0diff\0${trackedDiff}\0`);
  for (const relativePath of untrackedFiles) {
    if (!isSafeRelativePath(repositoryRoot, relativePath)) throw new Error(`unsafe untracked candidate path: ${relativePath}`);
    const absolutePath = path.resolve(repositoryRoot, relativePath);
    let descriptor;
    try {
      descriptor = openSync(absolutePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    } catch (error) {
      const stats = lstatSync(absolutePath);
      if (stats.isSymbolicLink()) {
        digest.update(`untracked\0${relativePath}\0mode\0${stats.mode}\0size\0${stats.size}\0`);
        digest.update(`symlink\0${readlinkSync(absolutePath)}\0`);
        continue;
      }
      if (!stats.isFile()) {
        digest.update(`untracked\0${relativePath}\0mode\0${stats.mode}\0size\0${stats.size}\0`);
        digest.update(`type\0${stats.type}\0`);
        continue;
      }
      throw error;
    }
    {
      try {
        const stableStats = fstatSync(descriptor);
        if (!stableStats.isFile()) throw new Error(`untracked candidate changed type while reading: ${relativePath}`);
        digest.update(`untracked\0${relativePath}\0mode\0${stableStats.mode}\0size\0${stableStats.size}\0`);
        digest.update(readFileSync(descriptor));
      } finally {
        closeSync(descriptor);
      }
    }
  }
  const worktreeSha = digest.digest("hex");
  return {
    headSha,
    worktreeSha,
    candidateIdentity: `${headSha}:${worktreeSha}`,
    dirty: status.length > 0,
    statusEntries: status.split("\0").filter(Boolean).length,
  };
}

const baseChecks = [
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
  ["jscpd", pnpm, ["run", "diagnostics:jscpd"], [".diagnostics/operational-journey-factory/tool-evidence/jscpd/jscpd-report.json"]],
  ["madge", pnpm, ["run", "diagnostics:madge"]],
];

function buildChecks(full) {
  const checks = [...baseChecks];
  if (!full) return checks;
  for (const target of ["typecheck", "lint", "test", "build"]) {
    checks.push([
      `nx-${target}-fresh`,
      pnpm,
      ["exec", "nx", "run-many", "-t", target, "--all", "--outputStyle=stream", "--skip-nx-cache"],
    ]);
  }
  return checks;
}

function runCheck([id, command, commandArgs, nativeEvidencePaths = []], evidenceDir) {
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

    const usesWindowsCommandShim = process.platform === "win32" && /\.(cmd|bat)$/iu.test(command);
    const executable = usesWindowsCommandShim ? (process.env.ComSpec ?? "cmd.exe") : command;
    const executableArgs = usesWindowsCommandShim
      ? ["/d", "/s", "/c", command, ...commandArgs]
      : commandArgs;

    const child = spawn(executable, executableArgs, {
      cwd: process.cwd(),
      env: { ...process.env, NO_COLOR: "1", CI: process.env.CI ?? "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: false,
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
          nativeEvidencePaths,
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
          nativeEvidencePaths,
        },
        `\nEXIT_CODE: ${code}\n`,
      );
    });
  });
}

function parseJsonLine(logText, predicate) {
  for (const line of logText.split(/\r?\n/u)) {
    const candidate = line.trim();
    if (!predicate(candidate)) continue;
    try { return JSON.parse(candidate); } catch { /* raw log remains authoritative evidence */ }
  }
  return null;
}

export function classifyDiscoveryResult(result, logText = "", candidate = {}, nativePayload = null) {
  const envelope = buildEvidenceEnvelope({
    toolId: result.id,
    candidate: {
      headSha: candidate.headSha ?? "",
      baseSha: candidate.baseSha ?? "",
      identity: candidate.candidateIdentity ?? candidate.identity ?? "",
    },
    status: result.status,
    exitCode: result.exitCode,
    rawText: logText,
    nativePayload,
    rawPath: result.logPath,
    claim: `Deep discovery check: ${result.id}`,
    scope: "repository working candidate",
  });
  const item = {
    kind: "check",
    id: result.id,
    status: result.status,
    exitCode: result.exitCode,
    logPath: result.logPath,
    disposition: envelope.findings.some((finding) => finding.material) || envelope.engineConditions.some((condition) => condition.material)
      ? "ROOT_ANALYSIS_REQUIRED"
      : envelope.accounting.evidenceComplete ? "EVIDENCE_ACCOUNTED" : "EVIDENCE_INCOMPLETE",
    rootCandidates: [],
    evidence: {
      logBytes: Buffer.byteLength(logText, "utf8"),
      logSha256: crypto.createHash("sha256").update(logText).digest("hex"),
    },
    envelope,
  };

  const candidates = [...envelope.findings, ...envelope.engineConditions]
    .filter((entry) => entry.material !== false && entry.rootCandidate?.rootKey);
  const groupedCandidates = new Map();
  for (const entry of candidates) {
    const root = entry.rootCandidate;
    const current = groupedCandidates.get(root.rootKey) ?? {
      root: root.rootKey,
      rootFamily: root.rootFamily,
      canonicalOwnerHint: root.canonicalOwnerHint,
      source: result.id,
      findingCount: 0,
      files: [],
      rules: [],
    };
    current.findingCount += 1;
    current.files.push(entry.location?.path ?? "");
    current.rules.push(entry.ruleId ?? "");
    groupedCandidates.set(root.rootKey, current);
  }
  item.rootCandidates = [...groupedCandidates.values()].map((candidateRoot) => ({
    ...candidateRoot,
    files: [...new Set(candidateRoot.files.filter(Boolean))],
    rules: [...new Set(candidateRoot.rules.filter(Boolean))],
  }));

  if (result.status === "PASS" && item.rootCandidates.length === 0) return item;

  if (result.id === "knip") {
    const payload = parseJsonLine(logText, (line) => line.startsWith("{\"issues\":"));
    const issues = Array.isArray(payload?.issues) ? payload.issues : [];
    item.failureClass = "STRUCTURAL_UNUSED_OR_OWNERLESS_ARTIFACT";
    item.specializedEvidence = {
      root: "unused-or-ownerless-artifacts",
      source: "knip",
      issueCount: issues.length,
      files: issues.map((issue) => issue.file).filter(Boolean),
      dependencyCount: issues.reduce((count, issue) => count + Object.values(issue)
        .filter(Array.isArray)
        .reduce((total, entries) => total + entries.length, 0), 0),
    };
  } else if (result.id === "madge") {
    const cycles = [...logText.matchAll(/^\s*\d+\)\s+(.+)$/gmu)].map((match) => match[1]);
    const skipped = Number(logText.match(/Skipped (\d+) files/u)?.[1] ?? 0);
    const skippedImports = logText.match(/Skipped \d+ files\s*\r?\n([\s\S]*?)(?=\r?\n(?:- Finding files|√|EXIT_CODE:)|$)/u)?.[1]
      ?.split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean) ?? [];
    item.failureClass = cycles.length > 0 && skippedImports.length > 0
      ? "STRUCTURAL_CYCLE_AND_UNRESOLVED_IMPORT"
      : cycles.length > 0
        ? "STRUCTURAL_CYCLE"
        : skippedImports.length > 0
          ? "STRUCTURAL_UNRESOLVED_IMPORT"
          : "STRUCTURAL_CYCLE_OR_UNRESOLVED_IMPORT";
    item.specializedEvidence = {
      root: "frontend-dependency-graph-integrity",
      source: "madge",
      circularDependencies: cycles,
      skippedFiles: skipped,
      skippedImports,
    };
  } else {
    item.failureClass = item.rootCandidates.length > 0
      ? [...new Set(item.rootCandidates.map((candidateRoot) => candidateRoot.rootFamily))].join("+")
      : "TOOL_EVIDENCE_INCOMPLETE";
    item.evidence.errorLines = logText.split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => /error|fail|missing|skipped|unresolved|warning/iu.test(line))
      .slice(-50);
  }
  return item;
}

export function buildEphemeralRootGraph(evidenceItems, candidateIdentity) {
  const envelopes = evidenceItems.map((item) => ({
    ...item.envelope,
    candidate: {...item.envelope.candidate, identity: item.candidateIdentity ?? candidateIdentity},
  }));
  return buildUnifiedRootGraph(envelopes, candidateIdentity);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const full = args.has("--full");
  const concurrencyArg = process.argv.find((v) => v.startsWith("--concurrency="));
  // Full discovery runs multiple Nx commands that share the package-json plugin
  // worker; serialize that phase so the evidence reflects the repository rather
  // than a worker-start race between concurrent Nx processes.
  const concurrency = full ? 1 : Math.max(1, Number(concurrencyArg?.split("=")[1] ?? 3));
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const evidenceDir = mkdtempSync(path.join(tmpdir(), `bthwani-deep-discovery-${stamp}-`));
  const candidate = captureCandidate();
  const candidateSha = candidate.headSha;
  const pending = [...buildChecks(full)];
  const results = [];
  const workers = Array.from({ length: Math.min(concurrency, pending.length) }, async () => {
    while (pending.length) {
      const check = pending.shift();
      if (!check) return;
      process.stdout.write(`START ${check[0]}\n`);
      const result = await runCheck(check, evidenceDir);
      results.push(result);
      process.stdout.write(`${result.status} ${result.id} (${result.exitCode})\n`);
    }
  });

  await Promise.all(workers);

  const endingCandidate = captureCandidate();
  if (endingCandidate.candidateIdentity !== candidate.candidateIdentity) {
    results.push({
      id: "candidate-stability",
      status: "FAIL",
      exitCode: 1,
      logPath: "",
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      error: `Candidate moved during discovery: ${candidate.candidateIdentity} -> ${endingCandidate.candidateIdentity}`,
    });
  }

  results.sort((a, b) => a.id.localeCompare(b.id));
  const evidenceItems = results.map((result) => {
    const logText = result.logPath ? readFileSync(result.logPath, "utf8") : result.error ?? "";
    let nativePayload = null;
    if (result.nativeEvidencePaths?.length) {
      const nativePath = result.nativeEvidencePaths.map((relative) => path.resolve(relative)).find((file) => {
        try { return lstatSync(file).isFile(); } catch { return false; }
      });
      if (nativePath) {
        try { nativePayload = JSON.parse(readFileSync(nativePath, "utf8")); }
        catch (error) { nativePayload = {evidenceComplete: false, errors: [`${nativePath}: invalid JSON: ${error.message}`]}; }
      } else {
        nativePayload = {evidenceComplete: false, errors: [`${result.id}: required native evidence output is missing`]};
      }
    }
    return {
      ...classifyDiscoveryResult(result, logText, candidate, nativePayload),
      candidateIdentity: candidate.candidateIdentity,
    };
  });
  const rootAnalysisRequired = evidenceItems.filter((item) => item.rootCandidates.length > 0).length;
  const rootGraph = buildEphemeralRootGraph(evidenceItems, candidate.candidateIdentity);
  const evidenceConsumption = summarizeEvidenceConsumption(evidenceItems.map((item) => item.envelope), rootGraph);
  const manifest = {
    schemaVersion: 2,
    mode: full ? "FULL_FRESH_DISCOVERY" : "DIAGNOSTIC_DISCOVERY",
    generatedAt: new Date().toISOString(),
    evidenceDir,
    candidateSha,
    candidateWorktreeSha: candidate.worktreeSha,
    candidateIdentity: candidate.candidateIdentity,
    candidateDirty: candidate.dirty,
    candidateStatusEntries: candidate.statusEntries,
    results,
    evidenceLifecycle: {
      stage: "PROCESSED",
      disposition: rootAnalysisRequired === 0 ? "EXECUTION_EVIDENCE_ACCOUNTED" : "ROOT_MAPPING_REQUIRED",
      rootGraph: "CANDIDATE_ROOT_FAMILIES_ONLY",
      nextAction: rootAnalysisRequired === 0 ? "RE_DIAGNOSE_AND_RERANK" : "PROVE_SOURCE_OF_FIX_AND_TREAT",
      closureClaim: false,
    },
    evidenceItems,
    evidenceConsumption,
    rootGraph,
    counts: {
      pass: results.filter((r) => r.status === "PASS").length,
      fail: results.filter((r) => r.status === "FAIL").length,
      rootAnalysisRequired,
    },
  };

  const manifestPath = path.join(evidenceDir, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  process.stdout.write(`\nEVIDENCE_MANIFEST=${manifestPath}\n`);

  for (const result of results.filter((r) => r.status !== "PASS")) {
    process.stdout.write(`FAILED ${result.id}: ${result.logPath}\n`);
  }

  process.exitCode = manifest.counts.fail > 0 || !evidenceConsumption.allToolEvidenceConsumed || rootGraph.rootQueue.length > 0 ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  try {
    await main();
  } catch (error) {
    const stamp = new Date().toISOString().replaceAll(":", "-");
    const evidenceDir = mkdtempSync(path.join(tmpdir(), `bthwani-deep-discovery-fatal-${stamp}-`));
    const fatalPath = path.join(evidenceDir, "collector-fatal.log");
    writeFileSync(fatalPath, `${error?.stack ?? error}\n`);
    process.stderr.write(`COLLECTOR_FATAL=${fatalPath}\n`);
    process.exitCode = 2;
  }
}
