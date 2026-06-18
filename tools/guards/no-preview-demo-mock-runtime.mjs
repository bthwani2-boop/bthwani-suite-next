import { fail, lineNumber, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "no-preview-demo-mock-runtime";
const violations = [];

const runtimePrefixes = ["apps/", "services/", "core/"];
const excluded = ["/tests/", "/test/", ".test.", ".spec.", "tools/", "governance/"];
const regex = /\b(preview|demo|mock|fixture|fixtures|fakeActor|fakeUser|useFixtures|previewData|demoData)\b/gi;

for (const file of listCodeFiles()) {
  if (!runtimePrefixes.some((prefix) => file.startsWith(prefix))) continue;
  if (excluded.some((part) => file.includes(part))) continue;

  const content = read(file);
  let match;
  while ((match = regex.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: `runtime preview/demo/mock marker is forbidden: ${match[0]}`
    });
  }
}

fail(guardId, violations);