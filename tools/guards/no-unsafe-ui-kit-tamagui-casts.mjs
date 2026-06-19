import { fail, lineNumber, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "no-unsafe-ui-kit-tamagui-casts";
const violations = [];
const unsafePattern = /\bas\s+any\b|=>\s*any\b|:\s*any\b/g;

for (const file of listCodeFiles().filter((item) => item.startsWith("shared/ui-kit/src/"))) {
  const content = read(file);
  let match;
  while ((match = unsafePattern.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: "explicit any or any-cast is forbidden; use the typed internal Tamagui compatibility adapter"
    });
  }
}

fail(guardId, violations);
