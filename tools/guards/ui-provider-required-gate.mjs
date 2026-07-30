import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "ui-provider-required-gate";
const violations = [];

const MOBILE_APPS = [
  "app-client",
  "app-partner",
  "app-captain",
  "app-field",
];

function count(content, pattern) {
  return [...content.matchAll(pattern)].length;
}

for (const name of MOBILE_APPS) {
  const indexRelative = `apps/${name}/runtime/src/index.ts`;
  const appRelative = `apps/${name}/runtime/src/App.tsx`;
  const indexPath = path.join(repoRoot, indexRelative);
  const appPath = path.join(repoRoot, appRelative);

  if (!fs.existsSync(indexPath)) {
    violations.push({ file: indexRelative, message: "Missing mobile root entry." });
    continue;
  }
  if (!fs.existsSync(appPath)) {
    violations.push({ file: appRelative, message: "Missing mobile App component." });
    continue;
  }

  const indexContent = fs.readFileSync(indexPath, "utf8");
  const appContent = fs.readFileSync(appPath, "utf8");

  const uiProviderRoots =
    count(indexContent, /React\.createElement\(\s*BthwaniUiProvider\b/g) +
    count(indexContent, /<BthwaniUiProvider\b/g);

  const safeAreaRoots =
    count(indexContent, /React\.createElement\(\s*SafeAreaProvider\b/g) +
    count(indexContent, /<SafeAreaProvider\b/g);

  if (!indexContent.includes('from "@bthwani/ui-kit"') || uiProviderRoots !== 1) {
    violations.push({
      file: indexRelative,
      message: `Expected exactly one BthwaniUiProvider at the runtime root; found ${uiProviderRoots}.`,
    });
  }

  if (!indexContent.includes('from "react-native-safe-area-context"') || safeAreaRoots !== 1) {
    violations.push({
      file: indexRelative,
      message: `Expected exactly one SafeAreaProvider at the runtime root; found ${safeAreaRoots}.`,
    });
  }

  if (/\bBthwaniUiProvider\b/.test(appContent)) {
    violations.push({
      file: appRelative,
      message: "Nested BthwaniUiProvider is forbidden; the provider belongs in src/index.ts only.",
    });
  }

  if (/\bSafeAreaProvider\b/.test(appContent)) {
    violations.push({
      file: appRelative,
      message: "Nested SafeAreaProvider is forbidden; the provider belongs in src/index.ts only.",
    });
  }
}

const cpLayout = path.join(repoRoot, "apps/control-panel/runtime/src/app/layout.tsx");
if (fs.existsSync(cpLayout)) {
  const content = fs.readFileSync(cpLayout, "utf8");
  if (!content.includes("WebThemeStyle")) {
    violations.push({
      file: "apps/control-panel/runtime/src/app/layout.tsx",
      message: "Next.js RootLayout is missing WebThemeStyle.",
    });
  }
}

fail(guardId, violations);
