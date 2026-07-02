import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const guardId = "no-legacy-slice-labels";
const violations = [];

const regex = /(?<!\.)\b[Ss]lice\b|(?<!\.)\bSLICE\b|\bDSH-\d{2,3}\b|الشريحة|الشرائح/g;

const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  ".pnpm-store",
  ".next",
  ".expo",
  ".turbo",
  ".nx",
  ".cache",
  "dist",
  "build",
  "out",
  "coverage",
  "tmp",
  "temp",
  "logs",
  "evidence",
  "screenshots",
  "recordings",
  "visual-evidence",
  "generated",
  "__generated__",
  ".diagnostics",
  ".github",
  "graphify-out"
]);

function toPosix(filePath) {
  return filePath.replaceAll(path.sep, "/");
}

function shouldScan(relPath, isDir, name) {
  if (isDir) {
    if (EXCLUDED_DIRS.has(name)) return false;
  }
  
  if (relPath.startsWith("tools/registry/runs")) return false;
  if (relPath.startsWith("services/dsh/database/migrations")) return false;
  if (relPath.startsWith("services/dsh/evidence")) return false;
  if (relPath.startsWith("tools/plan/command_old_new")) return false;
  if (relPath === "tools/guards/no-legacy-slice-labels.mjs") return false;
  
  if (!isDir) {
    if (name === "pnpm-lock.yaml" || name === "package-lock.json" || name === "yarn.lock") return false;
    if (name === "package.json") return false;
    if (name === "guard-manifest.json") return false;
    
    const allowedExts = new Set([
      ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".yaml", ".yml", ".json", ".md", ".ps1", ".sql", ".go"
    ]);
    const ext = path.extname(name).toLowerCase();
    if (!allowedExts.has(ext)) return false;
  }
  return true;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = toPosix(path.relative(repoRoot, full));
    
    if (!shouldScan(rel, entry.isDirectory(), entry.name)) continue;
    
    if (entry.isDirectory()) {
      walk(full, files);
    } else {
      files.push(rel);
    }
  }
  return files;
}

function lineNumber(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

const files = walk(repoRoot);

for (const file of files) {
  const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
  let match;
  while ((match = regex.exec(content))) {
    const lineNum = lineNumber(content, match.index);
    const lineContent = content.split(/\r?\n/)[lineNum - 1];
    
    if (lineContent.includes("no-legacy-slice-labels-ignore") || lineContent.includes("@ignore-legacy-slice-labels")) {
      continue;
    }
    
    const isMigrationOrEvidence = /\/evidence\/|\/migrations\/|\/seeds\/|dsh-\d{3}_|\bDSH-\d{3}-/.test(file);
    if (isMigrationOrEvidence) {
      continue;
    }

    violations.push({
      file,
      line: lineNum,
      message: `forbidden legacy slice label or term found: "${match[0]}"`
    });
  }
}

if (violations.length === 0) {
  console.log(`${guardId}: PASS`);
  process.exit(0);
}

console.error(`${guardId}: FAIL`);
for (const violation of violations) {
  console.error(`- ${violation.file}:${violation.line} ${violation.message}`);
}
process.exit(1);
