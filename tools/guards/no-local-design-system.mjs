import { fail, listFiles } from "./_guard-utils.mjs";

const guardId = "no-local-design-system";
const violations = [];

const forbiddenPathRegex = /(^|\/)(design-system|ui-kit|tokens|theme|themes|primitives)(\/|$)/i;
const allowedPrefixes = ["shared/ui-kit/", "governance/", "tools/"];

for (const file of listFiles()) {
  if (allowedPrefixes.some((prefix) => file.startsWith(prefix))) continue;

  if (forbiddenPathRegex.test(file)) {
    violations.push({
      file,
      message: "local design-system/theme/token folder is forbidden outside shared/ui-kit"
    });
  }
}

fail(guardId, violations);