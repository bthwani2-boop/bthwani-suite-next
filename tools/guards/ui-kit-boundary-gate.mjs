import fs from "node:fs";
import path from "node:path";
import { fail, findImportSpecifiers, lineNumber, listCodeFiles, listFiles, read, repoRoot } from "./_guard-utils.mjs";

const guardId = "ui-kit-boundary-gate";
const violations = [];
const warnings = [];

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
    const ALLOWED_SUBPATHS = ["@bthwani/ui-kit/web", "@bthwani/ui-kit/mobile", "@bthwani/ui-kit/next"];
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

// 4. no-raw-hex-outside-ui-kit-colors (Warning)
const hexRegex = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b/g;

for (const file of listCodeFiles()) {
  if (file === "shared/ui-kit/src/tokens/colors.ts") continue;

  const content = read(file);
  let match;
  while ((match = hexRegex.exec(content))) {
    warnings.push({
      file,
      line: lineNumber(content, match.index),
      message: `raw hex color ${match[0]} is allowed only in shared/ui-kit/src/tokens/colors.ts`
    });
  }
}

// 5. no-expo-in-ui-kit (Error)
const packagePath = path.join(repoRoot, "shared/ui-kit/package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

for (const section of ["dependencies", "peerDependencies", "devDependencies"]) {
  for (const dependency of Object.keys(packageJson[section] ?? {})) {
    if (dependency === "expo" || dependency.startsWith("expo-")) {
      violations.push({ file: "shared/ui-kit/package.json", message: `${section} must not include ${dependency}` });
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

// 6. no-react-native-runtime-dependency-in-ui-kit (Warning)
for (const dependency of ["react-native", "@tamagui/native"]) {
  if (packageJson.dependencies?.[dependency]) {
    warnings.push({
      file: "shared/ui-kit/package.json",
      message: `runtime dependency ${dependency} is forbidden; react-native may only be an optional peer`
    });
  }
}

for (const file of listCodeFiles().filter((item) => item.startsWith("shared/ui-kit/"))) {
  const content = read(file);
  for (const item of findImportSpecifiers(content)) {
    if (item.specifier === "react-native" || item.specifier.startsWith("react-native/")) {
      warnings.push({
        file,
        line: lineNumber(content, item.index),
        message: `direct React Native runtime import is forbidden in shared/ui-kit: ${item.specifier}`
      });
    }
  }
}

// 7. no-safe-area-in-ui-kit-runtime (Error)
for (const file of listCodeFiles().filter((item) => item.startsWith("shared/ui-kit/"))) {
  const content = read(file);
  for (const item of findImportSpecifiers(content)) {
    if (item.specifier.includes("safe-area")) {
      violations.push({
        file,
        line: lineNumber(content, item.index),
        message: `safe-area ownership belongs to shared/app-shell or apps runtime: ${item.specifier}`
      });
    }
  }
}

// 8. no-vector-icons-direct-in-ui-kit (Error)
for (const file of listCodeFiles().filter((item) => item.startsWith("shared/ui-kit/") && !item.includes("Icon/Icon."))) {
  const content = read(file);
  for (const item of findImportSpecifiers(content)) {
    if (item.specifier === "@expo/vector-icons" || item.specifier.includes("vector-icons")) {
      violations.push({
        file,
        line: lineNumber(content, item.index),
        message: `direct vector icon dependency is forbidden; accept icon nodes through component props: ${item.specifier}`
      });
    }
  }
}

// 9. no-domain-component-in-ui-kit (Error)
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

// 10. no-app-shell-design-ownership (Error)
const FORBIDDEN_DESIGN_SYMBOLS = /\b(Cp[A-Z]\w+|ControlPanelShell|ControlPanelTopBar|ControlPanelNavigation|DataTablePageFrame|DetailPageFrame|OverviewPageFrame|QueuePageFrame|OperationsRoomFrame|EditorPageFrame|ReviewPageFrame|MetricsPageFrame|SettingsPageFrame|FinanceReadOnlyFrame|PaginationToolbar)\b/;

for (const file of listCodeFiles().filter((f) => f.startsWith("shared/app-shell/src/"))) {
  const content = read(file);
  const exportLines = content
    .split("\n")
    .filter((line) => /\bexport\b/.test(line) && !/^\s*\/\//.test(line) && !/export type/.test(line));

  for (const line of exportLines) {
    if (FORBIDDEN_DESIGN_SYMBOLS.test(line)) {
      violations.push({
        file,
        message: `design symbol must not be exported from app-shell: ${line.trim().slice(0, 120)}`,
      });
    }
  }
}

// 11. no-duplicate-design-primitives (Error)
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
  "Screen",
  "Sheet",
  "StateView",
  "Surface",
  "Tabs",
  "Text",
  "TextField",
  "Toolbar",
]);

for (const file of listCodeFiles()) {
  if (allowedPrefixesPrimitives.some((prefix) => file.startsWith(prefix))) continue;

  const basename = path.basename(file, path.extname(file));
  if (forbiddenBasenames.has(basename) || (basename === "CpPrimitives" && file !== "apps/control-panel/runtime/src/components/CpPrimitives.tsx")) {
    violations.push({
      file,
      message: `reusable design primitive '${basename}' belongs in shared/ui-kit`,
    });
  }
}

// 12. no-unsafe-ui-kit-tamagui-casts (Warning)
const unsafePattern = /\bas\s+any\b|=>\s*any\b|:\s*any\b/g;

for (const file of listCodeFiles().filter((item) => item.startsWith("shared/ui-kit/src/"))) {
  const content = read(file);
  let match;
  while ((match = unsafePattern.exec(content))) {
    warnings.push({
      file,
      line: lineNumber(content, match.index),
      message: "explicit any or any-cast is forbidden; use the typed internal Tamagui compatibility adapter"
    });
  }
}

// 13. ui-kit-token-binding (Error)
const fileShared = "shared/ui-kit/src/components/_shared.tsx";
const textFile = "shared/ui-kit/src/components/Text/Text.tsx";
const contentShared = read(fileShared);
const textContent = read(textFile);

const requiredPatterns = [
  [/\btypography\b/, "shared component recipes must import typography tokens"],
  [/\bsizing\b/, "shared component recipes must import sizing tokens"],
  [/\bspacing\b/, "shared component recipes must import spacing tokens"],
  [/\.\.\.typography/, "text role variants must derive from typography tokens"],
  [/sizing\.controlSm/, "small controls must derive from sizing tokens"],
  [/sizing\.controlMd/, "medium controls must derive from sizing tokens"],
  [/sizing\.controlLg/, "large controls must derive from sizing tokens"]
];

for (const [pattern, message] of requiredPatterns) {
  if (!pattern.test(contentShared)) violations.push({ file: fileShared, message });
}

const forbiddenPatterns = [
  [/display:\s*\{\s*fontSize:/, "typography role literals must not be duplicated in component recipes"],
  [/sm:\s*\{\s*minHeight:\s*\d/, "control height literals must not be duplicated in component recipes"],
  [/md:\s*\{\s*minHeight:\s*\d/, "control height literals must not be duplicated in component recipes"],
  [/lg:\s*\{\s*minHeight:\s*\d/, "control height literals must not be duplicated in component recipes"]
];

for (const [pattern, message] of forbiddenPatterns) {
  if (pattern.test(contentShared)) violations.push({ file: fileShared, message });
}

if (/color\?\s*:\s*string/.test(textContent)) {
  violations.push({
    file: textFile,
    message: "Text must expose semantic tone roles, not an arbitrary color string"
  });
}

if (warnings.length > 0) {
  console.warn(`\nui-kit-boundary-gate: ${warnings.length} WARNING(S)`);
  for (const warning of warnings) {
    console.warn(`- ${warning.file}${warning.line ? `:${warning.line}` : ""} ${warning.message}`);
  }
}

fail(guardId, violations);
