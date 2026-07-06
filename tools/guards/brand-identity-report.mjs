/**
 * tools/guards/brand-identity-report.mjs
 *
 * Scans the repository for visual design system adoption and compliance.
 * Generates a visual identity health report as Markdown.
 *
 * Metrics:
 *   1. App provider wrap (BthwaniUiProvider)
 *   2. Raw hex/rgb color occurrences by app/service
 *   3. Raw layout spacing/radius values by app/service
 *   4. IconButton accessibility label compliance
 *   5. Unapproved icon pack imports
 *
 * Writes to .diagnostics/tools/brand-identity-report.md
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listCodeFiles, read } from "./_guard-utils.mjs";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const MOBILE_APPS = [
  { name: "app-captain", file: "apps/app-captain/runtime/src/App.tsx" },
  { name: "app-client",  file: "apps/app-client/runtime/src/App.tsx" },
  { name: "app-field",   file: "apps/app-field/runtime/src/App.tsx" },
  { name: "app-partner", file: "apps/app-partner/runtime/src/App.tsx" },
];

function inScope(f) {
  if (!/\.(tsx|jsx|ts|js)$/.test(f)) return false;
  if (f.startsWith("shared/ui-kit/")) return false;
  if (f.includes("node_modules")) return false;
  if (f.includes("generated")) return false;
  if (f.includes(".test.") || f.includes(".spec.") || f.includes("__tests__")) return false;
  if (f.includes("android/") || f.includes("ios/")) return false;
  if (f.includes("/styles/") || f.includes("/theme/")) return false;
  if (f.startsWith("tools/")) return false;
  
  const inApps = /^apps\//.test(f);
  const inServicesFrontend = /^services\/[^/]+\/frontend\//.test(f);
  return inApps || inServicesFrontend;
}

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

// 1. Provider Wrapper compliance
let totalApps = MOBILE_APPS.length;
let wrappedApps = 0;
const appProviderStatus = [];

for (const app of MOBILE_APPS) {
  const p = path.join(repoRoot, app.file);
  let status = "❌ Missing";
  if (fs.existsSync(p)) {
    const c = fs.readFileSync(p, "utf8");
    if (c.includes("BthwaniUiProvider")) {
      wrappedApps++;
      status = "✅ Wrapped";
    }
  } else {
    status = "⚠️ File not found";
  }
  appProviderStatus.push({ name: app.name, status });
}

// Check Web Layout
const cpLayout = path.join(repoRoot, "apps/control-panel/runtime/src/app/layout.tsx");
let webThemeStatus = "❌ Missing";
if (fs.existsSync(cpLayout)) {
  const c = fs.readFileSync(cpLayout, "utf8");
  if (c.includes("WebThemeStyle")) {
    webThemeStatus = "✅ WebThemeStyle Injected";
  }
}

// 2. Scan raw colors, raw layout values, icon labels
let rawColorCount = 0;
let rawLayoutCount = 0;
let missingIconButtonLabels = 0;
let forbiddenIconPackImports = 0;

const files = listCodeFiles().filter(inScope);

const RAW_SPACING_MARGIN = /\b(padding|margin|gap|borderRadius|radius|fontSize|zIndex)(?:Left|Right|Top|Bottom|Horizontal|Vertical)?\s*:\s*(?:["']?(\d+)(?:px)?["']?|(\d+))\b/g;
const FORBIDDEN_ICON_PACKS = ["lucide-react", "lucide-react-native", "react-native-vector-icons", "@expo/vector-icons", "feather-icons"];

for (const file of files) {
  const content = read(file);
  const isControlPanel = file.startsWith("apps/control-panel/");
  const isExcludedFromColors = file.endsWith("layout.tsx") || file.endsWith("config.js") || file.endsWith("config.ts");

  // Raw color scan
  if (!isExcludedFromColors) {
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const cleanLine = line.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "").trim();
      if (cleanLine.length === 0) continue;

      let lineToTest = cleanLine;
      if (isControlPanel) {
        lineToTest = stripCssVars(cleanLine);
      }

      const hasHex = /#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/gi.test(lineToTest);
      const hasCssColor = /\b(?:rgb|rgba|hsl|hsla)\([^)]+\)/gi.test(lineToTest);

      if (hasHex || hasCssColor) {
        rawColorCount++;
      }
    }
  }

  // Spacing & layout scan
  let m;
  RAW_SPACING_MARGIN.lastIndex = 0;
  while ((m = RAW_SPACING_MARGIN.exec(content)) !== null) {
    const prop = m[1];
    const val = parseInt(m[2] || m[3], 10);
    if (val === 0) continue;
    if (val <= 2 && (prop === "borderWidth" || prop === "borderRadius" || prop === "radius")) continue;
    rawLayoutCount++;
  }

  // Icon pack scan
  for (const pack of FORBIDDEN_ICON_PACKS) {
    if (content.includes(`from "${pack}"`) || content.includes(`from '${pack}'`)) {
      forbiddenIconPackImports++;
    }
  }

  // IconButton label scan
  const ICON_BUTTON_OPEN = /<IconButton\b/g;
  while ((m = ICON_BUTTON_OPEN.exec(content)) !== null) {
    const snippet = content.slice(m.index, m.index + 500);
    const nextTag = snippet.indexOf("<IconButton", 1);
    const scope = nextTag !== -1 ? snippet.slice(0, nextTag) : snippet;
    if (!scope.includes("accessibilityLabel") && !scope.includes("aria-label")) {
      missingIconButtonLabels++;
    }
  }
}

// Generate Markdown Report
const report = `# Brand Visual Identity Health Report

تقرير حوكمة الهوية البصرية ونظام التصميم للمشروع.

---

## 1. تغطية الـ Provider وتفعيل السمات (Provider Adoption)
معدل تغطية BthwaniUiProvider في التطبيقات.

| التطبيق | حالة التفعيل |
| :--- | :--- |
${appProviderStatus.map((s) => `| ${s.name} | ${s.status} |`).join("\n")}
| **control-panel (Web)** | ${webThemeStatus} |

**النسبة الإجمالية للتغطية:** ${~~((wrappedApps + (webThemeStatus.startsWith("✅") ? 1 : 0)) / (totalApps + 1) * 100)}%

---

## 2. المخالفات البصرية المكتشفة (Visual Identity Violations)
إجمالي الاستخدامات غير المتوافقة لخصائص التصميم والألوان.

| نوع المخالفة | العدد المكتشف | الحالة والتوصية |
| :--- | :---: | :--- |
| **الألوان العشوائية (Raw Colors)** | **${rawColorCount}** | ❌ استخدام ألوان خارج الهوية (Hex/RGB). يرجى التحويل لـ \`colorRoles\` أو متغيرات CSS. |
| **التباعد والهوامش العشوائية (Raw Layout)** | **${rawLayoutCount}** | ⚠️ قيم تباعد أو مقاس خطوط غير متوافقة. يرجى استخدام \`spacing\` أو \`radius\` tokens. |
| **أزرار الأيقونات بلا وصف (IconButton missing label)** | **${missingIconButtonLabels}** | ❌ أزرار تفاعلية بلا وصف قراءة صوتية. يجب إضافة \`accessibilityLabel\`. |
| **استيراد حزم أيقونات غير معتمدة** | **${forbiddenIconPackImports}** | ❌ استخدام مباشر لـ Lucide أو Expo outside ui-kit. يرجى التحويل لـ \`<Icon>\`. |

---

## 3. التوصيات النهائية (Governance Verdict)
*   **حالة الهوية:** ${rawColorCount === 0 && wrappedApps === totalApps ? "✅ متوافقة 100%" : "⚠️ تحتاج لتعديلات وتطوير"}
*   **الخطوة القادمة:** تشغيل الأمر \`pnpm run diagnostics:ui-kit\` محلياً لمعرفة تفاصيل وأماكن الأسطر المخالفة لتصحيحها.
`;

// Write to diagnostics
try {
  const diagDir = path.join(repoRoot, ".diagnostics/tools");
  fs.mkdirSync(diagDir, { recursive: true });
  fs.writeFileSync(path.join(diagDir, "brand-identity-report.md"), report, "utf8");
  console.log(`\n  Report written to .diagnostics/tools/brand-identity-report.md`);
} catch (e) {
  console.error("Could not write report file:", e.message);
}

console.log("\n--- BRAND IDENTITY REPORT GENERATION COMPLETE ---");
console.log(`  Raw Colors:        ${rawColorCount}`);
console.log(`  Raw Layout Values: ${rawLayoutCount}`);
console.log(`  Missing Labels:    ${missingIconButtonLabels}`);
console.log(`  Forbidden Icons:   ${forbiddenIconPackImports}`);
console.log("-------------------------------------------------");
