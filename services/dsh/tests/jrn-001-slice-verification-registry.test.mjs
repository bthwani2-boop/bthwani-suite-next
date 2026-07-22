import assert from "node:assert/strict";
import fs from "node:fs";

const registryPath = "services/dsh/contracts/jrn-001-slice-verification-registry.json";
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));

assert.equal(registry.journeyId, "JRN-001");
assert.equal(registry.executionMode, "SEQUENTIAL_FIX_FIRST");
assert.equal(registry.aggregateContext, "journeys/jrn-001/all-slices-sequential");
assert.equal(registry.slices.length, 18);

const expectedIds = Array.from({ length: 18 }, (_, index) => `FS-${String(index + 1).padStart(2, "0")}`);
assert.deepEqual(registry.slices.map((slice) => slice.id), expectedIds);
assert.equal(new Set(registry.slices.map((slice) => slice.context)).size, 18);

for (const slice of registry.slices) {
  assert.equal(typeof slice.name, "string");
  assert.ok(slice.name.trim().length > 0, `${slice.id} missing name`);
  assert.match(slice.context, /^journeys\/jrn-001\/fs-[0-9]{2}[a-z0-9-]*$/);
  assert.ok(Array.isArray(slice.commands) && slice.commands.length > 0, `${slice.id} missing commands`);
  assert.ok(Array.isArray(slice.evidence) && slice.evidence.length > 0, `${slice.id} missing evidence`);
  for (const command of slice.commands) {
    assert.equal(typeof command, "string");
    assert.ok(command.trim().length > 0, `${slice.id} has empty command`);
  }
  for (const evidencePath of slice.evidence) {
    assert.equal(fs.existsSync(evidencePath), true, `${slice.id} missing evidence file ${evidencePath}`);
  }
}

const allCommands = registry.slices.flatMap((slice) => slice.commands).join("\n");
assert.match(allCommands, /go test \.\/internal\/partner/);
assert.match(allCommands, /pnpm --dir apps\/app-field\/runtime typecheck/);
assert.match(allCommands, /jrn-001-cross-surface-truth-gate\.mjs/);
assert.match(allCommands, /jrn-001-security-privacy-gate\.mjs/);
assert.match(allCommands, /jrn-001-experience-quality-gate\.mjs/);
assert.match(allCommands, /jrn-001-observability-gate\.mjs/);
assert.match(allCommands, /jrn-001-cleanup-gate\.mjs/);
assert.match(allCommands, /jrn-001-fs-18-evidence\.test\.mjs/);

console.log("JRN-001 sequential FS-01..FS-18 verification registry validated");
