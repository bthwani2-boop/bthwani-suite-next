import { runTool } from "./_external-tool-runner.mjs";

const command = "conftest test governance/agents/agent-registry.json governance/skills/skills-registry.json governance/guards/guard-registry.json --policy governance/policies";

runTool({
  toolId: "conftest",
  binary: "conftest",
  command,
  diagnosticCommand: command,
  required: true,
});
