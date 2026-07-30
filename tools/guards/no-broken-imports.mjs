import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  existsResolved,
  fail,
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
  return fs.existsSync(path.join(repoRoot, target));
}

function scriptKindFor(file) {
  if (file.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (file.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (file.endsWith(".js") || file.endsWith(".mjs") || file.endsWith(".cjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function findParsedImportSpecifiers(file, content) {
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, scriptKindFor(file));
  const specs = [];

  function addSpecifier(node) {
    if (node && ts.isStringLiteralLike(node)) {
      specs.push({ specifier: node.text, index: node.getStart(sourceFile) });
    }
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      addSpecifier(node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      addSpecifier(node.moduleReference.expression);
    } else if (ts.isCallExpression(node) && node.arguments.length === 1) {
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      if (isRequire || isDynamicImport) addSpecifier(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specs;
}

function generatedImportHasSource(importingFile, specifier) {
  const absoluteTarget = path.resolve(repoRoot, path.dirname(importingFile), specifier);
  const distToken = `${path.sep}dist${path.sep}`;
  const distIndex = absoluteTarget.indexOf(distToken);
  if (distIndex === -1) return false;

  const repositoryRelativeAfterDist = absoluteTarget.slice(distIndex + distToken.length);
  const sourceBase = path.join(repoRoot, repositoryRelativeAfterDist).replace(/\.(?:mjs|cjs|js)$/, "");
  return [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx"].some((extension) => fs.existsSync(`${sourceBase}${extension}`));
}

for (const file of listCodeFiles()) {
  if (file.endsWith("next-env.d.ts")) continue;
  const content = read(file);
  for (const item of findParsedImportSpecifiers(file, content)) {
    const spec = item.specifier;

    if (spec.startsWith(".")) {
      if (!existsResolved(file, spec) && !generatedImportHasSource(file, spec)) {
        violations.push({
          file,
          line: lineNumber(content, item.index),
          message: `broken relative import: ${spec}`
        });
      }
      continue;
    }

    if (spec.startsWith("@bthwani/") && aliases.has(spec) && !aliasExists(spec)) {
      violations.push({
        file,
        line: lineNumber(content, item.index),
        message: `tsconfig alias target does not exist: ${spec}`
      });
    }
  }
}

fail(guardId, violations);
