import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-security-profile";
const file = "governance/operational_journey_protocol_package/sdlc/security-profile.yaml";
const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
const required = ["NIST_SSDF_1_1", "OWASP_SAMM_V2", "OWASP_ASVS_5_0_0", "tenant_isolation_negative_tests", "independent_retest_for_critical_or_high"];
const violations = required
  .filter((needle) => !content.includes(needle))
  .map((needle) => ({ file, message: `MISSING_SECURITY_PROFILE_RULE: ${needle}` }));

fail(guardId, violations);
