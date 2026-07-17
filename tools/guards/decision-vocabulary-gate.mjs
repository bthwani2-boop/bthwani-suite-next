import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "decision-vocabulary-gate";
const violations = [];
const vocabularyPath = path.join(repoRoot, "governance/contracts/decision-vocabulary.json");
const schemaPath = path.join(repoRoot, "governance/contracts/decision-vocabulary.schema.json");

for (const required of [vocabularyPath, schemaPath]) {
  if (!fs.existsSync(required)) {
    violations.push({ file: path.relative(repoRoot, required), line: 0, message: "MISSING_DECISION_VOCABULARY_FILE" });
  }
}

if (violations.length === 0) {
  const vocabulary = JSON.parse(fs.readFileSync(vocabularyPath, "utf8"));
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  if (!validate(vocabulary)) {
    for (const error of validate.errors ?? []) {
      violations.push({
        file: "governance/contracts/decision-vocabulary.json",
        line: 0,
        message: `SCHEMA_VIOLATION ${error.instancePath} ${error.message}`,
      });
    }
  }

  const canonicalIds = new Set();
  const canonicalClass = new Map();
  for (const decision of vocabulary.canonicalDecisions) {
    if (canonicalIds.has(decision.id)) {
      violations.push({ file: "governance/contracts/decision-vocabulary.json", line: 0, message: `DUPLICATE_CANONICAL_DECISION ${decision.id}` });
    }
    canonicalIds.add(decision.id);
    canonicalClass.set(decision.id, decision.class);
  }

  const aliases = new Set();
  for (const alias of vocabulary.aliases) {
    if (aliases.has(alias.alias) || canonicalIds.has(alias.alias)) {
      violations.push({ file: "governance/contracts/decision-vocabulary.json", line: 0, message: `DUPLICATE_OR_SHADOWING_ALIAS ${alias.alias}` });
    }
    aliases.add(alias.alias);
    if (!canonicalIds.has(alias.canonical)) {
      violations.push({ file: "governance/contracts/decision-vocabulary.json", line: 0, message: `ALIAS_TARGET_UNKNOWN ${alias.alias} -> ${alias.canonical}` });
    }
  }

  const closed = vocabulary.closureRules.closedDecision;
  if (!canonicalIds.has(closed) || canonicalClass.get(closed) !== "closed") {
    violations.push({ file: "governance/contracts/decision-vocabulary.json", line: 0, message: `INVALID_CLOSED_DECISION ${closed}` });
  }

  const knownTerms = new Set([...canonicalIds, ...aliases]);
  const sources = [
    "AGENTS.md",
    ".agents/skills/bthwani-cost-aware-subagent-orchestrator/SKILL.md",
    ".agents/skills/bthwani-evidence-gate-router/SKILL.md",
    ".agents/skills/bthwani-final-journey-closure-judge/SKILL.md",
    ".agents/skills/bthwani-sdlc-stage-gate-orchestrator/SKILL.md",
    "governance/26_SDLC_TEAM_AND_STAGE_GATES.md"
  ];
  const decisionPattern = /\b(?:CODE_CHECK_(?:PASS|FAIL)|DSH_WLT_CODE_CLOSURE_(?:PASS|FAIL)|RUNTIME_SMOKE_(?:PASS|FAIL)|UI_VISUAL_PASS|READY_FOR_PR|BLOCKED_EXTERNAL|BLOCKED_NEEDS_EVIDENCE|NEEDS_RUNTIME_EVIDENCE|GATE_PASS|FIX_REQUIRED|QA_BLOCK|SECURITY_BLOCK|RELEASE_BLOCK|PROTOCOL_VIOLATION|HARD_BLOCKED_EXTERNAL_ONLY|CLOSED_WITH_EVIDENCE|CLOSED)\b/g;
  for (const source of sources) {
    const sourcePath = path.join(repoRoot, source);
    if (!fs.existsSync(sourcePath)) continue;
    const text = fs.readFileSync(sourcePath, "utf8");
    for (const match of text.matchAll(decisionPattern)) {
      if (!knownTerms.has(match[0])) {
        violations.push({ file: source, line: 0, message: `UNREGISTERED_DECISION_TERM ${match[0]}` });
      }
    }
  }
}

fail(guardId, violations);
