import { fail, lineNumber, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "no-direct-fetch-in-screen";
const violations = [];

function isScreen(file) {
  const lower = file.toLowerCase();
  return (
    lower.includes("/screens/") ||
    lower.includes("/screen/") ||
    lower.endsWith("screen.tsx") ||
    lower.endsWith("screen.ts")
  );
}

for (const file of listCodeFiles()) {
  if (!isScreen(file)) continue;

  const content = read(file);
  const regex = /\bfetch\s*\(/g;
  let match;
  while ((match = regex.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: "direct fetch inside screen is forbidden; use generated service client and adapter"
    });
  }
}

fail(guardId, violations);