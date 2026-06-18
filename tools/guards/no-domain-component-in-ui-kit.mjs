import path from "node:path";
import { fail, listCodeFiles, read } from "./_guard-utils.mjs";

const guardId = "no-domain-component-in-ui-kit";
const violations = [];
const domainPattern = /\b(store|product|cart|checkout|order|wallet|payment|captain|courier|partner|merchant|dispatch|settlement|refund)\b/i;

for (const file of listCodeFiles().filter((item) => item.startsWith("shared/ui-kit/src/components/"))) {
  const baseName = path.basename(file, path.extname(file));
  const content = read(file);
  if (domainPattern.test(baseName)) {
    violations.push({ file, message: `domain-specific component name is forbidden in shared/ui-kit: ${baseName}` });
    continue;
  }

  const exportedSymbols = content.matchAll(/\bexport\s+(?:type|interface|class|function|const)\s+([A-Za-z0-9_]+)/g);
  for (const match of exportedSymbols) {
    if (domainPattern.test(match[1])) {
      violations.push({ file, message: `domain-specific public symbol is forbidden in shared/ui-kit: ${match[1]}` });
    }
  }
}

fail(guardId, violations);
