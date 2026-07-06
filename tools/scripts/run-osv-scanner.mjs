import { runTool } from "./_external-tool-runner.mjs";

runTool({
  toolId: "osv-scanner",
  binary: "osv-scanner",
  command: "osv-scanner scan source -r .",
  diagnosticCommand: "osv-scanner scan source -r . --format json > .diagnostics/security/osv-report.json"
});