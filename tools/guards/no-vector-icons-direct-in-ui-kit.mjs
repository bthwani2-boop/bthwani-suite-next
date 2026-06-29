import { fail, findImportSpecifiers, lineNumber, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "no-vector-icons-direct-in-ui-kit";
const violations = [];

for (const file of listCodeFiles().filter((item) => item.startsWith("shared/ui-kit/") && !item.includes("Icon/Icon.tsx"))) {
  const content = read(file);
  for (const item of findImportSpecifiers(content)) {
    if (item.specifier === "@expo/vector-icons" || item.specifier.includes("vector-icons")) {
      violations.push({
        file,
        line: lineNumber(content, item.index),
        message: `direct vector icon dependency is forbidden; accept icon nodes through component props: ${item.specifier}`
      });
    }
  }
}

fail(guardId, violations);
