import { runTool } from "./_external-tool-runner.mjs";

runTool({
  toolId: "regal",
  binary: "regal",
  command: "regal lint governance/policies",
  diagnosticCommand: "regal lint governance/policies"
});
