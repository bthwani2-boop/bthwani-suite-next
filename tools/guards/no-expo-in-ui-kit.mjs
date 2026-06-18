import fs from "node:fs";
import path from "node:path";
import { fail, findImportSpecifiers, lineNumber, listCodeFiles, read, repoRoot } from "./_guard-utils.mjs";

const guardId = "no-expo-in-ui-kit";
const violations = [];
const packagePath = path.join(repoRoot, "shared/ui-kit/package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

for (const section of ["dependencies", "peerDependencies", "devDependencies"]) {
  for (const dependency of Object.keys(packageJson[section] ?? {})) {
    if (dependency === "expo" || dependency.startsWith("expo-")) {
      violations.push({ file: "shared/ui-kit/package.json", message: `${section} must not include ${dependency}` });
    }
  }
}

for (const file of listCodeFiles().filter((item) => item.startsWith("shared/ui-kit/"))) {
  const content = read(file);
  for (const item of findImportSpecifiers(content)) {
    if (item.specifier === "expo" || item.specifier.startsWith("expo-")) {
      violations.push({
        file,
        line: lineNumber(content, item.index),
        message: `Expo import is forbidden in shared/ui-kit: ${item.specifier}`
      });
    }
  }
}

fail(guardId, violations);
