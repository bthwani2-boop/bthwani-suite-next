import { fail, lineNumber, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "no-raw-hex-outside-ui-kit-colors";
const violations = [];

const hexRegex = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b/g;

for (const file of listCodeFiles()) {
  if (file === "shared/ui-kit/src/tokens/colors.ts") continue;

  const content = read(file);
  let match;
  while ((match = hexRegex.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: `raw hex color ${match[0]} is allowed only in shared/ui-kit/src/tokens/colors.ts`
    });
  }
}

fail(guardId, violations);
