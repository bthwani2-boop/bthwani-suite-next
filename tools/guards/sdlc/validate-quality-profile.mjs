import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-quality-profile";
const file = "governance/contracts/sdlc/quality-profile.yaml";
const violations = [];
if (!fs.existsSync(path.join(repoRoot, file))) violations.push({ file, message: "MISSING_QUALITY_PROFILE" });
else {
  const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
  for (const needle of ["ISO_IEC_25010_2023_ALIGNED", "defect_severity", "risk_based_test_strategy", "independent_qa_approval_when_applicable"])
    if (!content.includes(needle)) violations.push({ file, message: `MISSING_QUALITY_PROFILE_RULE: ${needle}` });
}
fail(guardId, violations);
