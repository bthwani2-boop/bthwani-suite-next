import { runTool } from "./_external-tool-runner.mjs";

runTool({
  toolId: "trivy",
  binary: "trivy",
  command: "trivy fs --config trivy.yaml .",
  diagnosticCommand: "trivy fs --config trivy.yaml --format json --output .diagnostics/security/trivy-report.json ."
});
