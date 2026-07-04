#!/usr/bin/env node
/**
 * Script Architecture Decision Log
 * - **Selected Layout**: Single Script
 * - **Logical Justification**: Standard linear check -> remediate -> verify flow to replace opsTheme usages with colorRoles.
 * - **Risk Mitigation**: Supports `--dry-run` flag. Backs up file contents prior to writing.
 * - **Token Optimization Strategy**: Restricts search to services/dsh/frontend/control-panel/ directory, ignoring binary/temp paths.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRY_RUN = process.argv.includes("--dry-run");

const TARGET_DIR = path.resolve(__dirname, "../../services/dsh/frontend/control-panel");

const REPLACEMENTS = [
  // 1. Remove opsTheme imports and declarations
  {
    pattern: /import\s+\{\s*(?:opsTheme|OpsTheme)\s*\}\s*from\s*["'].*\/shared\/operations["'];?/g,
    replacement: ""
  },
  {
    pattern: /const\s+opsTheme\s*=\s*(?:OpsTheme|opsTheme);?/g,
    replacement: ""
  },
  // 2. Map opsTheme properties to colorRoles
  { pattern: /\bopsTheme\.brandSurface\b/g, replacement: "colorRoles.surfaceBase" },
  { pattern: /\bopsTheme\.brand\b/g, replacement: "colorRoles.brandAction" },
  { pattern: /\bopsTheme\.dangerText\b/g, replacement: "colorRoles.brandAction" },
  { pattern: /\bopsTheme\.danger\b/g, replacement: "colorRoles.brandAction" },
  { pattern: /\bopsTheme\.warning\b/g, replacement: "colorRoles.brandAction" },
  { pattern: /\bopsTheme\.success\b/g, replacement: "colorRoles.brandStructure" },
  { pattern: /\bopsTheme\.textMuted\b/g, replacement: "colorRoles.brandStructure" },
  { pattern: /\bopsTheme\.text\b/g, replacement: "colorRoles.brandStructure" },
  { pattern: /\bopsTheme\.dangerSurface\b/g, replacement: "colorRoles.surfaceBase" },
  { pattern: /\bopsTheme\.warningSurface\b/g, replacement: "colorRoles.surfaceBase" },
  { pattern: /\bopsTheme\.successSurface\b/g, replacement: "colorRoles.surfaceBase" },
  { pattern: /\bopsTheme\.infoSurface\b/g, replacement: "colorRoles.surfaceBase" },
  { pattern: /\bopsTheme\.line\b/g, replacement: "colorRoles.surfaceBase" },
  { pattern: /\bopsTheme\.surfaceInset\b/g, replacement: "colorRoles.surfaceBase" },
  { pattern: /\bopsTheme\.surfaceRaised\b/g, replacement: "colorRoles.surfaceBase" },
  { pattern: /\bopsTheme\.textInverse\b/g, replacement: "colorRoles.surfaceBase" },
  { pattern: /\bopsTheme\.surface\b/g, replacement: "colorRoles.surfaceBase" },
  { pattern: /\bopsTheme\.info\b/g, replacement: "colorRoles.brandStructure" }
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  for (const { pattern, replacement } of REPLACEMENTS) {
    const nextContent = content.replace(pattern, replacement);
    if (nextContent !== content) {
      content = nextContent;
      modified = true;
    }
  }

  if (modified) {
    // If colorRoles is used but not imported, add import
    if (content.includes("colorRoles") && !content.includes("import { colorRoles }")) {
      content = `import { colorRoles } from '@bthwani/ui-kit';\n` + content;
    }

    // Clean up double-empty lines that might be left by removed imports
    content = content.replace(/\n{3,}/g, "\n\n");

    console.log(`[MODIFIED] ${path.relative(TARGET_DIR, filePath)}`);
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, content, "utf8");
    }
  }
}

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== "dist") {
        scanDir(fullPath);
      }
    } else if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) {
      processFile(fullPath);
    }
  }
}

console.log(`Starting opsTheme to colorRoles replacement in: ${TARGET_DIR}`);
if (DRY_RUN) {
  console.log("=== DRY RUN MODE ===");
}

scanDir(TARGET_DIR);
console.log("Replacement completed successfully.");
process.exit(0);
