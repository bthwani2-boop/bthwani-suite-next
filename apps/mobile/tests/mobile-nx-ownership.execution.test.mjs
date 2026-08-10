import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const requireFromRepo = createRequire(new URL("../../../package.json", import.meta.url));
const nxCli = requireFromRepo.resolve("nx/bin/nx.js");

function affectedProjects(file) {
  const result = spawnSync(
    process.execPath,
    [nxCli, "show", "projects", "--affected", `--files=${file}`, "--sep=,"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      windowsHide: true,
      env: process.env,
    },
  );

  const failure = [
    result.error?.stack ?? result.error?.message ?? "",
    result.stderr ?? "",
    result.stdout ?? "",
  ]
    .filter(Boolean)
    .join("\n")
    .trim();

  assert.equal(result.status, 0, failure || `nx affected failed for ${file}`);
  return new Set(
    result.stdout
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

const surfaceCases = [
  ["app-client", "apps/app-client/runtime/src/App.tsx"],
  ["app-partner", "apps/app-partner/runtime/src/App.tsx"],
  ["app-captain", "apps/app-captain/runtime/src/App.tsx"],
  ["app-field", "apps/app-field/runtime/src/App.tsx"],
  ["control-panel", "apps/control-panel/runtime/src/app/page.tsx"],
];

for (const [project, file] of surfaceCases) {
  test(`Nx maps ${project} source changes to the owning test project`, () => {
    const affected = affectedProjects(file);
    assert.equal(
      affected.has(project),
      true,
      `${project} is missing from Nx affected set for ${file}: ${[...affected].join(", ")}`,
    );
  });
}

test("Nx propagates a sovereign DSH shared-kernel change to all dependent application surfaces", () => {
  const affected = affectedProjects("services/dsh/frontend/shared/_kernel/dsh-api-base-url.ts");
  for (const project of surfaceCases.map(([name]) => name)) {
    assert.equal(
      affected.has(project),
      true,
      `${project} is missing from affected set for shared DSH API transport: ${[...affected].join(", ")}`,
    );
  }
});
