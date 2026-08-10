import { execFileSync, spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ZERO_SHA = /^0+$/;
const REPORT_DIR = ".sonar/node-coverage";
const FINAL_REPORT = `${REPORT_DIR}/lcov.info`;
const OWNERSHIP_MANIFEST = "tools/verification/ownership.manifest.json";
const JS_TS_SOURCE = /\.(?:[cm]?[jt]sx?)$/i;

function normalizePath(value) {
  return String(value ?? "").trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function requireStringArray(value, label, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new Error(`${label} must be ${allowEmpty ? "an" : "a non-empty"} array`);
  }
  const normalized = uniqueSorted(value.map(normalizePath));
  if (normalized.length !== value.length || normalized.some((item) => !item)) {
    throw new Error(`${label} must contain unique non-empty strings`);
  }
  return normalized;
}

function requireOrderedCommandArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty ordered command array`);
  }
  const command = value.map((item) => String(item ?? "").trim());
  if (command.some((item) => !item)) {
    throw new Error(`${label} must contain only non-empty command tokens`);
  }
  return command;
}

export function loadCoverageOwnershipModel(manifestPath = path.resolve(repoRoot, OWNERSHIP_MANIFEST)) {
  if (!existsSync(manifestPath)) throw new Error(`Coverage ownership manifest is missing: ${OWNERSHIP_MANIFEST}`);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(`Coverage ownership manifest is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (manifest?.schemaVersion !== 1) throw new Error("Coverage ownership manifest schemaVersion must be 1");
  if (!manifest.projects || typeof manifest.projects !== "object" || Array.isArray(manifest.projects)) {
    throw new Error("Coverage ownership manifest projects must be an object");
  }

  const projects = {};
  const sourceAuthorities = [];
  const suites = {};
  for (const [name, raw] of Object.entries(manifest.projects)) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new Error(`Invalid ownership project name '${name}'`);
    const sourcePrefixes = requireStringArray(raw?.sourcePrefixes, `projects.${name}.sourcePrefixes`);
    const coverage = raw?.coverage;
    if (!coverage || !["node-lcov", "required"].includes(coverage.strategy)) {
      throw new Error(`projects.${name}.coverage.strategy must be node-lcov or required`);
    }
    const project = {
      name,
      root: normalizePath(raw.root),
      sourcePrefixes,
      strategy: coverage.strategy,
      reason: String(coverage.reason ?? "").trim(),
    };
    if (!project.root) throw new Error(`projects.${name}.root is required`);
    if (coverage.strategy === "required" && !project.reason) {
      throw new Error(`projects.${name}.coverage.reason is required for unresolved coverage ownership`);
    }
    if (coverage.strategy === "node-lcov") {
      const testRoots = requireStringArray(coverage.testRoots, `projects.${name}.coverage.testRoots`);
      const cwd = normalizePath(coverage.cwd ?? raw.root ?? ".") || ".";
      const prepare = coverage.prepare === undefined
        ? null
        : requireOrderedCommandArray(coverage.prepare, `projects.${name}.coverage.prepare`);
      suites[name] = { ...project, cwd, testRoots, prepare };
    }
    projects[name] = project;
    for (const prefix of sourcePrefixes) sourceAuthorities.push({ prefix, project });
  }

  const sonar = manifest.sonar ?? {};
  const governedRoots = requireStringArray(
    sonar.governedJavaScriptTypeScriptRoots,
    "sonar.governedJavaScriptTypeScriptRoots",
  );
  const verificationPrefixes = requireStringArray(
    sonar.verificationPrefixes ?? [],
    "sonar.verificationPrefixes",
    { allowEmpty: true },
  );
  const generatedPrefixes = requireStringArray(
    sonar.generatedPrefixes ?? [],
    "sonar.generatedPrefixes",
    { allowEmpty: true },
  );

  return {
    manifest,
    projects,
    suites,
    allSuites: Object.keys(suites).sort(),
    sourceAuthorities: sourceAuthorities.sort((a, b) => b.prefix.length - a.prefix.length),
    governedRoots,
    verificationPrefixes,
    generatedPrefixes,
  };
}

const ownershipModel = loadCoverageOwnershipModel();
const suiteDefinitions = ownershipModel.suites;
const ALL_SUITES = ownershipModel.allSuites;

function isUnderPrefix(file, prefix) {
  return file === prefix.replace(/\/$/, "") || file.startsWith(prefix);
}

