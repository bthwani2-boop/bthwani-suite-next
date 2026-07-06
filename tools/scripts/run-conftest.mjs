import { runTool } from "./_external-tool-runner.mjs";

runTool({
  toolId: "conftest",
  binary: "conftest",
  command: "conftest test governance/agents/agent-registry.json governance/skills/skills-registry.json governance/guards/guard-registry.json --policy governance/policies",
  diagnosticCommand: "conftest test governance/agents/agent-registry.json governance/skills/skills-registry.json governance/guards/guard-registry.json --policy governance/policies"
});
