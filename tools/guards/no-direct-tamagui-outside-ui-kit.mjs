import { fail, findImportSpecifiers, lineNumber, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "no-direct-tamagui-outside-ui-kit";
const violations = [];

for (const file of listCodeFiles()) {
  if (file.startsWith("shared/ui-kit/")) continue;

  const content = read(file);
  for (const item of findImportSpecifiers(content)) {
    if (item.specifier === "tamagui" || item.specifier.startsWith("@tamagui/")) {
      violations.push({
        file,
        line: lineNumber(content, item.index),
        message: `direct Tamagui import is allowed only inside shared/ui-kit: ${item.specifier}`
      });
    }
  }
}

fail(guardId, violations);