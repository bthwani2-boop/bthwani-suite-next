import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fail, repoRoot, toPosix } from "./_guard-utils.mjs";

const violations = [];

// 1. Verify policy file existence
const policyPath = path.join(repoRoot, ".agents", "AUTOMATED_EXECUTION_POLICY.md");
if (!fs.existsSync(policyPath)) {
  violations.push({
    file: ".agents/AUTOMATED_EXECUTION_POLICY.md",
    message: "Policy file does not exist."
  });
}

// Helper to check content and references
function checkReference(fileRelPath, pattern, expectedDescription) {
  const fullPath = path.join(repoRoot, fileRelPath);
  if (!fs.existsSync(fullPath)) {
    violations.push({
      file: fileRelPath,
      message: `File does not exist.`
    });
    return "";
  }
  const content = fs.readFileSync(fullPath, "utf8");
  if (!pattern.test(content)) {
    violations.push({
      file: fileRelPath,
      message: `Does not reference Automated Execution Policy (${expectedDescription}).`
    });
  }
  return content;
}

// 2, 3, 4. Check references in primary documents
const agentsContent = checkReference("AGENTS.md", /AUTOMATED_EXECUTION_POLICY\.md/i, "AGENTS.md linkage");
const readmeContent = checkReference(".agents/README.md", /AUTOMATED_EXECUTION_POLICY\.md/i, ".agents/README.md read order");
const indexContent = checkReference(".agents/INDEX.md", /AUTOMATED_EXECUTION_POLICY\.md/i, ".agents/INDEX.md execution model");

// 5. Verify no broken repo-relative links and no Windows local paths
const markdownFiles = [
  { rel: "AGENTS.md", content: agentsContent },
  { rel: ".agents/README.md", content: readmeContent },
  { rel: ".agents/INDEX.md", content: indexContent },
  { rel: ".agents/EVIDENCE_GATE_ROUTER.md", content: "" },
  { rel: ".agents/AUTHORITY_BOUNDARY.md", content: "" },
  { rel: ".agents/AUTOMATED_EXECUTION_POLICY.md", content: "" }
];

// Load contents for files that might not have been loaded
for (const file of markdownFiles) {
  if (!file.content) {
    const fullPath = path.join(repoRoot, file.rel);
    if (fs.existsSync(fullPath)) {
      file.content = fs.readFileSync(fullPath, "utf8");
    }
  }
}

// Regex to find Markdown links like [text](link)
const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

for (const file of markdownFiles) {
  if (!file.content) continue;

  // Check for forbidden local path formats anywhere in the text
  const forbiddenTextRegex = /file:\/\/\/|\b[c-z]:[\\\/]/i;
  if (forbiddenTextRegex.test(file.content)) {
    violations.push({
      file: file.rel,
      message: `Contains forbidden local/Windows path format (e.g. file:/// or c:/ or C:\\) in file text.`
    });
  }

  // Check for forbidden/conflicting "0 checks" phrasing
  if (/0\s+checks/i.test(file.content)) {
    violations.push({
      file: file.rel,
      message: `Contains forbidden/conflicting phrasing '0 checks' or similar.`
    });
  }

  let match;
  // Reset regex lastIndex
  linkRegex.lastIndex = 0;

  while ((match = linkRegex.exec(file.content)) !== null) {
    const linkText = match[1];
    const linkTarget = match[2].trim();

    // Check for Windows or local file scheme paths (e.g. file:///C:/...)
    if (/^file:\/\/\//i.test(linkTarget) || /^[a-z]:\\/i.test(linkTarget) || /^[a-z]:\//i.test(linkTarget)) {
      violations.push({
        file: file.rel,
        message: `Contains forbidden local/Windows path: "${linkTarget}" (linked by "${linkText}").`
      });
      continue;
    }

    // Skip web URLs, email links, anchors
    if (/^(https?:\/\/|mailto:|#)/i.test(linkTarget)) {
      continue;
    }

    // Resolve repo-relative link
    // The markdown file is at file.rel (e.g. .agents/README.md)
    // The linkTarget is relative to the directory of the markdown file.
    const fileDir = path.dirname(path.join(repoRoot, file.rel));
    const resolvedPath = path.resolve(fileDir, linkTarget);

    if (!fs.existsSync(resolvedPath)) {
      violations.push({
        file: file.rel,
        message: `Contains broken repo-relative link: "${linkTarget}" (resolves to "${toPosix(path.relative(repoRoot, resolvedPath))}" which does not exist).`
      });
    }
  }

  // 7. Verify standard paths tools/diagnostics, tools/scripts, tools/registry/runs are mentioned in relevant files
  if (file.rel === "AGENTS.md" || file.rel === ".agents/AUTOMATED_EXECUTION_POLICY.md") {
    const content = file.content.toLowerCase();
    if (!content.includes("tools/diagnostics")) {
      violations.push({
        file: file.rel,
        message: "Missing reference to standard diagnostics directory 'tools/diagnostics'."
      });
    }
    if (!content.includes("tools/scripts")) {
      violations.push({
        file: file.rel,
        message: "Missing reference to standard scripts directory 'tools/scripts'."
      });
    }
    if (!content.includes("tools/registry/runs")) {
      violations.push({
        file: file.rel,
        message: "Missing reference to standard runs registry directory 'tools/registry/runs'."
      });
    }
  }
}

// 7.1 Verify standard paths physical existence on disk
const requiredDirs = [
  "tools/diagnostics",
  "tools/scripts",
  "tools/registry/runs"
];
for (const dir of requiredDirs) {
  const dirPath = path.join(repoRoot, dir);
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    violations.push({
      file: dir,
      message: `Required standard directory "${dir}" does not exist on disk.`
    });
  }
}

