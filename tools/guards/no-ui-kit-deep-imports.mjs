import { fail, findImportSpecifiers, lineNumber, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "no-ui-kit-deep-imports";
const violations = [];

for (const file of listCodeFiles()) {
  const content = read(file);
  for (const item of findImportSpecifiers(content)) {
    const spec = item.specifier;
    // @bthwani/ui-kit/web is the official web entry point, not a deep internal path
    const isDeepAlias = spec.startsWith("@bthwani/ui-kit/") && spec !== "@bthwani/ui-kit/web";
    const isDeepPath = spec.includes("shared/ui-kit/src/") || spec.includes("shared/ui-kit/tokens/");

    if (isDeepAlias || isDeepPath) {
      violations.push({
        file,
        line: lineNumber(content, item.index),
        message: `import from public @bthwani/ui-kit only, not deep path: ${spec}`
      });
    }
  }
}

fail(guardId, violations);