import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-product-truth";
const args = process.argv.slice(2);
const violations = [];

function getArg(name) {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const artifactPath = getArg("--artifact");
const impactPath = getArg("--impact");
const requestedStage = getArg("--stage");
const schemaRelative = "governance/product/product-truth.schema.json";
const policyRelative = "governance/product/PRODUCT_TRUTH_POLICY.md";

for (const required of [schemaRelative, policyRelative]) {
  if (!fs.existsSync(path.join(repoRoot, required))) {
    violations.push({ file: required, message: "MISSING_PRODUCT_TRUTH_AUTHORITY" });
  }
}

let artifact;
let impact;
if (artifactPath && fs.existsSync(path.join(repoRoot, artifactPath))) {
  artifact = JSON.parse(fs.readFileSync(path.join(repoRoot, artifactPath), "utf8"));
}
if (impactPath && fs.existsSync(path.join(repoRoot, impactPath))) {
  impact = JSON.parse(fs.readFileSync(path.join(repoRoot, impactPath), "utf8"));
}

if (impact) {
  const productSensitivePath = (impact.affectedPaths ?? []).some((affectedPath) =>
    /(^|\/)(apps|services\/[^/]+\/frontend|shared\/ui-kit|contracts)(\/|$)/.test(affectedPath),
  );
  if (productSensitivePath && impact.productImpact === "NONE") {
    violations.push({ file: impactPath, message: "PRODUCT_SENSITIVE_PATH_DECLARED_PRODUCT_IMPACT_NONE" });
  }
  if (impact.productImpact === "UNKNOWN" && requestedStage && requestedStage !== "G0_INTAKE") {
    violations.push({ file: impactPath, message: `UNKNOWN_PRODUCT_IMPACT_CANNOT_ADVANCE_TO ${requestedStage}` });
  }
  if (impact.productImpact === "CHANGED" && !impact.productTruthContract) {
    violations.push({ file: impactPath, message: "PRODUCT_TRUTH_CONTRACT_REQUIRED_FOR_CHANGED_PRODUCT" });
  }
}

const productTruthPath = impact?.productTruthContract ?? artifact?.productTruthContract;
let productTruth;
if (productTruthPath) {
  const fullPath = path.join(repoRoot, productTruthPath);
  if (!fs.existsSync(fullPath)) {
    violations.push({ file: productTruthPath, message: "PRODUCT_TRUTH_CONTRACT_NOT_FOUND" });
  } else {
    productTruth = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, schemaRelative), "utf8"));
    const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
    if (!validate(productTruth)) {
      for (const error of validate.errors ?? []) {
        violations.push({ file: productTruthPath, message: `PRODUCT_TRUTH_SCHEMA_VIOLATION ${error.instancePath} ${error.message}` });
      }
    }
  }
}

if (artifact && impact) {
  if (artifact.branch !== impact.branch) {
    violations.push({ file: artifactPath, message: `PRODUCT_GOVERNANCE_BRANCH_MISMATCH artifact=${artifact.branch} impact=${impact.branch}` });
  }
  if (artifact.productTruthContract && impact.productTruthContract && artifact.productTruthContract !== impact.productTruthContract) {
    violations.push({ file: artifactPath, message: "PRODUCT_TRUTH_CONTRACT_MISMATCH_BETWEEN_ARTIFACT_AND_IMPACT" });
  }
}

if (artifact && productTruth) {
  if (artifact.capabilityId !== productTruth.capabilityId) {
    violations.push({ file: artifactPath, message: `PRODUCT_TRUTH_CAPABILITY_MISMATCH artifact=${artifact.capabilityId} contract=${productTruth.capabilityId}` });
  }
  if (artifact.productTruthState !== productTruth.state) {
    violations.push({ file: artifactPath, message: `PRODUCT_TRUTH_STATE_MISMATCH artifact=${artifact.productTruthState} contract=${productTruth.state}` });
  }

  const stage = requestedStage ?? artifact.requestedStage;
  const minimumStateByStage = new Map([
    ["G1_PRODUCT_MODEL_APPROVED", ["PRODUCT_MODEL_APPROVED", "READY_FOR_IMPLEMENTATION", "IMPLEMENTED", "PRODUCT_ACCEPTED"]],
    ["G2_DESIGN_APPROVED", ["PRODUCT_MODEL_APPROVED", "READY_FOR_IMPLEMENTATION", "IMPLEMENTED", "PRODUCT_ACCEPTED"]],
    ["G3_READY_FOR_IMPLEMENTATION", ["READY_FOR_IMPLEMENTATION", "IMPLEMENTED", "PRODUCT_ACCEPTED"]],
    ["G4_IMPLEMENTATION_VERIFIED", ["IMPLEMENTED", "PRODUCT_ACCEPTED"]],
    ["G5_PRODUCT_ACCEPTED", ["PRODUCT_ACCEPTED"]],
    ["G6_QA_APPROVED", ["PRODUCT_ACCEPTED"]],
    ["G7_SECURITY_APPROVED", ["PRODUCT_ACCEPTED"]],
    ["G8_RELEASE_APPROVED", ["PRODUCT_ACCEPTED"]],
    ["G9_DEPLOYED", ["PRODUCT_ACCEPTED"]],
    ["G10_PRODUCTION_VERIFIED", ["PRODUCT_ACCEPTED"]],
    ["CLOSED_WITH_EVIDENCE", ["PRODUCT_ACCEPTED"]],
  ]);
  const allowedStates = minimumStateByStage.get(stage);
  if (allowedStates && !allowedStates.includes(productTruth.state)) {
    violations.push({ file: productTruthPath, message: `PRODUCT_TRUTH_STATE_${productTruth.state}_CANNOT_ADVANCE_TO_${stage}` });
  }
}

fail(guardId, violations);
