import fs from "node:fs";
import path from "node:path";
import {
  existsResolved,
  fail,
  findImportSpecifiers,
  lineNumber,
  listCodeFiles,
  loadTsconfigAliases,
  read,
  repoRoot
} from "./_guard-utils.mjs";

const guardId = "no-broken-imports";
const violations = [];
const aliases = loadTsconfigAliases();

function aliasExists(alias) {
  const target = aliases.get(alias);
  if (!target) return false;

  const abs = path.join(repoRoot, target);
  return fs.existsSync(abs);
}

for (const file of listCodeFiles()) {
  const content = read(file);
  for (const item of findImportSpecifiers(content)) {
    const spec = item.specifier;

    if (spec.startsWith(".")) {
      if (!existsResolved(file, spec)) {
        violations.push({
          file,
          line: lineNumber(content, item.index),
          message: `broken relative import: ${spec}`
        });
      }
      continue;
    }

    if (spec.startsWith("@bthwani/") && aliases.has(spec)) {
      if (!aliasExists(spec)) {
        violations.push({
          file,
          line: lineNumber(content, item.index),
          message: `tsconfig alias target does not exist: ${spec}`
        });
      }
    }
  }
}

fail(guardId, violations);