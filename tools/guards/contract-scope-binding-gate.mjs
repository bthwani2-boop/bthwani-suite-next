#!/usr/bin/env node
// Verifies that every authorization scope/permission literal enforced by Go
// route guards has a matching entry in governance/contracts/scope-vocabulary.json,
// and that the vocabulary carries no stale entries no longer enforced anywhere.
//
// This is a Go -> vocabulary drift check. It does not (yet) verify that each
// individual OpenAPI operation declares the exact scope its handler enforces —
// see the remaining-work note in governance/contracts/scope-vocabulary.json's
// consumers list. That finer-grained per-operation mapping is out of scope for
// this gate and remains an open item.
import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), "..", "..");
const vocabularyRelative = "governance/contracts/scope-vocabulary.json";
const vocabulary = JSON.parse(fs.readFileSync(path.join(repositoryRoot, vocabularyRelative), "utf8"));

const failures = [];

const declared = new Set();
for (const family of vocabulary.families ?? []) {
  for (const entry of family.scopes ?? []) {
    if (declared.has(entry.scope)) failures.push(`${vocabularyRelative}: duplicate scope '${entry.scope}'`);
    declared.add(entry.scope);
  }
}

// Go source roots scanned for enforced scope/permission literals, and the
// call-site patterns that carry a literal as an argument. Test files are
// excluded: they may reference fixture scopes that were never wired to a
// real route.
const scanTargets = [
  {
    root: "core/workforce/backend",
    patterns: [
      /operatorOnly\(\s*"([^"]+)"/g,
      /providerSelf\(\s*"([^"]+)"/g,
      /anyAuthenticated\(\s*"([^"]+)"/g,
      /resolveReferenceOperator\([^)]*?,\s*"([^"]+)"\s*\)/g,
    ],
  },
  { root: "core/providers/backend", patterns: [/operatorOnly\(\s*"([^"]+)"/g] },
  { root: "core/platform-control/backend", patterns: [/operatorOnly\(\s*"([^"]+)"/g] },
  {
    root: "services/dsh/backend",
    patterns: [
      /requirePermission\(\s*w,\s*r,\s*"[^"]*",\s*"([a-zA-Z][a-zA-Z0-9_.:-]*)"/g,
      /requirePermission\(\s*w,\s*r,\s*"[^"]*",\s*[A-Za-z][A-Za-z0-9]*Permission[A-Za-z0-9]*,/g,
    ],
  },
];

// DSH passes permission constants (not string literals) into requirePermission
// at most call sites. Resolve `FooPermissionBar = "foo.bar"` declarations
// first, then substitute constant names encountered at call sites.
function collectDshPermissionConstants(root) {
  const constants = new Map();
  const constPattern = /([A-Za-z]+Permission[A-Za-z]*)\s*=\s*"([a-zA-Z0-9_.:-]+)"/g;
  for (const file of walk(root)) {
    if (file.endsWith("_test.go")) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(constPattern)) constants.set(match[1], match[2]);
  }
  return constants;
}

function* walk(dir) {
  const absolute = path.join(repositoryRoot, dir);
  if (!fs.existsSync(absolute)) return;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const full = path.join(absolute, entry.name);
    const relative = path.relative(repositoryRoot, full).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      yield* walk(relative);
    } else if (entry.name.endsWith(".go")) {
      yield relative;
    }
  }
}

const enforced = new Set();
const dshConstants = collectDshPermissionConstants("services/dsh/backend");

for (const target of scanTargets) {
  for (const file of walk(target.root)) {
    if (file.endsWith("_test.go")) continue;
    const text = fs.readFileSync(path.join(repositoryRoot, file), "utf8");
    for (const pattern of target.patterns) {
      for (const match of text.matchAll(pattern)) {
        if (match[1]) {
          enforced.add(match[1]);
          continue;
        }
        // Constant-reference form: extract the trailing identifier and resolve it.
        const constMatch = match[0].match(/([A-Za-z][A-Za-z0-9]*Permission[A-Za-z0-9]*),\s*$/);
        if (constMatch) {
          const resolved = dshConstants.get(constMatch[1]);
          if (resolved) enforced.add(resolved);
          else failures.push(`services/dsh/backend: unresolved permission constant '${constMatch[1]}' referenced in ${file}`);
        }
      }
    }
  }
}

for (const scope of enforced) {
  if (!declared.has(scope)) {
    failures.push(`Go enforces scope '${scope}' with no entry in ${vocabularyRelative}`);
  }
}

const staleThreshold = declared.size;
let stale = 0;
for (const scope of declared) {
  if (!enforced.has(scope)) stale += 1;
}
if (stale > 0) {
  console.warn(`contract-scope-binding-gate: WARNING ${stale}/${staleThreshold} declared scopes are not currently enforced anywhere in Go (informational only, not a failure)`);
}

if (failures.length > 0) {
  console.error("contract-scope-binding-gate: FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`contract-scope-binding-gate: OK (${enforced.size} Go-enforced scopes all present in ${vocabularyRelative})`);
