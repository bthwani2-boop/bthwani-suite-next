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
const violations = [];
const ajv = new Ajv({ allErrors: true, strict: false });

function validateJsonAgainstSchema(inputRel, schemaRel) {
  const inputFull = path.join(repoRoot, inputRel);
  const schemaFull = path.join(repoRoot, schemaRel);

  if (!fs.existsSync(inputFull)) {
    violations.push({ file: inputRel, message: "MISSING_SDLC_INPUT_FILE" });
    return;
  }

  let input;
  try {
    input = JSON.parse(fs.readFileSync(inputFull, "utf8"));
  } catch (error) {
    violations.push({ file: inputRel, message: `INVALID_JSON: ${error.message}` });
    return;
  }

  const schema = JSON.parse(fs.readFileSync(schemaFull, "utf8"));
  const validate = ajv.compile(schema);
  if (!validate(input)) {
    for (const error of validate.errors ?? []) {
      violations.push({
        file: inputRel,
        message: `SCHEMA_VIOLATION: Path '${error.instancePath}' ${error.message}`
      });
    }
  }
}

if (artifactPath) {
  validateJsonAgainstSchema(artifactPath, "governance/operational_journey_protocol_package/sdlc/artifact-manifest.schema.json");
}

if (impactPath) {
  validateJsonAgainstSchema(impactPath, "governance/operational_journey_protocol_package/sdlc/change-impact.schema.json");
}

fail(guardId, violations);
