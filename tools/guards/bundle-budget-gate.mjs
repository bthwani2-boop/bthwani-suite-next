import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "bundle-budget-gate";
const violations = [];

const uiKitPackageFile = "shared/ui-kit/package.json";
const uiKitPackagePath = path.join(repoRoot, uiKitPackageFile);
if (!fs.existsSync(uiKitPackagePath)) {
  violations.push({ file: uiKitPackageFile, message: "UI_KIT_PACKAGE_MISSING" });
} else {
  const pkg = JSON.parse(fs.readFileSync(uiKitPackagePath, "utf8"));
  if (pkg.sideEffects !== false) {
    violations.push({
      file: uiKitPackageFile,
      message: `TREE_SHAKE_CONTRACT_MISSING: sideEffects must be false, received ${JSON.stringify(pkg.sideEffects)}`,
    });
  }
}

const sizeLimitFile = ".size-limit.json";
const sizeLimitPath = path.join(repoRoot, sizeLimitFile);
if (!fs.existsSync(sizeLimitPath)) {
  violations.push({ file: sizeLimitFile, message: "PRODUCTION_BUNDLE_BUDGET_MISSING" });
} else {
  let budgets;
  try {
    budgets = JSON.parse(fs.readFileSync(sizeLimitPath, "utf8"));
  } catch (error) {
    violations.push({ file: sizeLimitFile, message: `INVALID_BUNDLE_BUDGET_JSON:${error.message}` });
  }
  if (!Array.isArray(budgets) || budgets.length === 0) {
    violations.push({ file: sizeLimitFile, message: "EMPTY_BUNDLE_BUDGET" });
  } else {
    for (const [index, budget] of budgets.entries()) {
      if (
        !budget ||
        typeof budget.name !== "string" ||
        typeof budget.path !== "string" ||
        typeof budget.limit !== "string"
      ) {
        violations.push({ file: sizeLimitFile, message: `MALFORMED_BUNDLE_BUDGET:${index}` });
        continue;
      }
      if (!budget.path.includes(".next/static/chunks") && !budget.path.includes("dist/")) {
        violations.push({
          file: sizeLimitFile,
          message: `SOURCE_FILE_IS_NOT_A_BUNDLE_BUDGET:${budget.path}`,
        });
      }
    }
  }
}

const KNOWN_HEAVY_DEPS = new Set([
  "moment",
  "lodash",
  "underscore",
  "recharts",
  "chart.js",
  "react-chartjs-2",
  "victory",
  "d3",
  "@pdf-lib/fontkit",
  "pdfkit",
  "jspdf",
  "puppeteer",
  "playwright",
  "three",
  "@react-three/fiber",
  "xlsx",
  "exceljs",
  "ffmpeg",
  "@ffmpeg/ffmpeg",
  "tensorflowjs",
  "@tensorflow/tfjs",
]);

const APP_ROOTS = [
  "apps/app-client/runtime",
  "apps/app-partner/runtime",
  "apps/app-captain/runtime",
  "apps/app-field/runtime",
  "apps/control-panel/runtime",
];
const MOBILE_ROOTS = new Set(APP_ROOTS.filter((root) => !root.includes("control-panel")));
const versionsByDependency = new Map();

for (const appRoot of APP_ROOTS) {
  const packageFile = `${appRoot}/package.json`;
  const packagePath = path.join(repoRoot, packageFile);
  if (!fs.existsSync(packagePath)) {
    violations.push({ file: packageFile, message: "APPLICATION_PACKAGE_MISSING" });
    continue;
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  } catch (error) {
    violations.push({ file: packageFile, message: `INVALID_APPLICATION_PACKAGE:${error.message}` });
    continue;
  }

  const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const [dependency, version] of Object.entries(dependencies)) {
    if (!versionsByDependency.has(dependency)) versionsByDependency.set(dependency, new Map());
    const versions = versionsByDependency.get(dependency);
    if (!versions.has(version)) versions.set(version, []);
    versions.get(version).push(appRoot);

    if (MOBILE_ROOTS.has(appRoot) && KNOWN_HEAVY_DEPS.has(dependency)) {
      violations.push({
        file: packageFile,
        message: `HEAVY_MOBILE_DEPENDENCY_FORBIDDEN:${dependency}@${version}`,
      });
    }
  }
}

for (const [dependency, versions] of versionsByDependency) {
  if (versions.size <= 1) continue;
  const detail = [...versions.entries()]
    .map(([version, roots]) => `${version}:${roots.join(",")}`)
    .join(" | ");
  violations.push({
    file: "pnpm-lock.yaml",
    message: `APPLICATION_DEPENDENCY_VERSION_DRIFT:${dependency}:${detail}`,
  });
}

fail(guardId, violations);
