import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "product-truth-gate";
const violations = [];
const schemaPath = path.join(repoRoot, "governance/product/product-truth.schema.json");
const policyPath = path.join(repoRoot, "governance/product/PRODUCT_TRUTH_POLICY.md");
const contractsDir = path.join(repoRoot, "governance/product/contracts");

for (const required of [schemaPath, policyPath, contractsDir]) {
  if (!fs.existsSync(required)) {
    violations.push({ file: path.relative(repoRoot, required), line: 0, message: "MISSING_PRODUCT_TRUTH_GOVERNANCE" });
  }
}

if (violations.length === 0) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const contractFiles = fs
    .readdirSync(contractsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".product-truth.json"))
    .map((entry) => entry.name)
    .sort();

  if (!contractFiles.includes("TEMPLATE.product-truth.json")) {
    violations.push({ file: "governance/product/contracts", line: 0, message: "MISSING_PRODUCT_TRUTH_TEMPLATE" });
  }

  const capabilityIds = new Set();
  for (const file of contractFiles) {
    const relativePath = `governance/product/contracts/${file}`;
    let contract;
    try {
      contract = JSON.parse(fs.readFileSync(path.join(contractsDir, file), "utf8"));
    } catch (error) {
      violations.push({ file: relativePath, line: 0, message: `INVALID_JSON ${error.message}` });
      continue;
    }

    if (!validate(contract)) {
      for (const error of validate.errors ?? []) {
        violations.push({ file: relativePath, line: 0, message: `SCHEMA_VIOLATION ${error.instancePath} ${error.message}` });
      }
      continue;
    }

    if (capabilityIds.has(contract.capabilityId)) {
      violations.push({ file: relativePath, line: 0, message: `DUPLICATE_CAPABILITY_ID ${contract.capabilityId}` });
    }
    capabilityIds.add(contract.capabilityId);

    if (contract.owners.productManager === contract.owners.productOwner) {
      violations.push({ file: relativePath, line: 0, message: "PRODUCT_MANAGER_AND_PRODUCT_OWNER_MUST_BE_SEPARATE_AUTHORITIES" });
    }

    const actorIds = new Set();
    for (const actor of contract.actors) {
      if (actorIds.has(actor.id)) {
        violations.push({ file: relativePath, line: 0, message: `DUPLICATE_ACTOR ${actor.id}` });
      }
      actorIds.add(actor.id);
      const overlap = actor.permittedActions.filter((action) => actor.forbiddenActions.includes(action));
      if (overlap.length > 0) {
        violations.push({ file: relativePath, line: 0, message: `ACTION_BOTH_PERMITTED_AND_FORBIDDEN ${actor.id}: ${overlap.join(", ")}` });
      }
    }

    const surfaceIds = new Set();
    for (const surface of contract.surfaces) {
      if (surfaceIds.has(surface.id)) {
        violations.push({ file: relativePath, line: 0, message: `DUPLICATE_SURFACE ${surface.id}` });
      }
      surfaceIds.add(surface.id);
      for (const actorId of surface.actors) {
        if (!actorIds.has(actorId)) {
          violations.push({ file: relativePath, line: 0, message: `SURFACE_REFERENCES_UNKNOWN_ACTOR ${surface.id} -> ${actorId}` });
        }
      }
      if (surface.required && ["app-client", "app-partner", "app-captain", "app-field", "control-panel"].includes(surface.id)) {
        if (!surface.routesOrScreens || surface.routesOrScreens.length === 0) {
          violations.push({ file: relativePath, line: 0, message: `REQUIRED_UI_SURFACE_HAS_NO_ROUTE_OR_SCREEN ${surface.id}` });
        }
      }
      if (surface.required && surface.id === "backend" && (!surface.operationIds || surface.operationIds.length === 0)) {
        violations.push({ file: relativePath, line: 0, message: "REQUIRED_BACKEND_SURFACE_HAS_NO_OPERATION_ID" });
      }
    }

    if (contract.state === "PRODUCT_ACCEPTED" && contract.acceptance.runtimeEvidenceRequired && contract.owners.productAcceptanceDecision !== "PASS") {
      violations.push({ file: relativePath, line: 0, message: "PRODUCT_ACCEPTED_WITHOUT_PRODUCT_ACCEPTANCE_PASS" });
    }
  }

  const policy = fs.readFileSync(policyPath, "utf8");
  for (const marker of [
    "PRODUCT_MANAGER_AUTHORITY",
    "PRODUCT_OWNER_ACCEPTANCE_AUTHORITY",
    "Cross-surface rule",
    "does not activate or implement SaaS"
  ]) {
    if (!policy.includes(marker)) {
      violations.push({ file: "governance/product/PRODUCT_TRUTH_POLICY.md", line: 0, message: `POLICY_MARKER_MISSING ${marker}` });
    }
  }
}

fail(guardId, violations);
