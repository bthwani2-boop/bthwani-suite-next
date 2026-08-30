import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { changedFiles, repoRoot, runTool } from "./_external-tool-runner.mjs";

const baseSha = String(process.env.BASE_SHA || "").trim();
const candidateSha = String(process.env.CANDIDATE_SHA || "").trim();
const trustedPolicyRoot = path.resolve(process.env.BTHWANI_TRUSTED_POLICY_ROOT || repoRoot);
const trivyConfig = path.join(trustedPolicyRoot, "trivy.yaml");

if (!fs.existsSync(trivyConfig)) {
  console.error(`[TRIVY FAIL] trusted policy config missing: ${trivyConfig}`);
  process.exit(1);
}

if (baseSha && candidateSha) {
  const files = changedFiles(baseSha, candidateSha, ["."], () => true);
  if (!files.length) {
    console.log("No changed files found for Trivy.");
    process.exit(0);
  }

  const staging = fs.mkdtempSync(path.join(os.tmpdir(), "bthwani-trivy-scope-"));
  for (const file of files) {
    const relative = path.relative(repoRoot, file);
    const destination = path.join(staging, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(file, destination);
  }
  const target = JSON.stringify(staging);
  const config = JSON.stringify(trivyConfig);
  runTool({
    toolId: "trivy",
    binary: "trivy",
    command: `trivy fs --config ${config} ${target}`,
    diagnosticCommand: `trivy fs --config ${config} --format json --output ${JSON.stringify(path.join(staging, "trivy-report.json"))} ${target}`,
    required: true,
  });
} else {
  const config = JSON.stringify(trivyConfig);
  runTool({
    toolId: "trivy",
    binary: "trivy",
    command: `trivy fs --config ${config} .`,
    diagnosticCommand: `trivy fs --config ${config} --format json --output .diagnostics/security/trivy-report.json .`,
    required: true,
  });
}
