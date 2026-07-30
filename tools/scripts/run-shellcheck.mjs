import { quoteRel, runFilesTool, walkFiles } from "./_external-tool-runner.mjs";

const files = walkFiles(["apps", "services", "shared", "tools", "infra", "core"], (_full, name) => name.endsWith(".sh"));

runFilesTool({
  toolId: "shellcheck",
  binary: "shellcheck",
  files,
  noFilesMessage: "No *.sh files found.",
  makeCommand: (items) => "shellcheck " + items.map(quoteRel).join(" ")
});