function isVerificationOrGenerated(file) {
  if (file.includes("/node_modules/") || file.includes("/generated/") || /\.d\.ts$/i.test(file)) return true;
  if (ownershipModel.verificationPrefixes.some((prefix) => isUnderPrefix(file, prefix))) return true;
  if (ownershipModel.generatedPrefixes.some((prefix) => isUnderPrefix(file, prefix))) return true;
  if (/(?:^|\/)tests?\//i.test(file) || /\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(file)) return true;
  return false;
}

function findSourceAuthority(file) {
  return ownershipModel.sourceAuthorities.find(({ prefix }) => isUnderPrefix(file, prefix)) ?? null;
}

export function assertChangedExecutableCoverageOwnership(inputFiles) {
  const files = uniqueSorted(inputFiles.map(normalizePath));
  const failures = [];
  for (const file of files) {
    if (!JS_TS_SOURCE.test(file) || isVerificationOrGenerated(file)) continue;
    if (!ownershipModel.governedRoots.some((prefix) => isUnderPrefix(file, prefix))) continue;
    const authority = findSourceAuthority(file);
    if (!authority) {
      failures.push(`${file}: no project owns this executable JS/TS source`);
      continue;
    }
    if (authority.project.strategy !== "node-lcov") {
      failures.push(`${file}: ${authority.project.name} has no executable LCOV suite (${authority.project.reason})`);
    }
  }
  if (failures.length > 0) {
    throw new Error(`Sonar coverage ownership is incomplete:\n- ${failures.join("\n- ")}`);
  }
}

function selfVerificationRequested(files) {
  return files.some((file) =>
    file === "package.json" ||
    file === "pnpm-lock.yaml" ||
    file === "pnpm-workspace.yaml" ||
    file === "tsconfig.base.json" ||
    file === "sonar-project.properties" ||
    file === ".github/workflows/sonarqube.yml" ||
    file === ".github/actions/setup-node-workspace/action.yml" ||
    file === OWNERSHIP_MANIFEST ||
    file === "tools/scripts/generate-sonar-node-coverage.mjs" ||
    file === "tools/scripts/generate-sonar-node-coverage.test.mjs"
  );
}

export function planCoverageSuites(inputFiles, { mode = "affected" } = {}) {
  const files = uniqueSorted(inputFiles.map(normalizePath));
  assertChangedExecutableCoverageOwnership(files);
  if (String(mode).toLowerCase() === "full" || selfVerificationRequested(files)) return [...ALL_SUITES];

  const suites = [];
  for (const [suiteName, definition] of Object.entries(suiteDefinitions)) {
    const affected = files.some((file) =>
      definition.sourcePrefixes.some((prefix) => isUnderPrefix(file, prefix)) ||
      definition.testRoots.some((prefix) => isUnderPrefix(file, prefix)) ||
      file === `${definition.root}/package.json` ||
      file === `${definition.root}/project.json` ||
      file === `${definition.root}/tsconfig.json`
    );
    if (affected) suites.push(suiteName);
  }
  return suites.sort();
}

function readChangedFiles(baseSha, headSha) {
  const validBase = baseSha && !ZERO_SHA.test(baseSha) && baseSha !== headSha;
  const args = validBase
    ? ["diff", "--name-only", "--diff-filter=ACMRDTUXB", baseSha, headSha, "--"]
    : ["show", "--pretty=format:", "--name-only", headSha || "HEAD", "--"];
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" })
    .split(/\r?\n/)
    .map(normalizePath)
    .filter(Boolean);
}

function writeOutputs(values) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  const lines = Object.entries(values).map(([key, value]) => `${key}=${String(value ?? "")}`);
  appendFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
}

function discoverTests(root) {
  const files = [];
  if (!existsSync(root)) return files;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...discoverTests(absolute));
    else if (entry.isFile() && /\.test\.mjs$/i.test(entry.name)) files.push(absolute);
  }
  return files.sort();
}

function discoverSuiteTests(definition) {
  return uniqueSorted(
    definition.testRoots.flatMap((root) => discoverTests(path.resolve(repoRoot, root))),
  );
}

function executableFor(command) {
  if (process.platform !== "win32") return command;
  if (command === "pnpm") return "pnpm.cmd";
  return command;
}

