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

fail(guardId, violations);
