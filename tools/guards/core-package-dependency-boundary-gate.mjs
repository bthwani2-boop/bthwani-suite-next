import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CORE_PACKAGES = new Set([
  "identity",
  "platform-control",
  "providers",
  "workforce",
]);

export function sourceUsesReact(text) {
  return (
    /\bfrom\s+["']react["']/.test(text) ||
    /\brequire\(\s*["']react["']\s*\)/.test(text) ||
    /\bimport\(\s*["']react["']\s*\)/.test(text)
  );
}

export function manifestDeclaresReact(manifest) {
  for (const section of [
    "dependencies",
    "peerDependencies",
    "devDependencies",
    "optionalDependencies",
  ]) {
    const deps = manifest?.[section] ?? {};
    if ("react" in deps || "@types/react" in deps) return true;
  }
  return false;
}

export function analyzeReactBoundary({
  packageName,
  manifest,
  sourceTexts,
}) {
  const usesReact = sourceTexts.some(sourceUsesReact);
  const declaresReact = manifestDeclaresReact(manifest);
  const violations = [];

  if (usesReact && !declaresReact) {
    violations.push(
      `${packageName}: source imports React but manifest does not declare React`,
    );
  }

  if (!usesReact && declaresReact) {
    violations.push(
      `${packageName}: manifest declares React/@types/react but source does not use React`,
    );
  }

  return { usesReact, declaresReact, violations };
}

function listSourceFiles(root) {
  const result = [];
  const stack = [root];

  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (
        ["node_modules", "generated", "dist", "coverage"].includes(entry.name)
      ) {
        continue;
      }

      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
        result.push(full);
      }
    }
  }

  return result;
}

export function resolveRepositoryRoot() {
  // This file is canonically located at <repo>/tools/guards/*.mjs.
  // Derive repository identity from the guard itself, never from process.cwd().
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
  );
}

function main() {
  const args = process.argv.slice(2);
  const index = args.indexOf("--package");

  if (index < 0 || !args[index + 1]) {
    console.error(
      "core-package-dependency-boundary-gate: FAIL --package <name> is required",
    );
    process.exit(2);
  }

  const packageName = args[index + 1];
  if (!CORE_PACKAGES.has(packageName)) {
    console.error(
      `core-package-dependency-boundary-gate: FAIL unknown core package '${packageName}'`,
    );
    process.exit(2);
  }

  const repoRoot = resolveRepositoryRoot();
  const packageRoot = path.join(repoRoot, "core", packageName);
  const manifestPath = path.join(packageRoot, "package.json");

  if (!fs.existsSync(manifestPath)) {
    console.error(
      `core-package-dependency-boundary-gate: FAIL package manifest missing '${manifestPath}'`,
    );
    process.exit(2);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const sourceTexts = listSourceFiles(packageRoot).map((file) =>
    fs.readFileSync(file, "utf8"),
  );

  const result = analyzeReactBoundary({
    packageName,
    manifest,
    sourceTexts,
  });

  if (result.violations.length) {
    for (const violation of result.violations) {
      console.error(`core-package-dependency-boundary-gate: ${violation}`);
    }
    process.exit(1);
  }

  console.log(
    `core-package-dependency-boundary-gate: PASS ${packageName} react=${result.usesReact ? "required" : "not-required"}`,
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main();
}
