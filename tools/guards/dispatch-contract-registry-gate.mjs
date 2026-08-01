import { fail, read } from "./_guard-utils.mjs";

const guardId = "dispatch-contract-registry-gate";
const violations = [];

const contractRelative = "services/dsh/contracts/dsh.dispatch-governance.openapi.yaml";
const registryRelative = "services/dsh/contracts/contract-registry.ts";
const contract = read(contractRelative);
const registry = read(registryRelative);

for (const marker of [
  "openapi: 3.1.0",
  "x-bthwani-owner: services/dsh",
  "x-bthwani-contract-state: CONTRACT_ACTIVE",
  "x-bthwani-client-generation: DISABLED",
  "x-bthwani-adapter-owner: frontend/shared/dispatch/dispatch.api.ts",
  "x-bthwani-runtime-dependency: true",
  "/dsh/operator/dispatch/assignments:",
  "/dsh/captain/dispatch/assignments:",
  "/dsh/operator/dispatch/candidates:",
  "/dsh/operator/dispatch/decisions:",
]) {
  if (!contract.includes(marker)) violations.push({ file: contractRelative, line: 0, message: `CONTRACT_MISSING_MARKER ${marker}` });
}

for (const marker of [
  'id: "dsh-dispatch-governance"',
  'path: "contracts/dsh.dispatch-governance.openapi.yaml"',
  'clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER"',
  'adapterOwner: "frontend/shared/dispatch"',
]) {
  if (!registry.includes(marker)) violations.push({ file: registryRelative, line: 0, message: `REGISTRY_MISSING_MARKER ${marker}` });
}

fail(guardId, violations);
