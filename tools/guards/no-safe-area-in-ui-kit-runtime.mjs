import { fail, findImportSpecifiers, lineNumber, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "no-safe-area-in-ui-kit-runtime";
const violations = [];

for (const file of listCodeFiles().filter((item) => item.startsWith("shared/ui-kit/"))) {
  const content = read(file);
  for (const item of findImportSpecifiers(content)) {
    if (item.specifier.includes("safe-area")) {
      violations.push({
        file,
        line: lineNumber(content, item.index),
        message: `safe-area ownership belongs to shared/app-shell or apps runtime: ${item.specifier}`
      });
    }
  }
}

fail(guardId, violations);
