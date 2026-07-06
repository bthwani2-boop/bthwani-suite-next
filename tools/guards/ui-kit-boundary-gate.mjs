import fs from "node:fs";
import path from "node:path";
import { fail, findImportSpecifiers, lineNumber, listCodeFiles, listFiles, read, repoRoot } from "./_guard-utils.mjs";

const guardId = "ui-kit-boundary-gate";
const violations = [];

// 1. no-direct-tamagui-outside-ui-kit (Error)
for (const file of listCodeFiles()) {
  if (file.startsWith("shared/ui-kit/")) continue;

  const content = read(file);
  for (const item of findImportSpecifiers(content)) {
    if (item.specifier === "tamagui" || item.specifier.startsWith("@tamagui/")) {
      violations.push({
        file,
        line: lineNumber(content, item.index),
        message: `direct Tamagui import is allowed only inside shared/ui-kit: ${item.specifier}`
      });
    }
  }
}

// 2. no-ui-kit-deep-imports (Error)
for (const file of listCodeFiles()) {
  const content = read(file);
  for (const item of findImportSpecifiers(content)) {
    const spec = item.specifier;
    const ALLOWED_SUBPATHS = ["@bthwani/ui-kit/web", "@bthwani/ui-kit/mobile", "@bthwani/ui-kit/next", "@bthwani/ui-kit/tokens"];
    const isDeepAlias = spec.startsWith("@bthwani/ui-kit/") && !ALLOWED_SUBPATHS.includes(spec);
    const isDeepPath = spec.includes("shared/ui-kit/src/") || spec.includes("shared/ui-kit/tokens/");

    if (isDeepAlias || isDeepPath) {
      violations.push({
        file,
        line: lineNumber(content, item.index),
        message: `import from public @bthwani/ui-kit only, not deep path: ${spec}`
      });
    }
  }
}

// 3. no-local-design-system (Error)
const forbiddenPathRegex = /(^|\/)(design-system|ui-kit|tokens|theme|themes|primitives)(\/|$)/i;
const allowedPrefixes = ["shared/ui-kit/", "governance/", "tools/"];

for (const file of listFiles()) {
  if (allowedPrefixes.some((prefix) => file.startsWith(prefix))) continue;

  if (forbiddenPathRegex.test(file)) {
    violations.push({
      file,
      message: "local design-system/theme/token folder is forbidden outside shared/ui-kit"
    });
  }
}

// 4. no-expo-in-ui-kit (Error)
const packagePath = path.join(repoRoot, "shared/ui-kit/package.json");
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  for (const section of ["dependencies", "peerDependencies", "devDependencies"]) {
    for (const dependency of Object.keys(packageJson[section] ?? {})) {
      if (dependency === "expo" || dependency.startsWith("expo-")) {
        violations.push({ file: "shared/ui-kit/package.json", message: `${section} must not include ${dependency}` });
      }
    }
  }
}

for (const file of listCodeFiles().filter((item) => item.startsWith("shared/ui-kit/") && !item.includes("Icon/Icon.tsx"))) {
  const content = read(file);
  for (const item of findImportSpecifiers(content)) {
    if (item.specifier === "expo" || item.specifier.startsWith("expo-")) {
      violations.push({
        file,
        line: lineNumber(content, item.index),
        message: `Expo import is forbidden in shared/ui-kit: ${item.specifier}`
      });
    }
  }
}

// 5. no-domain-component-in-ui-kit (Error)
const domainPattern = /\b(store|product|cart|checkout|order|wallet|payment|captain|courier|partner|merchant|dispatch|settlement|refund)\b/i;

for (const file of listCodeFiles().filter((item) => item.startsWith("shared/ui-kit/src/components/"))) {
  const baseName = path.basename(file, path.extname(file));
  const content = read(file);
  if (domainPattern.test(baseName)) {
    violations.push({ file, message: `domain-specific component name is forbidden in shared/ui-kit: ${baseName}` });
    continue;
  }

  const exportedSymbols = content.matchAll(/\bexport\s+(?:type|interface|class|function|const)\s+([A-Za-z0-9_]+)/g);
  for (const match of exportedSymbols) {
    if (domainPattern.test(match[1])) {
      violations.push({ file, message: `domain-specific public symbol is forbidden in shared/ui-kit: ${match[1]}` });
    }
  }
}

// 6. no-duplicate-design-primitives (Error)
const allowedPrefixesPrimitives = ["shared/ui-kit/"];
const forbiddenBasenames = new Set([
  "ActionBar",
  "Badge",
  "Button",
  "Card",
  "Chip",
  "DataTable",
  "Dialog",
  "EmptyState",
  "ErrorState",
  "FilterBar",
  "Header",
  "IconButton",
  "ListItem",
  "LoadingState",
  "OfflineState",
  "PermissionState",
  "Sheet",
  "StateView",
  "Surface",
  "Tabs",
  "Text",
  "TextField",
  "Toolbar",
  "CpPrimitives"
]);

