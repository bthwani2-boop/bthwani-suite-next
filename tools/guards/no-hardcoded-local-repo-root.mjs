import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot, toPosix } from "./_guard-utils.mjs";

const TARGETS = [
  "infra",
  "tools",
  ".github",
  "package.json",
  "docs/runtime",
  "services"
];

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
  "graphify-out",
  "evidence",
  "screenshots",
  "recordings",
  "visual-evidence",
  "generated",
  "__generated__",
  "android",
  "ios"
]);

const EXCLUDED_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico",
  "mp4", "mov", "avi", "pdf",
  "zip", "7z", "rar", "tar", "gz",
  "map", "log", "har", "sqlite", "db", "db-shm", "db-wal",
  "tsbuildinfo", "apk", "aab", "ipa"
]);

function walk(targetPath, files = []) {
  if (!fs.existsSync(targetPath)) return files;
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    const rel = toPosix(path.relative(repoRoot, targetPath));
    const name = path.basename(targetPath);
    const ext = path.extname(name).toLowerCase().slice(1);
    if (!EXCLUDED_EXTENSIONS.has(ext)) {
      files.push({ full: targetPath, rel });
    }
    return files;
  }

  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    const full = path.join(targetPath, entry.name);
    const rel = toPosix(path.relative(repoRoot, full));
    const name = entry.name;

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(name)) continue;
      walk(full, files);
    } else {
      const ext = path.extname(name).toLowerCase().slice(1);
      if (EXCLUDED_EXTENSIONS.has(ext)) continue;
      files.push({ full, rel });
    }
  }
  return files;
}

const allFiles = [];
for (const target of TARGETS) {
  walk(path.join(repoRoot, target), allFiles);
}

const violations = [];

// Patterns to detect:
// 1. C:\bthwani-suite-next
// 2. C:/bthwani-suite-next
// 3. /home/[^/]+/bthwani-suite-next
const hardcodedPathRegexes = [
  /c:\\bthwani-suite-next/i,
  /c:\/bthwani-suite-next/i,
  /\/home\/[^/]+\/bthwani-suite-next/i,
  /\\home\\[^\\]+\\bthwani-suite-next/i
];

const setLocationRegex = /Set-Location\s+([^\r\n#]+)/i;

for (const file of allFiles) {
  if (file.rel === "tools/guards/no-hardcoded-local-repo-root.mjs") continue;

  let content;
  try {
    content = fs.readFileSync(file.full, "utf8");
  } catch {
    continue;
  }

  // If the file itself is tagged with ALLOW_LOCAL_PATH_EXAMPLE, skip it entirely
  if (content.includes("ALLOW_LOCAL_PATH_EXAMPLE")) {
    continue;
  }

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check hardcoded paths
    let matched = false;
    for (const regex of hardcodedPathRegexes) {
      if (regex.test(line)) {
        violations.push({
          file: file.rel,
          line: i + 1,
          message: `contains hardcoded local repository root path: "${line.trim()}"`
        });
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Check Set-Location
    const setLocMatch = setLocationRegex.exec(line);
    if (setLocMatch) {
      const arg = setLocMatch[1].trim();
      // An absolute path in windows or unix, or containing drive letter, /home/, /Users/, etc.
      // Ignore if it uses variables like $PSScriptRoot or relative paths like . or ..
      const looksLocalHardcoded = (
        /^[a-z]:/i.test(arg) ||
        arg.startsWith("/") ||
        arg.startsWith("\\") ||
        arg.includes("bthwani-suite-next") ||
        arg.includes("home") ||
        arg.includes("Users")
      ) && !arg.includes("$"); // simple heuristic to allow variables

      if (looksLocalHardcoded) {
        violations.push({
          file: file.rel,
          line: i + 1,
          message: `contains hardcoded Set-Location destination: "${line.trim()}"`
        });
      }
    }
  }
}

fail("no-hardcoded-local-repo-root", violations);
