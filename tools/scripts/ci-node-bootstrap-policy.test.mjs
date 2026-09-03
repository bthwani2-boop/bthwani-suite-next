import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

function materializesContracts(target) {
  return (target?.dependsOn ?? []).some(
    (dependency) =>
      dependency?.target === "materialize" &&
      Array.isArray(dependency.projects) &&
      dependency.projects.length === 1 &&
      dependency.projects[0] === "contracts",
  );
}

test("Node verification bootstraps every runtime required by its Nx execution graph", () => {
  const workflow = read(".github/workflows/ci-node-verification.yml");
  const nx = JSON.parse(read("nx.json"));

  for (const target of ["typecheck", "lint", "test", "build"]) {
    assert.equal(materializesContracts(nx.targetDefaults?.[target]), true, `${target} materializes contracts`);
  }

  const goSetup = workflow.match(
    /- name: Set up locked Go runtime for generated Go contracts\n(?<body>[\s\S]*?)(?=      - name: Materialize contracts when affected)/u,
  )?.groups?.body;

  assert.ok(goSetup, "Node verification must configure Go before its Nx graph can materialize contracts");
  assert.match(goSetup, /uses: actions\/setup-go@/u);
  assert.match(goSetup, /go-version-file: core\/identity\/clients\/go\/identityauth\/go\.mod/u);
  assert.doesNotMatch(goSetup, /^\s*if:/mu);
});

test("Node verification collection remains fail-closed when the graph fails", () => {
  const workflow = read(".github/workflows/ci-node-verification.yml");

  assert.match(workflow, /id: node_graph/u);
  assert.match(
    workflow,
    /\[\[ "\$\{NODE_GRAPH\}" == "success" \]\] \|\| failures\+=\("node-graph:\$\{NODE_GRAPH\}"\)/u,
  );
  assert.match(workflow, /Node verification failed after collecting all independently executable checks/u);
});
