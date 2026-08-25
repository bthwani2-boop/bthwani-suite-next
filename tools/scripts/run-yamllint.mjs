import fs from "node:fs";
import path from "node:path";
import { changedFiles, quoteRel, repoRoot, runFilesTool, walkFiles } from "./_external-tool-runner.mjs";

const baseSha = String(process.env.BASE_SHA || "").trim();
const candidateSha = String(process.env.CANDIDATE_SHA || "").trim();
const yamlFile = (_full, name) => name.endsWith(".yml") || name.endsWith(".yaml");
const files = baseSha && candidateSha
  ? changedFiles(baseSha, candidateSha, [".github", "governance", "infra", "tools"], yamlFile)
  : walkFiles([".github", "governance", "infra", "tools"], yamlFile);

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
