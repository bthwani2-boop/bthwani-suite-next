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
const ALL_SUITES = ["identity", "data-runtime", "dsh"];

const suiteDefinitions = {
  identity: {
    cwd: "core/identity",
    testRoot: "core/identity/tests",
    sourcePrefixes: ["core/identity/clients/"],
  },
  "data-runtime": {
    cwd: "shared/data-runtime",
    testRoot: "shared/data-runtime/tests",
    sourcePrefixes: ["shared/data-runtime/src/"],
  },
  dsh: {
    cwd: "services/dsh",
    testCwd: ".",
    testRoot: "services/dsh/tests",
    sourcePrefixes: ["services/dsh/frontend/"],
    prepare: ["pnpm", "--dir", "services/dsh", "exec", "tsc", "-p", "tsconfig.json"],
  },
};

function normalizePath(value) {
  return String(value ?? "").trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

export function planCoverageSuites(inputFiles, { mode = "affected" } = {}) {
  const files = uniqueSorted(inputFiles.map(normalizePath));
  if (String(mode).toLowerCase() === "full") return [...ALL_SUITES];

  const selfVerification = files.some((file) =>
    file === "package.json" ||
    file === "pnpm-lock.yaml" ||
    file === "pnpm-workspace.yaml" ||
    file === "tsconfig.base.json" ||
    file === "sonar-project.properties" ||
    file === ".github/workflows/sonarqube.yml" ||
    file === ".github/actions/setup-node-workspace/action.yml" ||
    file === "tools/scripts/generate-sonar-node-coverage.mjs" ||
    file === "tools/scripts/generate-sonar-node-coverage.test.mjs"
  );
  if (selfVerification) return [...ALL_SUITES];

  const suites = [];
  if (files.some((file) =>
    file.startsWith("core/identity/clients/") ||
    file.startsWith("core/identity/tests/") ||
    file === "core/identity/package.json" ||
    file === "core/identity/tsconfig.json"
  )) suites.push("identity");

  if (files.some((file) => file.startsWith("shared/data-runtime/"))) {
    suites.push("data-runtime");
  }

  if (files.some((file) =>
    file.startsWith("services/dsh/frontend/") ||
    file.startsWith("services/dsh/tests/") ||
    file === "services/dsh/package.json" ||
    file === "services/dsh/tsconfig.json"
  )) suites.push("dsh");

  return suites;
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
  if (result.status !== 0) {
    throw new Error(`${executable} exited with status ${result.status}`);
  }
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
    : [
        path.resolve(suiteCwd, candidate),
        path.resolve(repoRoot, candidate),
      ];

  for (const absolute of attempts) {
    const relative = normalizePath(path.relative(repoRoot, absolute));
    if (!relative || relative.startsWith("../") || path.isAbsolute(relative)) continue;
    if (existsSync(absolute) && statSync(absolute).isFile()) {
      return { absolute, relative };
    }
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
    const match = /^(DA|BRDA|FN):(\d+)(?:,|$)/.exec(line);
    if (!match) continue;
    const lineNumber = Number.parseInt(match[2], 10);
    if (!Number.isSafeInteger(lineNumber) || lineNumber < 1 || lineNumber > maxLine) {
      throw new Error(
        `LCOV ${match[1]} line ${match[2]} is outside ${source} (source lines=${maxLine})`,
      );
    }
  }
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
    if (!/\.(?:[cm]?[jt]sx?)$/i.test(source) || /\.d\.ts$/i.test(source)) continue;
    if (source.includes("/generated/") || source.includes("/node_modules/")) continue;
    if (!definition.sourcePrefixes.some((prefix) => source.startsWith(prefix))) continue;

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
  const testCwd = path.resolve(repoRoot, definition.testCwd ?? definition.cwd);
  const tests = discoverTests(path.resolve(repoRoot, definition.testRoot));
  if (tests.length === 0) throw new Error(`${suiteName}: no node:test files found`);

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
    throw new Error(`${suiteName}: coverage ran but no real repository source records were retained`);
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
  const finalReport = path.resolve(repoRoot, FINAL_REPORT);
  writeFileSync(finalReport, records.join(""), "utf8");

  const scanArgs = `-Dsonar.javascript.lcov.reportPaths=${FINAL_REPORT}`;
  writeOutputs({
    report_path: FINAL_REPORT,
    scan_args: scanArgs,
    source_records: String(records.length),
  });
  process.stdout.write(
    `Sonar Node coverage: PASS suites=${suites.join(",")} source_records=${records.length} report=${FINAL_REPORT}\n`,
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
