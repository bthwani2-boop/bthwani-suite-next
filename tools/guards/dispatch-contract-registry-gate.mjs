import { fail, read } from "./_guard-utils.mjs";

const guardId = "dispatch-contract-registry-gate";
const violations = [];

// `dsh.dispatch-governance.openapi.yaml` is the governed-mutation module of
// the DSH dispatch contract surface. It owns ONLY the governed dispatch
// transitions (reassign, cancel, expire, decisions, capacity-forecast,
// heatmap, candidates, captain profile, delivery-proof, handoff-exceptions,
// contact-proxy). The base list/create paths `/dsh/operator/dispatch/assignments`
// and `/dsh/captain/dispatch/assignments` are owned by the
// `paths/dispatch.paths.yaml` fragment consumed by the master
// `services/dsh/contracts/dsh.openapi.yaml` entry — that single authority was
// restored in commit 5048729dd (2026-08-25) which deleted the duplicate
// declarations from this module. This gate must enforce the canonical
// post-consolidation shape, not the pre-consolidation duplicate.
const contractRelative = "services/dsh/contracts/dsh.dispatch-governance.openapi.yaml";
const registryRelative = "services/dsh/contracts/contract-registry.ts";
const contract = read(contractRelative);
const registry = read(registryRelative);

// Governed-mutation paths and metadata that are legitimately owned by this
// module after the 5048729dd single-authority consolidation.
for (const marker of [
  "openapi: 3.1.0",
  "x-bthwani-owner: services/dsh",
  "x-bthwani-contract-state: CONTRACT_ACTIVE",
  "x-bthwani-client-generation: DISABLED",
  "x-bthwani-adapter-owner: frontend/shared/dispatch/dispatch.api.ts",
  "x-bthwani-runtime-dependency: true",
  "/dsh/operator/dispatch/assignments/{assignmentId}/reassign:",
  "/dsh/operator/dispatch/assignments/{assignmentId}/cancel:",
  "/dsh/operator/dispatch/assignments/expire:",
  "/dsh/operator/dispatch/candidates:",
  "/dsh/operator/dispatch/decisions:",
]) {
  if (!contract.includes(marker)) violations.push({ file: contractRelative, line: 0, message: `CONTRACT_MISSING_MARKER ${marker}` });
}

// The base list/create paths must NOT be redeclared here — they are owned by
// `paths/dispatch.paths.yaml`. Detecting their presence in this module is a
// regression signal for the duplicate-operation contract defect closed in
// 5048729dd.
for (const duplicateMarker of [
  "  /dsh/operator/dispatch/assignments:",
  "  /dsh/captain/dispatch/assignments:",
]) {
  if (contract.includes(duplicateMarker)) {
    violations.push({
      file: contractRelative,
      line: 0,
      message: `CONTRACT_DUPLICATE_PATH ${duplicateMarker.trim()} — base list/create paths are owned by paths/dispatch.paths.yaml; redeclaring them here is a parallel-truth defect (closed in 5048729dd).`,
    });
  }
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
