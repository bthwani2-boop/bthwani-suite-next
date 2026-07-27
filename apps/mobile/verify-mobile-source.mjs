import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const appIndex = process.argv.indexOf("--app");
const appKey = appIndex >= 0 ? process.argv[appIndex + 1] : "";
const appDir = path.join(repoRoot, "apps", appKey, "runtime");

function fail(message) {
  console.error(`mobile-source-verification: ${message}`);
  process.exitCode = 1;
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

if (!appKey || !fs.existsSync(appDir)) {
  fail(`unknown or missing app runtime: ${appKey || "<none>"}`);
} else {
  const files = walk(path.join(appDir, "src"));
  if (files.length === 0) fail(`${appKey}: no TypeScript source files found`);

  const forbidden = [
    [/<<<<<<<|=======|>>>>>>>/, "merge conflict marker"],
    [/@ts-ignore\b/, "@ts-ignore"],
    [/eslint-disable(?:-next-line)?\b/, "eslint disable directive"],
    [/\b(?:describe|it|test)\.only\s*\(/, "focused test"],
    [/\beval\s*\(/, "eval call"],
  ];

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const relative = path.relative(repoRoot, file).replaceAll("\\", "/");
    const sourceFile = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    for (const diagnostic of sourceFile.parseDiagnostics) {
      const line = sourceFile.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line + 1;
      fail(`${relative}:${line}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`);
    }
    for (const [pattern, label] of forbidden) {
      if (pattern.test(source)) fail(`${relative}: forbidden ${label}`);
    }
  }

  if (!process.exitCode) {
    console.log(`mobile-source-verification: PASS app=${appKey} files=${files.length}`);
  }
}
