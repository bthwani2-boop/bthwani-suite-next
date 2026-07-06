/**
 * tools/guards/ui-provider-required-gate.mjs
 *
 * Verifies that all runtime apps wrap their entry point in BthwaniUiProvider
 * to guarantee that theme tokens, styles, and branding are applied.
 *
 * Checks:
 *   - apps/app-name/runtime/src/App.tsx (must contain BthwaniUiProvider and import it)
 *   - apps/control-panel/runtime/src/app/layout.tsx (or providers.tsx) (must use WebThemeStyle or Bthwani providers)
 *
 * Output: UI_PROVIDER_REQUIRED_GATE: PASS / FAIL
 */

import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "ui-provider-required-gate";
const violations = [];

const MOBILE_APPS = [
  { name: "app-captain", file: "apps/app-captain/runtime/src/App.tsx" },
  { name: "app-client",  file: "apps/app-client/runtime/src/App.tsx" },
  { name: "app-field",   file: "apps/app-field/runtime/src/App.tsx" },
  { name: "app-partner", file: "apps/app-partner/runtime/src/App.tsx" },
];

for (const app of MOBILE_APPS) {
  const fullPath = path.join(repoRoot, app.file);
  if (!fs.existsSync(fullPath)) continue;

  const content = fs.readFileSync(fullPath, "utf8");

  const hasImport = content.includes("BthwaniUiProvider");
  const hasWrapper = /<BthwaniUiProvider\b/.test(content);

  if (!hasImport || !hasWrapper) {
    violations.push({
      file: app.file,
      message: `FORBIDDEN: App entry file does not import or wrap the root component tree in <BthwaniUiProvider> from @bthwani/ui-kit.`,
    });
  }
}

// Check Next.js Control Panel app router (layout or providers)
const cpLayout = path.join(repoRoot, "apps/control-panel/runtime/src/app/layout.tsx");
if (fs.existsSync(cpLayout)) {
  const content = fs.readFileSync(cpLayout, "utf8");
  const hasWebThemeStyle = content.includes("WebThemeStyle");
  
  if (!hasWebThemeStyle) {
    violations.push({
      file: "apps/control-panel/runtime/src/app/layout.tsx",
      message: "FORBIDDEN: Next.js RootLayout is missing <WebThemeStyle /> import/tag to inject token CSS variables.",
    });
  }
}

fail(guardId, violations);
