import { changedFiles, quoteRel, runFilesTool, runTool } from "./_external-tool-runner.mjs";

const baseSha = String(process.env.BASE_SHA || "").trim();
const candidateSha = String(process.env.CANDIDATE_SHA || "").trim();
const scanFile = () => true;

if (baseSha && candidateSha) {
  const files = changedFiles(baseSha, candidateSha, ["."], scanFile);
  runFilesTool({
    toolId: "trivy",
    binary: "trivy",
    files,
    noFilesMessage: "No changed files found for Trivy.",
    makeCommand: (items) => `trivy fs --config trivy.yaml ${items.map(quoteRel).join(" ")}`,
    required: true,
  });
} else {
  runTool({
    toolId: "trivy",
    binary: "trivy",
    command: "trivy fs --config trivy.yaml .",
    diagnosticCommand: "trivy fs --config trivy.yaml --format json --output .diagnostics/security/trivy-report.json .",
    required: true,
  });
}
