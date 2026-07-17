import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-artifact-inputs";
const args = process.argv.slice(2);
const getArg = (name) => {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const artifactPath = getArg("--artifact");
const impactPath = getArg("--impact");
const capability = getArg("--capability");
const violations = [];
const ajv = new Ajv({ allErrors: true, strict: false });
const affectedMode = args.includes("--affected");

if (affectedMode && !artifactPath) {
  violations.push({ file: "<cli>", message: "MISSING_REQUIRED_ARTIFACT_FOR_AFFECTED_SDLC_GATE" });
}
if (affectedMode && !impactPath) {
  violations.push({ file: "<cli>", message: "MISSING_REQUIRED_IMPACT_FOR_AFFECTED_SDLC_GATE" });
}
if ((artifactPath && !impactPath) || (!artifactPath && impactPath)) {
  violations.push({ file: "<cli>", message: "SDLC_ARTIFACT_AND_IMPACT_MUST_BE_PROVIDED_TOGETHER" });
}

function readAndValidate(inputRel, schemaRel) {
  const inputFull = path.join(repoRoot, inputRel);
  const schemaFull = path.join(repoRoot, schemaRel);
  if (!fs.existsSync(inputFull)) {
    violations.push({ file: inputRel, message: "MISSING_SDLC_INPUT_FILE" });
    return undefined;
  }

  let input;
  try {
    input = JSON.parse(fs.readFileSync(inputFull, "utf8"));
  } catch (error) {
    violations.push({ file: inputRel, message: `INVALID_JSON: ${error.message}` });
    return undefined;
  }

  const schema = JSON.parse(fs.readFileSync(schemaFull, "utf8"));
  const validate = ajv.compile(schema);
  if (!validate(input)) {
    for (const error of validate.errors ?? []) {
      violations.push({
        file: inputRel,
        message: `SCHEMA_VIOLATION: Path '${error.instancePath}' ${error.message}`,
      });
    }
  }
  return input;
}

let artifact;
let impact;
if (artifactPath) {
  artifact = readAndValidate(
    artifactPath,
    "governance/operational_journey_protocol_package/sdlc/artifact-manifest.schema.json",
  );
}
if (impactPath) {
  impact = readAndValidate(
    impactPath,
    "governance/operational_journey_protocol_package/sdlc/change-impact.schema.json",
  );
}

if (artifact && impact) {
  if (artifact.capabilityId !== impact.capabilityId) {
    violations.push({
      file: artifactPath,
      message: `CAPABILITY_MISMATCH: artifact=${artifact.capabilityId} impact=${impact.capabilityId}`,
    });
  }
  if (capability && artifact.capabilityId !== capability) {
    violations.push({
      file: artifactPath,
      message: `CLI_CAPABILITY_MISMATCH: cli=${capability} artifact=${artifact.capabilityId}`,
    });
  }
  if ((impact.affectedPaths ?? []).length === 0) {
    violations.push({ file: impactPath, message: "EMPTY_AFFECTED_PATHS" });
  }

  const highRisk = impact.riskClass === "high" || impact.riskClass === "critical";
  if (highRisk && impact.impacts.security !== true) {
    violations.push({ file: impactPath, message: "HIGH_RISK_CHANGE_MUST_DECLARE_SECURITY_IMPACT" });
  }
  if (impact.impacts.tenant === true && !(artifact.applicableGates ?? []).includes("TENANT_SAAS_DEFERRED")) {
    violations.push({ file: artifactPath, message: "TENANT_IMPACT_WITHOUT_TENANT_GATE" });
  }
  if (impact.impacts.wltFinance === true && !(artifact.applicableGates ?? []).some((gate) => gate.includes("WLT"))) {
    violations.push({ file: artifactPath, message: "WLT_FINANCE_IMPACT_WITHOUT_WLT_GATE" });
  }

  const passDecision = artifact.decision === "GATE_PASS" || artifact.decision === "CLOSED_WITH_EVIDENCE";
  if (passDecision && highRisk) {
    const required = new Set(artifact.requiredApprovals ?? []);
    for (const role of ["engineering-reviewer", "qa-lead", "security-authority"]) {
      if (!required.has(role)) {
        violations.push({ file: artifactPath, message: `HIGH_RISK_REQUIRED_APPROVAL_MISSING: ${role}` });
      }
    }
  }
}

fail(guardId, violations);
