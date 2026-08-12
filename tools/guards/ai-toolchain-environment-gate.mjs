import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fail, repoRoot } from "./_guard-utils.mjs";

const violations = [];

function resolveCommand(name) {
  const locator = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(locator, [name], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.error || result.status !== 0) {
    return undefined;
  }

  const paths = String(result.stdout || "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (process.platform === "win32") {
    return (
      paths.find((value) => /\.exe$/i.test(value)) ||
      paths.find((value) => /\.cmd$/i.test(value)) ||
      paths.find((value) => /\.bat$/i.test(value)) ||
      paths[0]
    );
  }

  return paths[0];
}

function executeVersionProbe(candidate, executable) {
  if (process.platform === "win32") {
    const comspec =
      process.env.ComSpec ||
      process.env.COMSPEC ||
      "cmd.exe";

    /*
     * Execute by command name through cmd.exe so PATHEXT resolves
     * .EXE, .CMD and .BAT exactly as an interactive Windows shell does.
     *
     * The command candidate is restricted before reaching this function.
     */
    return spawnSync(
      comspec,
      ["/d", "/s", "/c", `${candidate} --version`],
      {
        encoding: "utf8",
        timeout: 10_000,
        windowsHide: true,
      },
    );
  }

  return spawnSync(executable, ["--version"], {
    encoding: "utf8",
    timeout: 10_000,
  });
}

function probe(candidates) {
  const attempts = [];

  for (const candidate of candidates) {
    if (!/^[A-Za-z0-9._-]+$/.test(candidate)) {
      attempts.push({
        candidate,
        reason: "INVALID_COMMAND_NAME",
      });
      continue;
    }

    const executable = resolveCommand(candidate);

    if (!executable) {
      attempts.push({
        candidate,
        reason: "COMMAND_NOT_FOUND",
      });
      continue;
    }

    const result = executeVersionProbe(candidate, executable);

    if (result.error || result.status !== 0) {
      attempts.push({
        candidate,
        executable,
        reason: result.error
          ? String(result.error.code || result.error.message)
          : `EXIT_${String(result.status)}`,
      });
      continue;
    }

    const output = String(
      result.stdout || result.stderr || "",
    ).trim();

    return {
      state: "VERIFIED_AVAILABLE",
      executable,
      version: output.split(/\r?\n/)[0] || "unknown",
    };
  }

  return {
    state: "VERIFIED_UNAVAILABLE",
    attempts,
  };
}

const registry = JSON.parse(
  fs.readFileSync(
    path.join(
      repoRoot,
      "governance/tools/agent-tool-registry.json",
    ),
    "utf8",
  ),
);

const required = new Set(
  String(process.env.BTHWANI_REQUIRED_AI_TOOLS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

const commandCandidates = {
  "antigravity-implementer": ["agy"],
  graphify: ["graphify"],
  leanctx: ["lean-ctx"],
  "open-code-review": ["ocr"],
};

const report = {
  schemaVersion: 2,
  required: [...required].sort(),
  tools: {
    node: probe(["node"]),
    pnpm: probe(["pnpm"]),
  },
};

for (const core of ["node", "pnpm"]) {
  if (report.tools[core].state !== "VERIFIED_AVAILABLE") {
    violations.push({
      file: "environment",
      line: 0,
      message: `REQUIRED_CORE_TOOL_UNAVAILABLE ${core}`,
    });
  }
}

for (const tool of registry.entries || []) {
  const status = probe(
    commandCandidates[tool.id] || [tool.id],
  );

  report.tools[tool.id] = status;

  if (
    required.has(tool.id) &&
    status.state !== "VERIFIED_AVAILABLE"
  ) {
    violations.push({
      file: "environment",
      line: 0,
      message:
        `EXPLICITLY_REQUIRED_TOOL_UNAVAILABLE ${tool.id}`,
    });
  }
}

console.log(JSON.stringify(report, null, 2));
fail("ai-toolchain-environment-gate", violations);
