import { fail, read } from "./_guard-utils.mjs";

const guardId = "dispatch-contract-registry-gate";
const violations = [];

const contractRelative = "services/dsh/contracts/dsh.dispatch-governance.openapi.yaml";
const entryRelative = "services/dsh/contracts/dsh.openapi.yaml";
const schemaRelative = "services/dsh/contracts/components/schemas/dispatch.schemas.yaml";
const registryRelative = "services/dsh/contracts/contract-registry.ts";
const contract = read(contractRelative);
const entry = read(entryRelative);
const schema = read(schemaRelative);
const registry = read(registryRelative);

for (const marker of [
  "openapi: 3.1.0",
  "x-bthwani-owner: services/dsh",
  "x-bthwani-contract-state: CONTRACT_ACTIVE",
  "x-bthwani-client-generation: DISABLED",
  "x-bthwani-runtime-dependency: true",
  "/dsh/operator/dispatch/candidates:",
  "/dsh/operator/dispatch/decisions:",
]) {
  if (!contract.includes(marker)) violations.push({ file: contractRelative, line: 0, message: `CONTRACT_MISSING_MARKER ${marker}` });
}

for (const marker of [
  "/dsh/operator/dispatch/assignments:",
  "/dsh/captain/dispatch/assignments:",
]) {
  if (!entry.includes(marker)) violations.push({ file: entryRelative, line: 0, message: `ENTRY_CONTRACT_MISSING_MARKER ${marker}` });
}

for (const marker of [
  "DshGovernedDispatchAssignment:",
  "operatorContextId:",
  "serviceAreaCode:",
  "allowedActions:",
  "deliveryAddress:",
]) {
  if (!schema.includes(marker)) violations.push({ file: schemaRelative, line: 0, message: `SCHEMA_MISSING_MARKER ${marker}` });
}

for (const marker of [
  'id: "dsh-dispatch-governance"',
  'path: "contracts/dsh.dispatch-governance.openapi.yaml"',
  'clientStrategy: "PARENT_GENERATED_SUBSET"',
  'generatedClient: "clients/generated/dsh-api.ts"',
]) {
  if (!registry.includes(marker)) violations.push({ file: registryRelative, line: 0, message: `REGISTRY_MISSING_MARKER ${marker}` });
}

fail(guardId, violations);
