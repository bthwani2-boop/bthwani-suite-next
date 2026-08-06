/**
 * BTHWANI_LOGIC_COVERAGE_GATE
 *
 * TypeScript-AST verification for interactive frontend wiring. Imports and
 * re-exports are followed through a bounded graph so route shims and barrels
 * are judged by the controller they actually reach, not by text patterns.
 */

import path from "node:path";
import { ts } from "./lib/typescript-compiler.mjs";
import { fail, listCodeFiles, lineNumber, read } from "./_guard-utils.mjs";

const guardId = "logic-coverage-gate";
const violations = [];
const warnings = [];
const MAX_IMPORT_DEPTH = 12;
const CANONICAL_MONEY_FILE = "services/wlt/frontend/shared/dsh/finance/wlt-money.ts";

function inFrontendScope(file) {
  if (!/\.(tsx|jsx|ts|js)$/.test(file)) return false;
  if (file.includes("/generated/") || file.includes("clients/generated")) return false;
  if (file.includes(".test.") || file.includes(".spec.") || file.includes("__tests__")) return false;
  if (file.includes("android/") || file.includes("ios/") || file.startsWith("tools/")) return false;
  if (/\/(shell|providers?|layout|_layout)\.(tsx?|jsx?)$/.test(file)) return false;
  return /^apps\/[^/]+\/runtime\/src\//.test(file) || /^services\/[^/]+\/frontend\//.test(file);
}

function scriptKind(file) {
  if (file.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (file.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (file.endsWith(".js")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

const allFiles = listCodeFiles();
const fileSet = new Set(allFiles);
const scopedFiles = allFiles.filter(inFrontendScope);
const sources = new Map(
  scopedFiles.map((file) => [
    file,
    ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, scriptKind(file)),
  ]),
);

function importSpecifiers(sourceFile) {
  const specifiers = [];
  for (const statement of sourceFile.statements) {
    if (
      (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement))
      && statement.moduleSpecifier
      && ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      specifiers.push(statement.moduleSpecifier.text);
    }
  }
  return specifiers;
}

function resolveCandidate(candidate) {
  const normalized = candidate.replaceAll("\\", "/").replace(/^\.\//, "");
  for (const suffix of ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"]) {
    const resolved = `${normalized}${suffix}`;
    if (fileSet.has(resolved)) return resolved;
  }
  return null;
}

function resolveImport(fromFile, specifier) {
  if (specifier.startsWith(".")) {
    return resolveCandidate(path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier)));
  }
  if (specifier === "@bthwani/wlt/dsh") {
    return resolveCandidate("services/wlt/frontend/shared/dsh/index");
  }
  if (specifier.startsWith("@bthwani/wlt/dsh/")) {
    return resolveCandidate(`services/wlt/frontend/shared/dsh/${specifier.slice("@bthwani/wlt/dsh/".length)}`);
  }
  if (specifier === "@bthwani/dsh") {
    return resolveCandidate("services/dsh/frontend/shared/index");
  }
  if (specifier.startsWith("@bthwani/dsh/")) {
    const subpath = specifier.slice("@bthwani/dsh/".length);
    const ownedRoot = /^(?:control-panel|app-client|app-partner|app-captain|app-field)(?:\/|$)/.test(subpath)
      ? "services/dsh/frontend"
      : "services/dsh/frontend/shared";
    return resolveCandidate(`${ownedRoot}/${subpath}`);
  }
  return null;
}

function ownsControllerBinding(file, sourceFile) {
  if (/\/(?:controllers?|adapters?)\//.test(file) || /(?:-controller(?:-core)?|\.api|\.adapter)\.[jt]sx?$/.test(file)) {
    return true;
  }
  let found = false;
  const visit = (node) => {
    if (found) return;
    if (ts.isIdentifier(node) && /^(?:use[A-Z]\w*Controller|useQuery|useMutation|useCapability)$/.test(node.text)) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function reachesController(startFile) {
  const queue = [{ file: startFile, depth: 0 }];
  const visited = new Set();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current.file) || current.depth > MAX_IMPORT_DEPTH) continue;
    visited.add(current.file);
    const sourceFile = sources.get(current.file);
    if (!sourceFile) continue;
    if (current.file !== startFile && ownsControllerBinding(current.file, sourceFile)) return true;
    for (const specifier of importSpecifiers(sourceFile)) {
      if (/controllers?|adapters?|(?:-controller(?:-core)?|\.api)(?:$|\/)/.test(specifier)) return true;
      const resolved = resolveImport(current.file, specifier);
      if (resolved && !visited.has(resolved)) queue.push({ file: resolved, depth: current.depth + 1 });
    }
  }
  return ownsControllerBinding(startFile, sources.get(startFile));
}

