import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function affectedProjects(file) {
  const result = spawnSync(
    pnpm,
    ["exec", "nx", "show", "projects", "--affected", `--files=${file}`, "--sep=,"],
    { encoding: "utf8", windowsHide: true },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout || `nx affected failed for ${file}`);
  return new Set(
    result.stdout
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

const appCases = [
  ["app-client", "apps/app-client/runtime/src/App.tsx"],
  ["app-partner", "apps/app-partner/runtime/src/App.tsx"],
  ["app-captain", "apps/app-captain/runtime/src/App.tsx"],
  ["app-field", "apps/app-field/runtime/src/App.tsx"],
];

for (const [project, file] of appCases) {
  test(`Nx maps ${project} source changes to the owning test project`, () => {
    const affected = affectedProjects(file);
    assert.equal(
      affected.has(project),
      true,
      `${project} is missing from Nx affected set for ${file}: ${[...affected].join(", ")}`,
    );
  });
}

test("Nx propagates a sovereign DSH shared-kernel change to all four mobile dependents", () => {
  const affected = affectedProjects("services/dsh/frontend/shared/_kernel/dsh-api-base-url.ts");
  for (const project of appCases.map(([name]) => name)) {
    assert.equal(
      affected.has(project),
      true,
      `${project} is missing from affected set for shared DSH API transport: ${[...affected].join(", ")}`,
    );
  }
});
