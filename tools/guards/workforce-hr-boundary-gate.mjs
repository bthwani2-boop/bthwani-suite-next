import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FORBIDDEN_WORKFORCE_INTERNAL =
  /(?:@bthwani\/core-workforce|(?:^|[./"'`\s])core\/workforce)\/(?:backend|database)(?:\/|["'`;)\s]|$)/m;

function normalizePathSyntax(text) {
  return text.replace(/\\+/g, "/");
}

export function findBoundaryViolations(text, file = "<memory>") {
  const violations = [];
  const normalizedPathSyntax = normalizePathSyntax(text);

  if (
    /hasServiceControlPanelPermission\([^)]*,\s*["']hr["']/.test(text)
  ) {
    violations.push(
      `${file}: HR surface must not become a service/domain permission authority; use Workforce`,
    );
  }

  if (FORBIDDEN_WORKFORCE_INTERNAL.test(normalizedPathSyntax)) {
    violations.push(`${file}: HR surface bypasses Workforce public boundary`);
  }

  if (/\bfetch\s*\(/.test(text)) {
    violations.push(
      `${file}: HR surface performs direct fetch(); use governed adapter/client boundary`,
    );
  }

  return violations;
}

function listFiles(root) {
  const result = [];
  if (!fs.existsSync(root)) return result;

  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
        result.push(full);
      }
    }
  }

  return result;
}

export function resolveRepositoryRoot() {
  // This file is canonically located at <repo>/tools/guards/*.mjs.
  // The result is stable from root, package scripts, Nx, CI, and IDE tasks.
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
  );
}

function main() {
  const repo = resolveRepositoryRoot();
  const hrRoot = path.join(
    repo,
    "services",
    "dsh",
    "frontend",
    "control-panel",
    "hr",
  );
  const violations = [];

  if (fs.existsSync(path.join(repo, "core", "hr"))) {
    violations.push(
      "core/hr exists: requires an explicit canonical-authority migration review against core/workforce",
    );
  }

  for (const file of listFiles(hrRoot)) {
    const text = fs.readFileSync(file, "utf8");
    violations.push(
      ...findBoundaryViolations(
        text,
        path.relative(repo, file).replaceAll("\\", "/"),
      ),
    );
  }

  if (violations.length) {
    for (const violation of violations) {
      console.error(`workforce-hr-boundary-gate: ${violation}`);
    }
    process.exit(1);
  }

  console.log(
    "workforce-hr-boundary-gate: PASS HR is a presentation/workspace projection; Workforce remains the service/domain authority",
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main();
}
