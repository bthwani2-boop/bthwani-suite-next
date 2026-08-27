/**
 * tools/guards/ui-provider-required-gate.mjs
 *
 * Canonical enforcement: every runtime surface must mount exactly one UI
 * provider at its root, and that provider must be the canonical composition
 * owner for its platform.
 *
 * Mobile (apps/app-{client,partner,captain,field}/runtime/src/index.ts):
 *   - Exactly one `MobileUiProvider` from `@bthwani/ui-kit/mobile`.
 *   - Direct `BthwaniUiProvider` usage is FORBIDDEN here — it is the internal
 *     composition of `MobileUiProvider` (which owns mobile-only concerns:
 *     `useColorScheme`, native icon renderer configuration). This canonical
 *     cutover happened in commit 0099b9d57 (2026-08-22).
 *   - Exactly one `SafeAreaProvider` at the same root.
 *   - App.tsx must NOT contain either provider (no nested providers).
 *
 * Web (apps/control-panel/runtime/src/app/layout.tsx):
 *   - Must render `<WebThemeStyle />` to inject canonical CSS variables.
 */
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

  const mobileProviderRoots =
    count(indexContent, /React\.createElement\(\s*MobileUiProvider\b/g) +
    count(indexContent, /<MobileUiProvider\b/g);

  const safeAreaRoots =
    count(indexContent, /React\.createElement\(\s*SafeAreaProvider\b/g) +
    count(indexContent, /<SafeAreaProvider\b/g);

  // Direct BthwaniUiProvider usage is forbidden in mobile runtime — it is the
  // internal composition of the canonical MobileUiProvider.
  const directBthwaniProviderRoots =
    count(indexContent, /React\.createElement\(\s*BthwaniUiProvider\b/g) +
    count(indexContent, /<BthwaniUiProvider\b/g);

  if (!indexContent.includes('from "@bthwani/ui-kit/mobile"') || mobileProviderRoots !== 1) {
    violations.push({
      file: indexRelative,
      message: `Expected exactly one MobileUiProvider from "@bthwani/ui-kit/mobile" at the runtime root; found ${mobileProviderRoots}.`,
    });
  }

  if (directBthwaniProviderRoots !== 0) {
    violations.push({
      file: indexRelative,
      message: `Direct BthwaniUiProvider usage is forbidden in mobile runtime; use MobileUiProvider from "@bthwani/ui-kit/mobile" instead (found ${directBthwaniProviderRoots}).`,
    });
  }

  // App-owned fixed theme is forbidden; MobileUiProvider derives theme from
  // the system color scheme (canonical mobile composition root).
  if (/defaultTheme\s*:\s*["'](?:light|dark)["']/.test(indexContent)) {
    violations.push({
      file: indexRelative,
      message: "App-owned fixed mobile theme is forbidden; MobileUiProvider owns theme resolution.",
    });
  }

  if (!indexContent.includes('from "react-native-safe-area-context"') || safeAreaRoots !== 1) {
    violations.push({
      file: indexRelative,
      message: `Expected exactly one SafeAreaProvider at the runtime root; found ${safeAreaRoots}.`,
    });
  }

  if (/\b(?:BthwaniUiProvider|MobileUiProvider)\b/.test(appContent)) {
    violations.push({
      file: appRelative,
      message: "Nested UI provider is forbidden; the provider belongs in src/index.ts only.",
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
