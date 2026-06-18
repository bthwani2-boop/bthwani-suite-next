import { fail, lineNumber, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "no-raw-hex-outside-ui-kit";
const violations = [];

const hexRegex = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b/g;

for (const file of listCodeFiles()) {
  if (file.startsWith("shared/ui-kit/")) continue;

  const content = read(file);
  let match;
  while ((match = hexRegex.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: `raw hex color ${match[0]} is allowed only inside shared/ui-kit tokens`
    });
  }
}

fail(guardId, violations);