// Reverse import graph, built once, so a screen can be judged by who composes
// it as well as by what it imports.
const importers = (() => {
  const map = new Map();
  for (const [file, sourceFile] of sources) {
    for (const specifier of importSpecifiers(sourceFile)) {
      const resolved = resolveImport(file, specifier);
      if (!resolved) continue;
      if (!map.has(resolved)) map.set(resolved, []);
      map.get(resolved).push(file);
    }
  }
  return map;
})();

/**
 * A presentational screen that takes its data through props is correct
 * architecture: surfaces compose and render, controllers own behavior. Such a
 * screen reaches no controller through its own imports, so it must instead be
 * proven bound through the parent that renders it.
 *
 * A screen that neither reaches a controller nor is composed by any bound
 * parent is genuinely unreachable, and that is what stays reported.
 */
function isComposedByBoundParent(startFile) {
  const queue = [{ file: startFile, depth: 0 }];
  const visited = new Set([startFile]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current.depth > MAX_IMPORT_DEPTH) continue;
    for (const parent of importers.get(current.file) ?? []) {
      if (visited.has(parent)) continue;
      visited.add(parent);
      if (ownsControllerBinding(parent, sources.get(parent)) || reachesController(parent)) return true;
      queue.push({ file: parent, depth: current.depth + 1 });
    }
  }
  return false;
}

function isScreenFile(file) {
  return /\/(screens?|pages?|views?)\//.test(file)
    || file.endsWith("Screen.tsx")
    || file.endsWith("Page.tsx")
    || /\/app\/.*\/page\.tsx$/.test(file);
}

function isTransportOwner(file) {
  return /\/(?:controllers?|adapters?|media|_kernel)\//.test(file)
    || /(?:\.api|\.adapter|runtime-adapter|api-client|http-request|bff-proxy)\.[jt]sx?$/.test(file);
}

function isScriptOrUtility(file) {
  return /\/(?:scripts|utils|_kernel)\//.test(file) || /\.(?:actions|model)\./.test(file) || file.endsWith(".mjs");
}

function nodeLine(sourceFile, node) {
  return lineNumber(sourceFile.text, node.getStart(sourceFile));
}

function identifierIs(node, text) {
  return ts.isIdentifier(node) && node.text === text;
}

function isNullishExpression(node) {
  return node.kind === ts.SyntaxKind.NullKeyword || identifierIs(node, "undefined");
}

const FINANCIAL_TERM = /(?:minorUnits|amount|money|fee|price|balance|currency|grossAmount|netAmount|discountMinor|subtotalMinor|totalMinor)/i;
const NON_MONEY_RATE_TERM = /(?:percent|percentage|basisPoints|bps|rate|ratio|share|progress|opacity|distance|coordinate)/i;

function isLocalMoneyArithmetic(node, sourceFile) {
  if (!ts.isBinaryExpression(node)) return false;
  if (node.operatorToken.kind !== ts.SyntaxKind.SlashToken && node.operatorToken.kind !== ts.SyntaxKind.AsteriskToken) return false;
  const left = node.left.getText(sourceFile);
  const right = node.right.getText(sourceFile);
  if (left !== "100" && right !== "100") return false;
  const expression = node.getText(sourceFile);
  return FINANCIAL_TERM.test(expression) && !NON_MONEY_RATE_TERM.test(expression);
}

