import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-security-profile";
const file = "governance/contracts/sdlc/security-profile.yaml";
const violations = [];
if (!fs.existsSync(path.join(repoRoot, file))) violations.push({ file, message: "MISSING_SECURITY_PROFILE" });
else {
  const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
  for (const needle of ["NIST_SSDF_1_1", "OWASP_SAMM_V2", "OWASP_ASVS_5_0_0", "operator_context_isolation_negative_tests", "independent_retest_for_critical_or_high"])
    if (!content.includes(needle)) violations.push({ file, message: `MISSING_SECURITY_PROFILE_RULE: ${needle}` });
}
fail(guardId, violations);
