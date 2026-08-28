import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "@typescript/typescript6";

const TYPESCRIPT_SOURCE = /\.(?:ts|tsx)$/i;
const ROOT_RELATIVE_PREFIXES = ["apps/", "core/", "services/", "shared/", "tools/"];
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function resolveFile(base) {
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, defaultResolve) {
  if (context.parentURL?.startsWith("file:")) {
    const parent = path.dirname(fileURLToPath(context.parentURL));
    const base = specifier.startsWith(".")
      ? path.resolve(parent, specifier)
      : ROOT_RELATIVE_PREFIXES.some((prefix) => specifier.startsWith(prefix))
        ? path.resolve(REPO_ROOT, specifier)
        : null;
    const resolved = base && resolveFile(base);
    if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true };
  }
  return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
  if (!url.startsWith("file:")) return defaultLoad(url, context, defaultLoad);
  const filename = fileURLToPath(url);
  if (!TYPESCRIPT_SOURCE.test(filename)) return defaultLoad(url, context, defaultLoad);
  const source = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      sourceMap: true,
      inlineSourceMap: true,
      inlineSources: true,
    },
  });
  return { format: "module", source: result.outputText, shortCircuit: true };
}
