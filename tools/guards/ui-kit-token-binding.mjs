import { fail, read } from "./_guard-utils.mjs";

const guardId = "ui-kit-token-binding";
const file = "shared/ui-kit/src/components/_shared.tsx";
const textFile = "shared/ui-kit/src/components/Text/Text.tsx";
const content = read(file);
const textContent = read(textFile);
const violations = [];

const requiredPatterns = [
  [/\btypography\b/, "shared component recipes must import typography tokens"],
  [/\bsizing\b/, "shared component recipes must import sizing tokens"],
  [/\bspacing\b/, "shared component recipes must import spacing tokens"],
  [/\.\.\.typography/, "text role variants must derive from typography tokens"],
  [/sizing\.controlSm/, "small controls must derive from sizing tokens"],
  [/sizing\.controlMd/, "medium controls must derive from sizing tokens"],
  [/sizing\.controlLg/, "large controls must derive from sizing tokens"]
];

for (const [pattern, message] of requiredPatterns) {
  if (!pattern.test(content)) violations.push({ file, message });
}

const forbiddenPatterns = [
  [/display:\s*\{\s*fontSize:/, "typography role literals must not be duplicated in component recipes"],
  [/sm:\s*\{\s*minHeight:\s*\d/, "control height literals must not be duplicated in component recipes"],
  [/md:\s*\{\s*minHeight:\s*\d/, "control height literals must not be duplicated in component recipes"],
  [/lg:\s*\{\s*minHeight:\s*\d/, "control height literals must not be duplicated in component recipes"]
];

for (const [pattern, message] of forbiddenPatterns) {
  if (pattern.test(content)) violations.push({ file, message });
}

if (/color\?\s*:\s*string/.test(textContent)) {
  violations.push({
    file: textFile,
    message: "Text must expose semantic tone roles, not an arbitrary color string"
  });
}

fail(guardId, violations);
