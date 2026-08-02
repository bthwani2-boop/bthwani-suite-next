#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fail, lineNumber, repoRoot } from "./_guard-utils.mjs";

const guardId = "typescript-readiness-config-gate";
const canonicalConfig = "tsconfig.base.json";
const violations = [];

function gitTracked(pathspecs) {
  const result = spawnSync("git", ["ls-files", "-z", "--", ...pathspecs], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.error || result.status !== 0) {
    const detail = result.error?.message ?? result.stderr?.trim() ?? `exit=${result.status}`;
    violations.push({ file: ".git", line: 0, message: `GIT_LS_FILES_FAILED ${detail}` });
    return [];
  }

  return [...new Set(result.stdout.split("\0").filter(Boolean))].sort();
}

function stripJsonComments(input) {
  let output = "";
  let inString = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (lineComment) {
      if (char === "\n" || char === "\r") {
        lineComment = false;
        output += char;
      } else {
        output += " ";
      }
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        output += "  ";
        blockComment = false;
        index += 1;
      } else {
        output += char === "\n" || char === "\r" ? char : " ";
      }
      continue;
    }

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      output += "  ";
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      output += "  ";
      blockComment = true;
      index += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function removeTrailingCommas(input) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }

    if (char === ",") {
      let lookahead = index + 1;
      while (/\s/.test(input[lookahead] ?? "")) lookahead += 1;
      if (input[lookahead] === "}" || input[lookahead] === "]") {
        output += " ";
        continue;
      }
    }

    output += char;
  }

  return output;
}

function parseJsonc(relativePath) {
  const raw = fs.readFileSync(path.join(repoRoot, relativePath), "utf8").replace(/^\uFEFF/, "");
  try {
    return {
      raw,
      parsed: JSON.parse(removeTrailingCommas(stripJsonComments(raw))),
    };
  } catch (error) {
    violations.push({ file: relativePath, line: 0, message: `INVALID_TSCONFIG_JSONC ${error.message}` });
    return { raw, parsed: undefined };
  }
}

function own(object, property) {
  return Object.prototype.hasOwnProperty.call(object ?? {}, property);
}

function optionLine(raw, option) {
  const escaped = option.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`"${escaped}"\\s*:`).exec(raw);
  return match ? lineNumber(raw, match.index) : 0;
}

const tsconfigFiles = gitTracked([
  ":(glob)tsconfig*.json",
  ":(glob)**/tsconfig*.json",
]);

if (!tsconfigFiles.includes(canonicalConfig)) {
  violations.push({ file: canonicalConfig, line: 0, message: "CANONICAL_TSCONFIG_MISSING" });
}

const parsedConfigs = new Map(tsconfigFiles.map((file) => [file, parseJsonc(file)]));
const canonical = parsedConfigs.get(canonicalConfig)?.parsed;
const canonicalAliases = new Set(Object.keys(canonical?.compilerOptions?.paths ?? {}));

if (canonicalAliases.size === 0) {
  violations.push({ file: canonicalConfig, line: 0, message: "CANONICAL_PATH_ALIASES_MISSING" });
}

const deprecatedOptions = [
  "baseUrl",
  "downlevelIteration",
  "importsNotUsedAsValues",
  "preserveValueImports",
];

for (const file of tsconfigFiles) {
  const entry = parsedConfigs.get(file);
  if (!entry?.parsed) continue;

  const { raw, parsed } = entry;
  const options = parsed.compilerOptions ?? {};

  if (own(options, "ignoreDeprecations")) {
    violations.push({
      file,
      line: optionLine(raw, "ignoreDeprecations"),
      message: `DEPRECATION_SUPPRESSION_FORBIDDEN value=${JSON.stringify(options.ignoreDeprecations)}`,
    });
  }

  for (const option of deprecatedOptions) {
    if (own(options, option)) {
      violations.push({
        file,
        line: optionLine(raw, option),
        message: `TYPESCRIPT_6_DEPRECATED_OPTION ${option}`,
      });
    }
  }

  const target = String(options.target ?? "").toLowerCase();
  if (target === "es5") {
    violations.push({ file, line: optionLine(raw, "target"), message: "TYPESCRIPT_6_DEPRECATED_TARGET es5" });
  }

  const moduleResolution = String(options.moduleResolution ?? "").toLowerCase();
  if (["node", "node10", "classic"].includes(moduleResolution)) {
    violations.push({
      file,
      line: optionLine(raw, "moduleResolution"),
      message: `TYPESCRIPT_6_DEPRECATED_MODULE_RESOLUTION ${moduleResolution}`,
    });
  }

  const moduleKind = String(options.module ?? "").toLowerCase();
  if (["amd", "umd", "system", "systemjs", "none"].includes(moduleKind)) {
    violations.push({
      file,
      line: optionLine(raw, "module"),
      message: `TYPESCRIPT_6_DEPRECATED_MODULE ${moduleKind}`,
    });
  }

  const paths = options.paths ?? {};
  for (const [alias, targets] of Object.entries(paths)) {
    if (!Array.isArray(targets) || targets.length === 0) {
      violations.push({ file, line: optionLine(raw, "paths"), message: `INVALID_PATH_MAPPING ${alias}` });
      continue;
    }

    for (const targetValue of targets) {
      const targetText = String(targetValue);
      if (!/^(?:\.\/|\.\.\/|\/)/.test(targetText)) {
        violations.push({
          file,
          line: optionLine(raw, "paths"),
          message: `NON_RELATIVE_PATH_TARGET alias=${alias} target=${targetText}`,
        });
      }
    }

    if (file !== canonicalConfig && canonicalAliases.has(alias)) {
      violations.push({
        file,
        line: optionLine(raw, "paths"),
        message: `PARALLEL_CANONICAL_ALIAS_SOURCE alias=${alias} owner=${canonicalConfig}`,
      });
    }
  }
}

const sourceFiles = gitTracked([
  ":(glob)**/*.ts",
  ":(glob)**/*.tsx",
  ":(glob)**/*.js",
  ":(glob)**/*.mjs",
  ":(glob)**/*.cjs",
]);
const compilerApiConsumers = new Set();

for (const file of sourceFiles) {
  if (file.endsWith(".d.ts") || file === "tools/guards/_typescript-readiness-config-gate.mjs") continue;
  const raw = fs.readFileSync(path.join(repoRoot, file), "utf8");
  const compilerApiPattern = /(?:\bfrom\s*|\brequire\s*\(\s*|\bimport\s*\(\s*)["']typescript["']/g;
  if (compilerApiPattern.test(raw)) compilerApiConsumers.add(file);
}

console.log(`typescript_readiness_tsconfig_files: ${tsconfigFiles.length}`);
console.log(`typescript_readiness_canonical_aliases: ${canonicalAliases.size}`);
console.log(`typescript_readiness_compiler_api_consumers: ${compilerApiConsumers.size}`);
for (const file of [...compilerApiConsumers].sort()) {
  console.log(`typescript_readiness_compiler_api_consumer: ${file}`);
}

if (compilerApiConsumers.size > 0) {
  console.warn(
    "typescript-readiness note: Compiler API consumers are inventoried for the future TypeScript 7 experiment; " +
      "they remain validated on TypeScript 6.0.3 during this readiness phase.",
  );
}

fail(guardId, violations);
