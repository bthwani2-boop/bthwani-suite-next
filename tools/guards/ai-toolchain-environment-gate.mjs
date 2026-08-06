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

  if (result.error || result.status !== 0) return undefined;

  const paths = String(result.stdout || "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);

  return (
    paths.find((value) => /\.(?:exe|cmd|bat)$/i.test(value)) ||
    paths[0]
  );
}

function probe(candidates) {
  for (const candidate of candidates) {
    const executable = resolveCommand(candidate);
    if (!executable) continue;

    const result = spawnSync(executable, ["--version"], {
      encoding: "utf8",
      timeout: 10_000,
      windowsHide: true,
      shell:
        process.platform === "win32" &&
        /\.(?:cmd|bat)$/i.test(executable),
    });

    if (result.error || result.status !== 0) continue;

    const output = String(result.stdout || result.stderr || "").trim();

    return {
      state: "VERIFIED_AVAILABLE",
      executable,
      version: output.split(/\r?\n/)[0] || "unknown",
    };
  }

  return {
    state: "VERIFIED_UNAVAILABLE",
  };
}

const registry = JSON.parse(
  fs.readFileSync(
    path.join(repoRoot, "governance/tools/agent-tool-registry.json"),
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
      message: "REQUIRED_CORE_TOOL_UNAVAILABLE " + core,
    });
  }
}

for (const tool of registry.entries || []) {
  const status = probe(commandCandidates[tool.id] || [tool.id]);
  report.tools[tool.id] = status;

  if (
    required.has(tool.id) &&
    status.state !== "VERIFIED_AVAILABLE"
  ) {
    violations.push({
      file: "environment",
      line: 0,
      message: "EXPLICITLY_REQUIRED_TOOL_UNAVAILABLE " + tool.id,
    });
  }
}

console.log(JSON.stringify(report, null, 2));
fail("ai-toolchain-environment-gate", violations);
