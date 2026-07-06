import { runTool } from "./_external-tool-runner.mjs";

runTool({
  toolId: "zizmor",
  binary: "zizmor",
  command: "zizmor .github/workflows --config .zizmor.yml",
  diagnosticCommand: "zizmor .github/workflows --config .zizmor.yml"
});
