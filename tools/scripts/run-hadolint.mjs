import fs from "node:fs";
import path from "node:path";
import { quoteRel, repoRoot, runFilesTool, walkFiles } from "./_external-tool-runner.mjs";

const files = walkFiles(["apps", "services", "shared", "tools", "infra", "core"], (_full, name) =>
  name === "Dockerfile" || name.endsWith(".Dockerfile") || name.startsWith("Dockerfile.")
);

runFilesTool({
  toolId: "hadolint",
  binary: "hadolint",
  files,
  noFilesMessage: "No Dockerfiles found.",
  makeCommand: (items) => {
    const config = fs.existsSync(path.join(repoRoot, ".hadolint.yaml")) ? "--config .hadolint.yaml " : "";
    return "hadolint " + config + items.map(quoteRel).join(" ");
  }
});
