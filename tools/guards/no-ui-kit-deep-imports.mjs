import { fail, findImportSpecifiers, lineNumber, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "no-ui-kit-deep-imports";
const violations = [];

for (const file of listCodeFiles()) {
  const content = read(file);
  for (const item of findImportSpecifiers(content)) {
    const spec = item.specifier;
    // Allow the four declared public subpath exports
    const ALLOWED_SUBPATHS = ["@bthwani/ui-kit/web", "@bthwani/ui-kit/mobile", "@bthwani/ui-kit/next"];
    const isDeepAlias = spec.startsWith("@bthwani/ui-kit/") && !ALLOWED_SUBPATHS.includes(spec);
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
