/**
 * tools/guards/icon-contract-gate.mjs
 *
 * Enforces the brand-icon governance rules:
 *   1. No direct imports of raw icon libraries (lucide-react, lucide-react-native, expo vector icons)
 *      outside shared/ui-kit/. All components must use the central <Icon> component.
 *   2. AnyIconButton (IconButton from @bthwani/ui-kit) or custom Pressable serving as an
 *      icon button must have an accessibilityLabel defined.
 *
 * Scope: apps-src + services-frontend
 */

import fs from "node:fs";
import path from "node:path";
import { fail, findImportSpecifiers, lineNumber, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "icon-contract-gate";
const violations = [];

const FORBIDDEN_ICON_PACKS = new Set([
  "lucide-react",
  "lucide-react-native",
  "react-native-vector-icons",
  "@expo/vector-icons",
  "feather-icons",
]);

for (const file of listCodeFiles()) {
  const isInsideUiKit = file.startsWith("shared/ui-kit/");
  if (isInsideUiKit) continue;
  if (file.startsWith("tools/")) continue;

  const content = read(file);

  // 1. Check forbidden direct icon pack imports
  const imports = findImportSpecifiers(content);
  for (const imp of imports) {
    if (FORBIDDEN_ICON_PACKS.has(imp.specifier) || imp.specifier.startsWith("react-native-vector-icons/")) {
      violations.push({
        file,
        line: lineNumber(content, imp.index),
        message: `FORBIDDEN: Direct import of raw icon package '${imp.specifier}' is forbidden outside shared/ui-kit. Use <Icon> component instead.`,
      });
    }
  }

  // 2. Check IconButton accessibility labels
  // Matches: <IconButton
  // We make sure it defines accessibilityLabel or aria-label within its tag context
  const ICON_BUTTON_OPEN = /<IconButton\b/g;
  let m;
  while ((m = ICON_BUTTON_OPEN.exec(content)) !== null) {
    const snippet = content.slice(m.index, m.index + 500);
    const nextTag = snippet.indexOf("<IconButton", 1);
    const scope = nextTag !== -1 ? snippet.slice(0, nextTag) : snippet;
    
    if (scope.includes("accessibilityLabel") || scope.includes("aria-label")) continue;
    
    violations.push({
      file,
      line: lineNumber(content, m.index),
      message: "FORBIDDEN: <IconButton> is missing accessibilityLabel (or aria-label) for screen readers.",
    });
  }
}

fail(guardId, violations);