// 7.2 Verify presence of rules in AUTOMATED_EXECUTION_POLICY.md / AGENTS.md
const policyFile = markdownFiles.find(f => f.rel === ".agents/AUTOMATED_EXECUTION_POLICY.md");
const agentsFile = markdownFiles.find(f => f.rel === "AGENTS.md");
if (policyFile && policyFile.content) {
  const policyText = policyFile.content;
  if (!/LeanCTX Integration Rule/i.test(policyText) && !(agentsFile && agentsFile.content && /LeanCTX Integration Rule/i.test(agentsFile.content))) {
    violations.push({
      file: ".agents/AUTOMATED_EXECUTION_POLICY.md",
      message: "Missing 'LeanCTX Integration Rule' section in policy or AGENTS.md."
    });
  }
  if (!/Smart Automation Selection Rule/i.test(policyText)) {
    violations.push({
      file: ".agents/AUTOMATED_EXECUTION_POLICY.md",
      message: "Missing 'Smart Automation Selection Rule' section in policy."
    });
  }
  if (/revert the session state to ACTIVE_BRANCH HEAD/i.test(policyText)) {
    violations.push({
      file: ".agents/AUTOMATED_EXECUTION_POLICY.md",
      message: "Contains forbidden auto-revert phrase: 'revert the session state to ACTIVE_BRANCH HEAD'."
    });
  }
}

// 8. Verify CodeQL workflow exists and has not been deleted or completely disabled
const codeqlPath = path.join(repoRoot, ".github", "workflows", "codeql.yml");
if (!fs.existsSync(codeqlPath)) {
  violations.push({
    file: ".github/workflows/codeql.yml",
    message: "CodeQL workflow file has been deleted or is missing."
  });
} else {
  const codeqlContent = fs.readFileSync(codeqlPath, "utf8");
  if (!codeqlContent.includes("github/codeql-action/init") || !codeqlContent.includes("github/codeql-action/analyze")) {
    violations.push({
      file: ".github/workflows/codeql.yml",
      message: "CodeQL workflow is disabled (missing init/analyze steps)."
    });
  }
  if (codeqlContent.includes("continue-on-error")) {
    violations.push({
      file: ".github/workflows/codeql.yml",
      message: "CodeQL workflow must not use continue-on-error."
    });
  }
}

