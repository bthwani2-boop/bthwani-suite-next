import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-manifest";
const root = path.join(repoRoot, "governance/operational_journey_protocol_package/sdlc");
const requiredFiles = [
  "README.md",
  "lifecycle.state-machine.yaml",
  "roles-and-authority.yaml",
  "gate-catalog.yaml",
  "quality-profile.yaml",
  "security-profile.yaml",
  "test-profile.yaml",
  "defect-policy.yaml",
  "exception-policy.yaml",
  "metrics.yaml",
  "artifact-manifest.schema.json",
  "change-impact.schema.json",
  "templates/capability-intake.yaml",
  "templates/requirements.yaml",
  "templates/architecture-review.yaml",
  "templates/threat-model.yaml",
  "templates/test-plan.yaml",
  "templates/pentest-scope.yaml",
  "templates/release-readiness.yaml",
  "templates/production-verification.yaml",
  "templates/closure-decision.yaml"
];

const violations = [];

for (const rel of requiredFiles) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    violations.push({ file: `governance/operational_journey_protocol_package/sdlc/${rel}`, message: "MISSING_SDLC_SUPPORT_FILE" });
    continue;
  }
  const content = fs.readFileSync(full, "utf8");
  if (content.trim() === "") {
    violations.push({ file: `governance/operational_journey_protocol_package/sdlc/${rel}`, message: "EMPTY_SDLC_SUPPORT_FILE" });
  }
}

const ajv = new Ajv({ allErrors: true, strict: false });
for (const rel of ["artifact-manifest.schema.json", "change-impact.schema.json"]) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) continue;
  try {
    const schema = JSON.parse(fs.readFileSync(full, "utf8"));
    ajv.compile(schema);
  } catch (error) {
    violations.push({ file: `governance/operational_journey_protocol_package/sdlc/${rel}`, message: `INVALID_JSON_SCHEMA: ${error.message}` });
  }
}

fail(guardId, violations);
