import { fail, lineNumber, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "no-memory-repo-in-journey-runtime";
const violations = [];

const regex = /\b(InMemory|MemoryRepository|memoryRepository|memoryRepo|new\s+Map\s*\(|memory\s+repo)\b/g;

for (const file of listCodeFiles()) {
  if (!file.startsWith("services/") && !file.startsWith("apps/")) continue;
  if (file.includes("/tests/") || file.includes("/test/") || file.includes(".test.") || file.includes(".spec.")) continue;

  const content = read(file);
  let match;
  while ((match = regex.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: `memory repository/runtime state is forbidden in journey runtime: ${match[0]}`
    });
  }
}

fail(guardId, violations);