function isLocalMoneyFormatting(node, sourceFile) {
  if (!ts.isCallExpression(node)) return false;
  if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "toLocaleString") {
    const target = node.expression.expression.getText(sourceFile);
    return FINANCIAL_TERM.test(target) && !/(?:points?|credits?)Balance/i.test(target) && !NON_MONEY_RATE_TERM.test(target);
  }
  if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "format") {
    const argumentText = node.arguments.map((argument) => argument.getText(sourceFile)).join(" ");
    return FINANCIAL_TERM.test(argumentText) && !NON_MONEY_RATE_TERM.test(argumentText);
  }
  return false;
}

function isExplicitFailureResult(node) {
  if (!ts.isObjectLiteralExpression(node)) return false;
  return node.properties.some((property) => (
    ts.isPropertyAssignment(property)
    && property.name.getText() === "ok"
    && property.initializer.kind === ts.SyntaxKind.FalseKeyword
  ));
}

for (const file of scopedFiles) {
  const sourceFile = sources.get(file);
  if (!sourceFile) continue;

  const visit = (node) => {
    if (ts.isJsxAttribute(node) && node.name.getText(sourceFile) === "onPress" && node.initializer) {
      if (
        ts.isJsxExpression(node.initializer)
        && node.initializer.expression
        && isNullishExpression(node.initializer.expression)
      ) {
        violations.push({ file, line: nodeLine(sourceFile, node), message: "LOGIC_DEAD_INTERACTION onPress is nullish" });
      }
    }

    if (ts.isCallExpression(node)) {
      if (identifierIs(node.expression, "fetch") && !isTransportOwner(file)) {
        violations.push({ file, line: nodeLine(sourceFile, node), message: "LOGIC_RAW_FETCH use a controller or adapter" });
      }
      if (
        ts.isPropertyAccessExpression(node.expression)
        && identifierIs(node.expression.expression, "Promise")
        && node.expression.name.text === "resolve"
        && node.arguments.some((argument) => (
          (ts.isObjectLiteralExpression(argument) && !isExplicitFailureResult(argument))
          || ts.isArrayLiteralExpression(argument)
        ))
      ) {
        violations.push({ file, line: nodeLine(sourceFile, node), message: "LOGIC_MOCK_SUCCESS Promise.resolve with hardcoded data" });
      }
      if (
        !isScriptOrUtility(file)
        && ts.isPropertyAccessExpression(node.expression)
        && identifierIs(node.expression.expression, "console")
        && node.expression.name.text === "log"
      ) {
        violations.push({ file, line: nodeLine(sourceFile, node), message: "LOGIC_DEBUG_LOG remove console.log from application code" });
      }
      if (file !== CANONICAL_MONEY_FILE && isLocalMoneyFormatting(node, sourceFile)) {
        violations.push({ file, line: nodeLine(sourceFile, node), message: "FINANCE_LOCAL_FORMATTING use @bthwani/wlt/dsh formatWltMoney" });
      }
    }

    if (file !== CANONICAL_MONEY_FILE && isLocalMoneyArithmetic(node, sourceFile)) {
      violations.push({ file, line: nodeLine(sourceFile, node), message: "FINANCE_LOCAL_CONVERSION use the WLT money kernel" });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (isScreenFile(file) && !reachesController(file) && !isComposedByBoundParent(file)) {
    warnings.push({
      file,
      message: `SCREEN_BINDING_NOT_PROVEN: reaches no controller within ${MAX_IMPORT_DEPTH} import edges and no bound parent composes it`,
    });
  }
}

if (warnings.length > 0) {
  console.log(`\n${guardId} WARNINGS (${warnings.length}):`);
  for (const warning of warnings) console.log(`  W ${warning.file} — ${warning.message}`);
}

fail(guardId, violations);
