import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "runtime-real-bindings-gate";
const violations = [];

function read(relative) {
  const full = path.join(repoRoot, relative);
  if (!fs.existsSync(full)) {
    violations.push({ file: relative, line: 0, message: "REQUIRED_FILE_MISSING" });
    return "";
  }
  return fs.readFileSync(full, "utf8");
}

function walk(relativeRoot, predicate, files = []) {
  const fullRoot = path.join(repoRoot, relativeRoot);
  if (!fs.existsSync(fullRoot)) return files;
  for (const entry of fs.readdirSync(fullRoot, { withFileTypes: true })) {
    if (["node_modules", "generated", "__generated__", "dist", "build", ".next"].includes(entry.name)) continue;
    const full = path.join(fullRoot, entry.name);
    const relative = toPosix(path.relative(repoRoot, full));
    if (entry.isDirectory()) walk(relative, predicate, files);
    else if (predicate(relative)) files.push(relative);
  }
  return files;
}

const bindingFiles = [
  ...walk("services/dsh/frontend", (file) => /(?:\.api|\.transport|controller-core|use-[^/]+-controller)\.(?:ts|tsx)$/.test(file)),
  ...walk("services/wlt/frontend", (file) => /(?:\.api|\.transport|controller-core|use-[^/]+-controller)\.(?:ts|tsx)$/.test(file)),
];

const forbiddenPatterns = [
  { pattern: /return\s+null\s*;/g, message: "RUNTIME_CLIENT_STUB_RETURNS_NULL" },
  { pattern: /Fallback for preview|previewData|demoData|mockSuccess/gi, message: "PREVIEW_OR_DEMO_FALLBACK_IN_RUNTIME_BINDING" },
  { pattern: /Promise\.resolve\(\s*(?:\[|\{|null|undefined)/g, message: "IN_MEMORY_SUCCESS_PRESENTED_AS_RUNTIME_BINDING" },
];

for (const file of [...new Set(bindingFiles)].sort()) {
  const content = read(file);
  for (const check of forbiddenPatterns) {
    for (const match of content.matchAll(check.pattern)) {
      violations.push({ file, line: lineNumber(content, match.index), message: check.message });
    }
  }
}

const dispatchPath = "services/dsh/frontend/control-panel/operations/DispatchAssignmentScreen.tsx";
const dispatch = read(dispatchPath);
if (!/client\.assignCaptain\s*\(/.test(dispatch)) {
  violations.push({ file: dispatchPath, line: 0, message: "CRITICAL_DISPATCH_MUTATION_NOT_BOUND" });
}
if (/alternativesMap|Fallback for preview|'Preview'/.test(dispatch)) {
  violations.push({ file: dispatchPath, line: 0, message: "DISPATCH_SIMULATION_FALLBACK_FORBIDDEN" });
}

const mediaPath = "services/dsh/frontend/app-partner/catalog/ProductMediaScreen.tsx";
const media = read(mediaPath);
if (/متاح قريباً|disabled=\{isWorking \|\| Platform\.OS !== ['"]web['"]\}/.test(media)) {
  violations.push({ file: mediaPath, line: 0, message: "NATIVE_MEDIA_UPLOAD_PLACEHOLDER_FORBIDDEN" });
}

for (const packagePath of [
  "apps/app-client/runtime/package.json",
  "apps/app-partner/runtime/package.json",
  "apps/app-captain/runtime/package.json",
  "apps/app-field/runtime/package.json",
  "apps/control-panel/runtime/package.json",
]) {
  const content = read(packagePath);
  if (/\|\|\s*echo|Pre-existing TS errors ignored|continue-on-error/i.test(content)) {
    violations.push({ file: packagePath, line: 0, message: "RUNTIME_VALIDATION_FAILURE_SUPPRESSION_FORBIDDEN" });
  }
}

console.log(`runtime-real-bindings-gate: scanned ${bindingFiles.length} binding files for static anti-stub invariants`);
console.log("runtime-real-bindings-gate: PASS never means runtime smoke or production verification");
fail(guardId, violations);
