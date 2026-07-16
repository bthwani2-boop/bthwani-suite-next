import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-role-separation";
const file = "governance/operational_journey_protocol_package/sdlc/roles-and-authority.yaml";
const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
const required = [
  "independent_quality_authority",
  "application_security_authority",
  "risk_acceptance_authority",
  "must_not_be_change_author: true",
  "may_final_approve_own_high_risk_change: false"
];

const violations = required
  .filter((needle) => !content.includes(needle))
  .map((needle) => ({ file, message: `MISSING_ROLE_SEPARATION_RULE: ${needle}` }));

fail(guardId, violations);