function runCommand(command, args, options = {}) {
  const executable = executableFor(command);
  process.stdout.write(`===== ${executable} ${args.join(" ")} =====\n`);
  const result = spawnSync(executable, args, {
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, CI: "1", ...options.env },
    stdio: "inherit",
    windowsHide: true,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${executable} exited with status ${result.status}`);
}

function resolveLcovSource(source, suiteCwd) {
  let candidate = String(source ?? "").trim();
  if (!candidate || candidate.startsWith("data:") || candidate.startsWith("node:")) return null;
  if (candidate.startsWith("file:")) {
    try {
      candidate = fileURLToPath(candidate);
    } catch {
      return null;
    }
  }
  const attempts = path.isAbsolute(candidate)
    ? [candidate]
    : [path.resolve(suiteCwd, candidate), path.resolve(repoRoot, candidate)];
  for (const absolute of attempts) {
    const relative = normalizePath(path.relative(repoRoot, absolute));
    if (!relative || relative.startsWith("../") || path.isAbsolute(relative)) continue;
    if (existsSync(absolute) && statSync(absolute).isFile()) return { absolute, relative };
  }
  return null;
}

function sourceLineCount(absolute) {
  const source = readFileSync(absolute, "utf8");
  if (source.length === 0) return 0;
  const lines = source.split(/\r\n|\r|\n/).length;
  return /(?:\r\n|\r|\n)$/.test(source) ? lines - 1 : lines;
}

export function validateLcovLineMappings(lines, absolute, source) {
  const maxLine = sourceLineCount(absolute);
  for (const line of lines) {
    const match = /^(DA|BRDA):(\d+)(?:,|$)/.exec(line);
    if (!match) continue;
    const lineNumber = Number.parseInt(match[2], 10);
    if (!Number.isSafeInteger(lineNumber) || lineNumber < 1 || lineNumber > maxLine) {
      throw new Error(`LCOV ${match[1]} line ${match[2]} is outside ${source} (source lines=${maxLine})`);
    }
  }
}

function parseNonNegativeInteger(value, label) {
  if (!/^\d+$/.test(String(value ?? ""))) throw new Error(`Invalid LCOV ${label}: ${value}`);
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`Invalid LCOV ${label}: ${value}`);
  return parsed;
}

function addSafeIntegers(left, right, label) {
  const sum = left + right;
  if (!Number.isSafeInteger(sum) || sum < 0) throw new Error(`LCOV ${label} hit count overflow`);
  return sum;
}

function parseLcovRecord(record) {
  const state = { source: "", branches: new Map(), lines: new Map() };
  for (const rawLine of String(record ?? "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line === "end_of_record" || line.startsWith("TN:")) continue;
    if (line.startsWith("SF:")) {
      const source = normalizePath(line.slice(3));
      if (!source) throw new Error("LCOV record has an empty SF field");
      if (state.source && state.source !== source) throw new Error("LCOV record contains multiple SF fields");
      state.source = source;
      continue;
    }
    if (line.startsWith("FN:") || line.startsWith("FNDA:") || /^(?:FNF|FNH):\d+$/.test(line)) continue;
    if (line.startsWith("BRDA:")) {
      const match = /^BRDA:(undefined|\d+),([^,]+),([^,]+),(-|\d+)$/.exec(line);
      if (!match) throw new Error(`Invalid LCOV BRDA field: ${line}`);
      if (match[1] === "undefined") continue;
      const lineNumber = parseNonNegativeInteger(match[1], "BRDA line");
      const key = `${lineNumber},${match[2]},${match[3]}`;
      const existing = state.branches.get(key);
      const taken = match[4] === "-" ? null : parseNonNegativeInteger(match[4], "BRDA taken");
      if (existing === undefined) state.branches.set(key, taken);
      else if (taken !== null) state.branches.set(key, addSafeIntegers(existing ?? 0, taken, "BRDA"));
      continue;
    }
    if (line.startsWith("DA:")) {
      const match = /^DA:(\d+),(\d+)(?:,([^,]+))?$/.exec(line);
      if (!match) throw new Error(`Invalid LCOV DA field: ${line}`);
      const lineNumber = parseNonNegativeInteger(match[1], "DA line");
      const hits = parseNonNegativeInteger(match[2], "DA hits");
      const checksum = match[3] ?? "";
      const existing = state.lines.get(lineNumber);
      if (existing?.checksum && checksum && existing.checksum !== checksum) {
        throw new Error(`LCOV line ${lineNumber} has conflicting checksums`);
      }
      state.lines.set(lineNumber, {
        hits: addSafeIntegers(existing?.hits ?? 0, hits, "DA"),
        checksum: existing?.checksum || checksum,
      });
      continue;
    }
    if (/^(?:BRF|BRH|LF|LH):\d+$/.test(line)) continue;
    throw new Error(`Unsupported LCOV field: ${line}`);
  }
  if (!state.source) throw new Error("LCOV record is missing SF");
  return state;
}

function mergeParsedLcov(target, incoming) {
  if (target.source !== incoming.source) throw new Error("Cannot merge different LCOV sources");
  for (const [key, taken] of incoming.branches) {
    const existing = target.branches.get(key);
    if (existing === undefined) target.branches.set(key, taken);
    else if (taken !== null) target.branches.set(key, addSafeIntegers(existing ?? 0, taken, "BRDA"));
  }
  for (const [lineNumber, value] of incoming.lines) {
    const existing = target.lines.get(lineNumber);
    if (existing?.checksum && value.checksum && existing.checksum !== value.checksum) {
      throw new Error(`LCOV line ${lineNumber} has conflicting checksums`);
    }
    target.lines.set(lineNumber, {
      hits: addSafeIntegers(existing?.hits ?? 0, value.hits, "DA"),
      checksum: existing?.checksum || value.checksum,
    });
  }
  return target;
}

function serializeParsedLcov(state) {
  const branchEntries = [...state.branches.entries()].sort((a, b) => {
    const [aLine, aBlock, aBranch] = a[0].split(",");
    const [bLine, bBlock, bBranch] = b[0].split(",");
    return Number(aLine) - Number(bLine) || aBlock.localeCompare(bBlock) || aBranch.localeCompare(bBranch);
  });
  const lineEntries = [...state.lines.entries()].sort((a, b) => a[0] - b[0]);
  const output = ["TN:", `SF:${state.source}`];
  for (const [key, taken] of branchEntries) output.push(`BRDA:${key},${taken === null ? "-" : taken}`);
  if (branchEntries.length > 0) {
    output.push(`BRF:${branchEntries.length}`);
    output.push(`BRH:${branchEntries.filter(([, taken]) => taken !== null && taken > 0).length}`);
  }
  for (const [lineNumber, value] of lineEntries) {
    output.push(`DA:${lineNumber},${value.hits}${value.checksum ? `,${value.checksum}` : ""}`);
  }
  output.push(`LF:${lineEntries.length}`);
  output.push(`LH:${lineEntries.filter(([, value]) => value.hits > 0).length}`);
  output.push("end_of_record");
  return `${output.join("\n")}\n`;
}

export function mergeLcovRecords(records) {
  const grouped = new Map();
  for (const record of records) {
    const parsed = parseLcovRecord(record);
    const existing = grouped.get(parsed.source);
    grouped.set(parsed.source, existing ? mergeParsedLcov(existing, parsed) : parsed);
  }
  return [...grouped.values()]
    .sort((a, b) => a.source.localeCompare(b.source))
    .map((state) => {
      const serialized = serializeParsedLcov(state);
      const absolute = path.resolve(repoRoot, state.source);
      if (!existsSync(absolute) || !statSync(absolute).isFile()) {
        throw new Error(`Merged LCOV source does not exist: ${state.source}`);
      }
      validateLcovLineMappings(serialized.split(/\r?\n/), absolute, state.source);
      return serialized;
    });
}

export function filterLcov(rawLcov, suiteName, suiteCwd = repoRoot) {
  const definition = suiteDefinitions[suiteName];
  if (!definition) throw new Error(`Unknown Sonar coverage suite '${suiteName}'`);
  const records = String(rawLcov ?? "")
    .split(/end_of_record\s*/g)
    .map((record) => record.trim())
    .filter(Boolean);
  const retained = [];
  for (const record of records) {
    const lines = record.split(/\r?\n/);
    const sfIndex = lines.findIndex((line) => line.startsWith("SF:"));
    if (sfIndex < 0) continue;
    const resolved = resolveLcovSource(lines[sfIndex].slice(3), suiteCwd);
    if (!resolved) continue;
    const source = resolved.relative;
    if (!JS_TS_SOURCE.test(source) || /\.d\.ts$/i.test(source)) continue;
    if (isVerificationOrGenerated(source)) continue;
    if (!definition.sourcePrefixes.some((prefix) => isUnderPrefix(source, prefix))) continue;
    validateLcovLineMappings(lines, resolved.absolute, source);
    lines[sfIndex] = `SF:${source}`;
    retained.push(`${lines.join("\n")}\nend_of_record\n`);
  }
  return retained;
}

function prepareSuite(suiteName) {
  const definition = suiteDefinitions[suiteName];
  if (!definition?.prepare) return;
  const [command, ...args] = definition.prepare;
  runCommand(command, args, { cwd: repoRoot });
}

function executeSuite(suiteName, reportDir) {
  const definition = suiteDefinitions[suiteName];
  if (!definition) throw new Error(`Unknown Sonar coverage suite '${suiteName}'`);
  prepareSuite(suiteName);
  const testCwd = path.resolve(repoRoot, definition.cwd);
  const tests = discoverSuiteTests(definition);
  if (tests.length === 0) throw new Error(`${suiteName}: no node:test files found in governed test roots`);
  const rawReport = path.join(reportDir, `${suiteName}.raw.lcov`);
  const testArgs = tests.map((file) => path.relative(testCwd, file));
  runCommand(process.execPath, [
    "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
    "--enable-source-maps",
    "--test",
    "--experimental-test-coverage",
    "--test-reporter=spec",
    "--test-reporter=lcov",
    "--test-reporter-destination=stdout",
    `--test-reporter-destination=${rawReport}`,
    ...testArgs,
  ], { cwd: testCwd });
  if (!existsSync(rawReport)) throw new Error(`${suiteName}: Node did not produce ${rawReport}`);
  const retained = filterLcov(readFileSync(rawReport, "utf8"), suiteName, testCwd);
  if (retained.length === 0) {
    throw new Error(`${suiteName}: coverage ran but no source owned by this suite was executed`);
  }
  return retained;
}

function resolveSuites() {
  const explicit = String(process.env.SONAR_NODE_COVERAGE_SUITES ?? "").trim();
  if (explicit) {
    const suites = uniqueSorted(explicit.split(",").map((value) => value.trim()));
    for (const suite of suites) {
      if (!suiteDefinitions[suite]) throw new Error(`Unknown SONAR_NODE_COVERAGE_SUITES entry '${suite}'`);
    }
    return suites;
  }
  const baseSha = String(process.env.CI_BASE_SHA ?? "").trim();
  const headSha = String(process.env.CI_HEAD_SHA ?? "HEAD").trim() || "HEAD";
  const mode = String(process.env.CI_MODE ?? "affected").trim() || "affected";
  return planCoverageSuites(readChangedFiles(baseSha, headSha), { mode });
}

function plan() {
  const suites = resolveSuites();
  const required = suites.length > 0;
  const values = {
    required: required ? "true" : "false",
    suites: suites.join(","),
    report_path: required ? FINAL_REPORT : "",
  };
  writeOutputs(values);
  process.stdout.write(`${JSON.stringify(values, null, 2)}\n`);
}

function generate() {
  const suites = resolveSuites();
  if (suites.length === 0) {
    writeOutputs({ report_path: "", scan_args: "", source_records: "0" });
    process.stdout.write("Sonar Node coverage: no executable source suite is affected.\n");
    return;
  }
  const reportDir = path.resolve(repoRoot, REPORT_DIR);
  rmSync(reportDir, { recursive: true, force: true });
  mkdirSync(reportDir, { recursive: true });
  const records = [];
  for (const suite of suites) {
    process.stdout.write(`\n=== Sonar Node coverage suite: ${suite} ===\n`);
    records.push(...executeSuite(suite, reportDir));
  }
  if (records.length === 0) throw new Error("Sonar Node coverage produced no real source records");
  const mergedRecords = mergeLcovRecords(records);
  if (mergedRecords.length === 0) throw new Error("Sonar Node coverage merge produced no source records");
  const finalReport = path.resolve(repoRoot, FINAL_REPORT);
  writeFileSync(finalReport, mergedRecords.join(""), "utf8");
  const scanArgs = `-Dsonar.javascript.lcov.reportPaths=${FINAL_REPORT}`;
  writeOutputs({
    report_path: FINAL_REPORT,
    scan_args: scanArgs,
    source_records: String(mergedRecords.length),
  });
  process.stdout.write(
    `Sonar Node coverage: PASS suites=${suites.join(",")} source_records=${mergedRecords.length} report=${FINAL_REPORT}\n`,
  );
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) {
  try {
    if (process.argv.includes("--plan")) plan();
    else generate();
  } catch (error) {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  }
}
