import fs from "node:fs";
import path from "node:path";
import { quoteRel, repoRoot, runFilesTool, walkFiles } from "./_external-tool-runner.mjs";

const files = walkFiles([".github", "governance", "infra", "tools"], (_full, name) =>
  name.endsWith(".yml") || name.endsWith(".yaml")
);

runFilesTool({
  toolId: "yamllint",
  binary: "yamllint",
  files,
  noFilesMessage: "No YAML files found.",
  makeCommand: (items) => {
    const config = fs.existsSync(path.join(repoRoot, ".yamllint.yml")) ? "-c .yamllint.yml " : "";
    return "yamllint " + config + items.map(quoteRel).join(" ");
  }
});