for (const file of listCodeFiles()) {
  if (allowedPrefixesPrimitives.some((prefix) => file.startsWith(prefix))) continue;

  const basename = path.basename(file, path.extname(file));
  if (forbiddenBasenames.has(basename)) {
    if (basename === "CpPrimitives" && file === "apps/control-panel/runtime/src/components/CpPrimitives.tsx") {
      continue;
    }
    violations.push({
      file,
      message: `reusable design primitive '${basename}' belongs in shared/ui-kit`
    });
  }
}

// Helper to strip CSS variables (var() and color-mix()) with matching parentheses
function stripCssVars(str) {
  let result = str;
  while (true) {
    const varIdx = result.indexOf("var(");
    const mixIdx = result.indexOf("color-mix(");
    const idx = (varIdx !== -1 && mixIdx !== -1) ? Math.min(varIdx, mixIdx) : (varIdx !== -1 ? varIdx : mixIdx);
    if (idx === -1) break;
    
    let depth = 1;
    let endIdx = -1;
    const startSearch = idx + (result.startsWith("var(", idx) ? 4 : 10);
    for (let j = startSearch; j < result.length; j++) {
      if (result[j] === '(') depth++;
      else if (result[j] === ')') {
        depth--;
        if (depth === 0) {
          endIdx = j;
          break;
        }
      }
    }
    if (endIdx !== -1) {
      result = result.slice(0, idx) + " " + result.slice(endIdx + 1);
    } else {
      result = result.slice(0, idx);
    }
  }
  return result;
}

const warnings = [];

// 7. no-raw-colors-outside-ui-kit (Error)
for (const file of listCodeFiles()) {
  const isExcludedFromColors =
    file.startsWith("shared/ui-kit/") ||
    file.startsWith("tools/") ||
    file.startsWith("governance/") ||
    file.startsWith("infra/") ||
    file.startsWith("contracts/") ||
    file.endsWith(".d.ts") ||
    file.includes("/styles/") ||
    file.endsWith("layout.tsx") ||
    file.endsWith("config.js") ||
    file.endsWith("config.ts");

  if (isExcludedFromColors) continue;

  const content = read(file);
  const lines = content.split(/\r?\n/);
  const isControlPanel = file.startsWith("apps/control-panel/");
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cleanLine = line.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "").trim();
    if (cleanLine.length === 0) continue;

    let lineToTest = cleanLine;
    if (isControlPanel) {
      lineToTest = stripCssVars(cleanLine);
    }

    const hasHex = /#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/gi.test(lineToTest);
    const hasCssColor = /\b(?:rgb|rgba|hsl|hsla)\([^)]+\)/gi.test(lineToTest);

    if (hasHex || hasCssColor) {
      const msg = `FORBIDDEN: raw color value found in styling: "${line.trim()}". Use brand tokens or colorRoles from shared/ui-kit instead.`;
      if (isControlPanel) {
        warnings.push({ file, line: i + 1, message: msg });
      } else {
        violations.push({ file, line: i + 1, message: msg });
      }
    }
  }
}

if (warnings.length > 0) {
  console.log(`\n${guardId} WARNINGS (${warnings.length}):`);
  for (const w of warnings) {
    console.log(`  - ${w.file}:${w.line} ${w.message}`);
  }
}

// 8. platform-imports-validation (Error)
for (const file of listCodeFiles()) {
  const content = read(file);
  const isWebOnly = file.includes("control-panel/") || file.includes("/web/");
  const isMobileOnly = file.includes("app-captain/") || file.includes("app-client/") || file.includes("app-field/") || file.includes("app-partner/") || file.includes("/mobile/");

  for (const item of findImportSpecifiers(content)) {
    const spec = item.specifier;
    
    if (isWebOnly) {
      const isMobileOnlyPkg = spec === "react-native" || spec.startsWith("react-native-") || spec === "expo" || spec.startsWith("expo-") || spec === "@tamagui/native";
      if (isMobileOnlyPkg) {
        violations.push({
          file,
          line: lineNumber(content, item.index),
          message: `FORBIDDEN: importing mobile-only library '${spec}' in web-only / control-panel file`
        });
      }
    }

    if (isMobileOnly) {
      const isWebOnlyPkg = spec.startsWith("next/") || spec === "react-dom" || spec.startsWith("react-dom/") || spec === "@tamagui/web";
      if (isWebOnlyPkg) {
        violations.push({
          file,
          line: lineNumber(content, item.index),
          message: `FORBIDDEN: importing Next.js / web-only library '${spec}' in mobile / Expo file`
        });
      }
    }
  }
}

fail(guardId, violations);
