import { runTool } from "./_external-tool-runner.mjs";

const command = "zizmor --no-config --min-severity high --min-confidence high .github/workflows";

runTool({
  toolId: "zizmor",
  binary: "zizmor",
  command,
  diagnosticCommand: command,
  required: true,
});
