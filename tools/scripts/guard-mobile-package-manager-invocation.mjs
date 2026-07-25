import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const governedFiles = [
  "tools/scripts/eas-build-mobile.mjs",
  "tools/scripts/export-mobile-app.mjs",
  "tools/scripts/guard-mobile-apps.mjs",
  "tools/scripts/sync-mobile-apps.mjs",
  "tools/scripts/verify-mobile-prebuild.mjs",
];
const helperImport = "./lib/package-manager-invocation.mjs";
const failures = [];

for (const relativePath of governedFiles) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: missing`);
    continue;
  }

  const source = fs.readFileSync(absolutePath, "utf8");
  if (!source.includes(helperImport)) {
    failures.push(`${relativePath}: must use the central package-manager invocation helper`);
  }
  if (source.includes("npm_execpath")) {
    failures.push(`${relativePath}: direct npm_execpath coupling is forbidden`);
  }
  if (/shell\s*:\s*true/.test(source)) {
    failures.push(`${relativePath}: shell:true is forbidden in the mobile build pipeline`);
  }
}

if (failures.length > 0) {
  console.error("FAIL: mobile package-manager invocation policy drift detected");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("PASS: mobile package-manager invocation is centralized and shell-independent");
