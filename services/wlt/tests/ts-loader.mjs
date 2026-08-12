import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "@typescript/typescript6";

const TYPESCRIPT_SOURCE = /\.(?:ts|tsx)$/i;

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const parent = path.dirname(fileURLToPath(context.parentURL));
    const base = path.resolve(parent, specifier);
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
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
