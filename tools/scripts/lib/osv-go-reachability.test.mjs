import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { adjudicateOsvReport, scopedGoImports } from "./osv-go-reachability.mjs";

const repoRoot = path.resolve("/repo");

function goReport({ vulnerability, source = "core/identity/backend/go.mod", ecosystem = "Go" }) {
  return {
    results: [
      {
        source: { path: path.join(repoRoot, source), type: "lockfile" },
        packages: [
          {
            package: { name: "golang.org/x/crypto", version: "0.54.0", ecosystem },
            vulnerabilities: [vulnerability]
          }
        ]
      }
    ]
  };
}

const openpgpAdvisory = {
  id: "GO-2026-5932",
  affected: [
    {
      package: { ecosystem: "Go", name: "golang.org/x/crypto" },
      ecosystem_specific: {
        imports: [{ path: "golang.org/x/crypto/openpgp" }, { path: "golang.org/x/crypto/openpgp/packet" }]
      }
    }
  ]
};

test("advisory scope is read from the Go package's own affected entry", () => {
  assert.deepEqual(scopedGoImports(openpgpAdvisory, "golang.org/x/crypto"), [
    "golang.org/x/crypto/openpgp",
    "golang.org/x/crypto/openpgp/packet"
  ]);
  assert.deepEqual(scopedGoImports(openpgpAdvisory, "golang.org/x/net"), []);
});

test("a Go advisory is dismissed only when none of its imports is in the graph", async () => {
  const { blocking, unreachable } = await adjudicateOsvReport({
    report: goReport({ vulnerability: openpgpAdvisory }),
    repoRoot,
    resolveScopedImports: async (vulnerability, name) => scopedGoImports(vulnerability, name),
    importGraph: () => new Set(["golang.org/x/crypto/bcrypt", "net/http"])
  });

  assert.deepEqual(blocking, []);
  assert.equal(unreachable.length, 1);
  assert.equal(unreachable[0].id, "GO-2026-5932");
  assert.equal(unreachable[0].source, "core/identity/backend/go.mod");
});

test("the same advisory blocks as soon as a vulnerable package is imported", async () => {
  const { blocking, unreachable } = await adjudicateOsvReport({
    report: goReport({ vulnerability: openpgpAdvisory }),
    repoRoot,
    resolveScopedImports: async (vulnerability, name) => scopedGoImports(vulnerability, name),
    importGraph: () => new Set(["golang.org/x/crypto/openpgp/packet"])
  });

  assert.equal(unreachable.length, 0);
  assert.equal(blocking.length, 1);
  assert.match(blocking[0].reason, /imports golang\.org\/x\/crypto\/openpgp\/packet/);
});

test("an advisory with no import scope cannot be dismissed", async () => {
  const { blocking } = await adjudicateOsvReport({
    report: goReport({ vulnerability: { id: "GO-2026-0001" } }),
    repoRoot,
    resolveScopedImports: async () => [],
    importGraph: () => new Set()
  });

  assert.equal(blocking.length, 1);
  assert.match(blocking[0].reason, /does not scope/);
});

test("an unresolvable import graph cannot be dismissed", async () => {
  const { blocking } = await adjudicateOsvReport({
    report: goReport({ vulnerability: openpgpAdvisory }),
    repoRoot,
    resolveScopedImports: async (vulnerability, name) => scopedGoImports(vulnerability, name),
    importGraph: () => null
  });

  assert.equal(blocking.length, 1);
  assert.match(blocking[0].reason, /import graph could not be resolved/);
});

test("non-Go findings keep blocking because no import evidence exists", async () => {
  const { blocking } = await adjudicateOsvReport({
    report: {
      results: [
        {
          source: { path: path.join(repoRoot, "pnpm-lock.yaml"), type: "lockfile" },
          packages: [
            {
              package: { name: "left-pad", version: "1.0.0", ecosystem: "npm" },
              vulnerabilities: [{ id: "GHSA-test" }]
            }
          ]
        }
      ]
    },
    repoRoot,
    resolveScopedImports: async () => ["whatever"],
    importGraph: () => new Set(),
  });

  assert.equal(blocking.length, 1);
  assert.equal(blocking[0].id, "GHSA-test");
});

test("a Go ecosystem finding reported against a non-module source still blocks", async () => {
  const { blocking } = await adjudicateOsvReport({
    report: goReport({ vulnerability: openpgpAdvisory, source: "pnpm-lock.yaml" }),
    repoRoot,
    resolveScopedImports: async (vulnerability, name) => scopedGoImports(vulnerability, name),
    importGraph: () => new Set()
  });

  assert.equal(blocking.length, 1);
});
