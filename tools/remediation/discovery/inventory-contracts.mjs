// Inventories OpenAPI contract files: declared path count and resolved operation
// count. Modular contracts (spec: x-bthwani-contract-layout: MODULAR) reference each
// path via `$ref: "./paths/x.yaml#/..."`; this script follows one level of $ref to
// count real operations instead of miscounting them as zero. Read-only.
import fs from "node:fs";
import path from "node:path";
import { repoRoot, listFiles, writeInventory } from "../_remediation-utils.mjs";

const pathKeyPattern = /^  (\/\S*):\s*$/gm;
const refPattern = /^\s*\$ref:\s*"([^"#]+)(?:#.*)?"\s*$/;
const methodPattern = /^\s{2,8}(get|post|put|patch|delete|options|head):\s*$/gim;

function countMethodsInText(content) {
  methodPattern.lastIndex = 0;
  return [...content.matchAll(methodPattern)].length;
}

function inspectContract(file) {
  const fullPath = path.join(repoRoot, file);
  const content = fs.readFileSync(fullPath, "utf8");
  const pathsBlockStart = content.indexOf("\npaths:");
  const pathsBlock = pathsBlockStart === -1 ? "" : content.slice(pathsBlockStart);
  const pathKeys = [...pathsBlock.matchAll(pathKeyPattern)].map((match) => match[1]);

  let operationCount = 0;
  const resolvedRefFiles = new Set();
  for (const pathKey of pathKeys) {
    const escaped = pathKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // No "m" flag: with "m", "$" in the lookahead matches end-of-line rather than
    // end-of-string, which truncated the lazy capture at the first inner line break.
    const entryMatch = pathsBlock.match(new RegExp(`  ${escaped}:\\s*\\n([\\s\\S]*?)(?=\\n  /\\S|$)`));
    const entryBody = entryMatch?.[1] ?? "";
    const refLine = entryBody.split("\n").find((line) => refPattern.test(line));
    const ref = refLine ? refLine.match(refPattern)?.[1] : undefined;
    if (ref) {
      const refFull = path.resolve(path.dirname(fullPath), ref);
      resolvedRefFiles.add(path.relative(repoRoot, refFull).replaceAll("\\", "/"));
    } else {
      operationCount += countMethodsInText(entryBody);
    }
  }
  for (const refFile of resolvedRefFiles) {
    const refFull = path.join(repoRoot, refFile);
    if (fs.existsSync(refFull)) operationCount += countMethodsInText(fs.readFileSync(refFull, "utf8"));
  }

  return {
    path: file,
    declaredPathCount: pathKeys.length,
    operationCount,
    modular: resolvedRefFiles.size > 0,
    refFilesFollowed: resolvedRefFiles.size,
  };
}

const contractFiles = listFiles().filter((file) => /\.openapi\.ya?ml$/i.test(file));
const items = contractFiles.map(inspectContract);

writeInventory("contracts", {
  generatedAt: new Date().toISOString(),
  masterContract: "contracts/master.openapi.yaml",
  contractCount: items.length,
  totalDeclaredPathCount: items.reduce((sum, entry) => sum + entry.declaredPathCount, 0),
  totalOperationCount: items.reduce((sum, entry) => sum + entry.operationCount, 0),
  items,
});
