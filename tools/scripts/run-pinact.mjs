import { runTool } from "./_external-tool-runner.mjs";

runTool({
  toolId: "pinact",
  binary: "pinact",
  command: "pinact verify",
  diagnosticCommand: "pinact list",
  required: true,
});