// 9. Check modified files compared to master for evidence/log contamination
let modifiedFiles = [];
try {
  const output = execSync("git diff --name-only origin/master", { encoding: "utf8" });
  modifiedFiles = output.split(/\r?\n/).map(f => f.trim()).filter(Boolean);
} catch (e) {
  try {
    const output = execSync("git diff --name-only HEAD~1", { encoding: "utf8" });
    modifiedFiles = output.split(/\r?\n/).map(f => f.trim()).filter(Boolean);
  } catch (e2) {
    // fallback
  }
}

const forbiddenPrefixes = [
  "tools/registry/runs/",
  ".diagnostics/",
  "graphify-out/"
];

const forbiddenPatterns = [
  /\.log$/,
  /node-gates.*\.log$/,
  /_HANDOFF\.zip$/
];

for (const file of modifiedFiles) {
  const fileLower = file.toLowerCase();
  
  // Check directory prefixes
  for (const prefix of forbiddenPrefixes) {
    if (file.startsWith(prefix)) {
      violations.push({
        file,
        message: `Forbidden log/evidence file committed under prefix "${prefix}".`
      });
    }
  }
  
  // Check patterns
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(fileLower)) {
      violations.push({
        file,
        message: `Forbidden log/evidence file committed matching pattern "${pattern.toString()}".`
      });
    }
  }
}

// 10. Check for mixed dependency and code changes
const packageChanged = modifiedFiles.includes("package.json") || modifiedFiles.includes("pnpm-lock.yaml");
const hasCodeOrWorkflowChanges = modifiedFiles.some(f => 
  f.endsWith(".go") || f.endsWith(".ps1") || f.startsWith(".github/workflows/")
);

if (packageChanged && hasCodeOrWorkflowChanges) {
  let depsChanged = false;
  try {
    const currentPkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
    const masterPkgRaw = execSync("git show origin/master:package.json", { encoding: "utf8" });
    const masterPkg = JSON.parse(masterPkgRaw);
    
    // Compare dependencies and devDependencies
    const currentDeps = { ...(currentPkg.dependencies || {}), ...(currentPkg.devDependencies || {}) };
    const masterDeps = { ...(masterPkg.dependencies || {}), ...(masterPkg.devDependencies || {}) };
    
    for (const [dep, ver] of Object.entries(currentDeps)) {
      if (masterDeps[dep] !== ver) {
        depsChanged = true;
        break;
      }
    }
    for (const dep of Object.keys(masterDeps)) {
      if (!currentDeps[dep]) {
        depsChanged = true;
        break;
      }
    }
  } catch (e) {
    // If comparison fails, check if lockfile is modified
    if (modifiedFiles.includes("pnpm-lock.yaml")) {
      depsChanged = true;
    }
  }

  if (depsChanged) {
    violations.push({
      file: "package.json",
      message: "Mixed dependency updates with backend/runtime/workflow changes in the same PR. Dependency updates must be in a separate PR."
    });
  }
}

// 11. Check for READY/CLOSED/100% claims without exact SHA evidence in modified markdown files
const mdFiles = modifiedFiles.filter(f => f.endsWith(".md"));
for (const file of mdFiles) {
  if (file.startsWith(".agents/") || file === "AGENTS.md" || file.startsWith("docs/")) {
    continue;
  }
  const fullPath = path.join(repoRoot, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf8");
    // Look for READY (excluding READY_CANDIDATE or similar), CLOSED, or 100%
    const claimMatch = /\bREADY\b(?!\s*CANDIDATE)|\bCLOSED\b|\b100%\b/i.test(content);
    if (claimMatch) {
      // Look for a 40-character hex string representing a Git SHA
      const hasSha = /[a-f0-9]{40}/i.test(content);
      if (!hasSha) {
        violations.push({
          file,
          message: "Contains READY, CLOSED, or 100% claim without exact Git SHA evidence in the file."
        });
      }
    }
  }
}

// 12. Prevent full branch merges during salvage (Check for merge commits)
try {
  const merges = execSync("git log origin/master..HEAD --merges --oneline", { encoding: "utf8" }).trim();
  if (merges) {
    violations.push({
      file: "git log",
      message: `Detected forbidden merge commit(s) in branch: "${merges}". Salvage flow prohibits full branch merges.`
    });
  }
} catch (e) {
  // ignore if origin/master..HEAD is not resolvable
}

fail("guard-automated-execution-policy", violations);
