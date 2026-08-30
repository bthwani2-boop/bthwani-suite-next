import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { changedFiles, repoRoot, runTool } from "./_external-tool-runner.mjs";

const baseSha = String(process.env.BASE_SHA || "").trim();
const candidateSha = String(process.env.CANDIDATE_SHA || "").trim();
const trustedPolicyRoot = path.resolve(process.env.BTHWANI_TRUSTED_POLICY_ROOT || repoRoot);
const trivyConfig = path.join(trustedPolicyRoot, "trivy.yaml");
const trivyIgnore = path.join(trustedPolicyRoot, ".trivyignore.yaml");

for (const policyFile of [trivyConfig, trivyIgnore]) {
  if (!fs.existsSync(policyFile)) {
    console.error(`[TRIVY FAIL] trusted policy file missing: ${policyFile}`);
    process.exit(1);
  }
}

const policyArgs = ["--config", trivyConfig, "--ignorefile", trivyIgnore];

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
  runTool({
    toolId: "trivy",
    binary: "trivy",
    args: ["fs", ...policyArgs, staging],
    diagnosticArgs: ["fs", ...policyArgs, "--format", "json", "--output", path.join(staging, "trivy-report.json"), staging],
    required: true,
  });
} else {
  runTool({
    toolId: "trivy",
    binary: "trivy",
    args: ["fs", ...policyArgs, "."],
    diagnosticArgs: ["fs", ...policyArgs, "--format", "json", "--output", ".diagnostics/security/trivy-report.json", "."],
    required: true,
  });
}
