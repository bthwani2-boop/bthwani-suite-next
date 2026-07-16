import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-stage-transition";
const args = process.argv.slice(2);
const stageArg = args.find((arg) => arg.startsWith("--stage="));
const requestedStage = stageArg ? stageArg.slice("--stage=".length) : undefined;
const lifecyclePath = path.join(repoRoot, "governance/operational_journey_protocol_package/sdlc/lifecycle.state-machine.yaml");
const content = fs.readFileSync(lifecyclePath, "utf8");
const allowed = [...content.matchAll(/^\s+- (G[0-9]_[A-Z0-9_]+|CLOSED_WITH_EVIDENCE|FIX_REQUIRED|HARD_BLOCKED_EXTERNAL_ONLY)$/gm)].map((m) => m[1]);
const violations = [];

if (requestedStage && !allowed.includes(requestedStage)) {
  violations.push({ file: "tools/guards/sdlc/validate-stage-transition.mjs", message: `UNKNOWN_REQUESTED_STAGE: ${requestedStage}` });
}

if (!content.includes("rule: stages_must_not_skip_required_evidence_or_approval")) {
  violations.push({ file: "governance/operational_journey_protocol_package/sdlc/lifecycle.state-machine.yaml", message: "MISSING_NO_SKIP_RULE" });
}

fail(guardId, violations);
