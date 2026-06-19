import fs from "node:fs";
import path from "node:path";
import { fail, findImportSpecifiers, lineNumber, listCodeFiles, read, repoRoot } from "./_guard-utils.mjs";

const guardId = "no-react-native-runtime-dependency-in-ui-kit";
const violations = [];
const packagePath = path.join(repoRoot, "shared/ui-kit/package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

for (const dependency of ["react-native", "@tamagui/native"]) {
  if (packageJson.dependencies?.[dependency]) {
    violations.push({
      file: "shared/ui-kit/package.json",
      message: `runtime dependency ${dependency} is forbidden; react-native may only be an optional peer`
    });
  }
}

for (const file of listCodeFiles().filter((item) => item.startsWith("shared/ui-kit/"))) {
  const content = read(file);
  for (const item of findImportSpecifiers(content)) {
    if (item.specifier === "react-native" || item.specifier.startsWith("react-native/")) {
      violations.push({
        file,
        line: lineNumber(content, item.index),
        message: `direct React Native runtime import is forbidden in shared/ui-kit: ${item.specifier}`
      });
    }
  }
}

fail(guardId, violations);
