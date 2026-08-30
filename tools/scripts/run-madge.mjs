import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import madge from "madge";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "../..");
const dshTsConfigPath = path.join(repositoryRoot, "services/dsh/tsconfig.json");

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function resolveExtends(configPath) {
  const config = readJson(configPath);
  const extendsValue = config.extends;
  if (!extendsValue) return config;

  const parentPath = path.resolve(path.dirname(configPath), extendsValue.endsWith(".json") ? extendsValue : `${extendsValue}.json`);
  const parent = resolveExtends(parentPath);
  return {
    ...parent,
    ...config,
    compilerOptions: {
      ...(parent.compilerOptions ?? {}),
      ...(config.compilerOptions ?? {}),
    },
  };
}

const madgeConfig = {
  baseDir: repositoryRoot,
  fileExtensions: ["ts", "tsx"],
  // Madge's CLI path parser is incompatible with this repository's TypeScript 6
  // config parser. Passing the already merged raw config keeps the resolver on
  // the same package-exports-aware TypeScript path used by the application.
  tsConfig: resolveExtends(dshTsConfigPath),
  tsConfigPath: dshTsConfigPath,
};

try {
  const graph = await madge([
    "services/dsh/frontend",
    "services/dsh/frontend/wlt",
    "apps/control-panel/runtime/src",
  ], madgeConfig);
  const circular = graph.circular();
  const skipped = graph.warnings().skipped;

  console.log(`Processed ${Object.keys(graph.obj()).length} files`);
  if (circular.length > 0) {
    circular.forEach((entry, index) => console.log(`${index + 1}) ${entry.join(" > ")}`));
  }
  if (skipped.length > 0) {
    console.log(`\n✖ Skipped ${skipped.length} files`);
    skipped.forEach((entry) => console.log(entry));
  }
  if (circular.length === 0) console.log("\n√ No circular dependency found!");

  process.exitCode = circular.length === 0 && skipped.length === 0 ? 0 : 1;
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
