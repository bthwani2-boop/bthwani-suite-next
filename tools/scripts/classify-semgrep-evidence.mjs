import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TOOL_LIMITATION_PROVEN = "TOOL_LIMITATION_PROVEN";
export const UNKNOWN_ENGINE_ERROR = "UNKNOWN_ENGINE_ERROR";

const workflowPath = (value) => typeof value === "string" && value.startsWith(".github/workflows/");

const normalizedType = (raw) => {
  if (Array.isArray(raw?.type)) return raw.type[0] ?? "UNSPECIFIED";
  return raw?.type ?? "UNSPECIFIED";
};

const normalizedMessage = (raw) => typeof raw?.message === "string" ? raw.message : "";

const isWorkflowBashMetavariableParse = (raw, type, message) => {
  if (!workflowPath(raw?.path)) return false;
  if (!message.includes("metavariable-pattern")) return false;
  if (!message.includes("parsing a snippet as Bash")) return false;
  return type === "PartialParsing" || type === "Internal matching error";
};

const isKnownWorkflowInternalParse = (raw, type, message) => {
  if (!workflowPath(raw?.path) || type !== "Internal matching error") return false;
  return message.includes("metavariable-pattern failed when parsing $SHELL's content as Bash");
};

export function classifySemgrepEngineCondition(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      classification: UNKNOWN_ENGINE_ERROR,
      type: "UNSPECIFIED",
      path: "",
      ruleId: "",
      message: "raw engine condition is not an object",
      raw,
    };
  }

  const type = normalizedType(raw);
  const message = normalizedMessage(raw);
  const result = {
    classification: UNKNOWN_ENGINE_ERROR,
    type,
    path: raw.path ?? "",
    ruleId: raw.rule_id ?? "",
    message,
    raw,
  };

  if (isWorkflowBashMetavariableParse(raw, type, message) || isKnownWorkflowInternalParse(raw, type, message)) {
    return {
      ...result,
      classification: TOOL_LIMITATION_PROVEN,
      reason: "semgrep-yaml-github-actions-bash-metavariable-parser",
    };
  }

  return result;
}

const countBySeverity = (results) => {
  const counts = new Map();
  for (const result of results) {
    const severity = result?.extra?.severity ?? "UNSPECIFIED";
    counts.set(severity, (counts.get(severity) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([severity, count]) => ({ severity, count }));
};

export function classifySemgrepEvidence(payload, metadata = {}) {
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const rawErrors = Array.isArray(payload?.errors) ? payload.errors : [];
  const classifiedErrors = rawErrors.map(classifySemgrepEngineCondition);
  const toolLimitations = classifiedErrors.filter((entry) => entry.classification === TOOL_LIMITATION_PROVEN);
  const unknownErrors = classifiedErrors.filter((entry) => entry.classification === UNKNOWN_ENGINE_ERROR);

  return {
    classifiedErrors,
    summary: {
      schemaVersion: 3,
      headSha: metadata.headSha ?? "",
      mode: metadata.mode ?? "",
      baseSha: metadata.baseSha ?? "",
      totalFindings: results.length,
      engineConditions: rawErrors.length,
      classifiedEngineErrors: classifiedErrors.length,
      toolLimitationsProven: toolLimitations.length,
      unknownEngineErrors: unknownErrors.length,
      severities: countBySeverity(results),
      allRawFindingsAccounted: classifiedErrors.length === rawErrors.length,
    },
  };
}

const argumentValue = (args, name) => {
  const index = args.indexOf(name);
  if (index === -1 || index + 1 >= args.length) throw new Error(`missing ${name}`);
  return args[index + 1];
};

export function runNormalizer({ input, outputDir, headSha, mode, baseSha }) {
  const payload = JSON.parse(fs.readFileSync(input, "utf8"));
  const normalized = classifySemgrepEvidence(payload, { headSha, mode, baseSha });
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "semgrep.pretty.json"), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "classified-errors.json"), `${JSON.stringify(normalized.classifiedErrors, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "summary.json"), `${JSON.stringify(normalized.summary, null, 2)}\n`);
  return normalized.summary;
}

const main = () => {
  const args = process.argv.slice(2);
  const summary = runNormalizer({
    input: argumentValue(args, "--input"),
    outputDir: argumentValue(args, "--output-dir"),
    headSha: argumentValue(args, "--head-sha"),
    mode: argumentValue(args, "--mode"),
    baseSha: argumentValue(args, "--base-sha"),
  });

  console.log(JSON.stringify(summary));
  if (!summary.allRawFindingsAccounted || summary.unknownEngineErrors !== 0 || summary.totalFindings !== 0) {
    process.exitCode = 1;
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
