import fs from "node:fs";
import path from "node:path";
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

fail("guard-automated-execution-policy", violations);
