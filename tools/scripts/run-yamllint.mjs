import fs from "node:fs";
import path from "node:path";
import { changedFiles, repoRoot, runFilesTool, walkFiles } from "./_external-tool-runner.mjs";

const baseSha = String(process.env.BASE_SHA || "").trim();
const candidateSha = String(process.env.CANDIDATE_SHA || "").trim();
const trustedPolicyRoot = path.resolve(process.env.BTHWANI_TRUSTED_POLICY_ROOT || repoRoot);
const yamlFile = (full, name) => {
  if (!name.endsWith(".yml") && !name.endsWith(".yaml")) return false;
  const relative = path.relative(repoRoot, full).replaceAll("\\", "/");
  return !relative.startsWith(".github/workflows/") && !relative.startsWith(".github/actions/");
};
const files = baseSha && candidateSha
  ? changedFiles(baseSha, candidateSha, [".github", "governance", "infra", "tools"], yamlFile)
  : walkFiles([".github", "governance", "infra", "tools"], yamlFile);

runFilesTool({
  toolId: "yamllint",
  binary: "yamllint",
  files,
  noFilesMessage: "No generic YAML files found; GitHub Actions YAML is owned by actionlint/zizmor/pinact.",
  makeArgs: (items) => {
    const trustedConfig = path.join(trustedPolicyRoot, ".yamllint.yml");
    return [...(fs.existsSync(trustedConfig) ? ["-c", trustedConfig] : []), ...items];
  },
});
