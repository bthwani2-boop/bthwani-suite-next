import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-quality-profile";
const file = "governance/operational_journey_protocol_package/sdlc/quality-profile.yaml";
const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
const required = ["ISO_IEC_25010_2023_ALIGNED", "defect_severity", "risk_based_test_strategy", "independent_qa_approval_when_applicable"];
const violations = required
  .filter((needle) => !content.includes(needle))
  .map((needle) => ({ file, message: `MISSING_QUALITY_PROFILE_RULE: ${needle}` }));

fail(guardId, violations);
