import fs from "node:fs";
import path from "node:path";
import { quoteRel, repoRoot, runFilesTool, walkFiles } from "./_external-tool-runner.mjs";

const trustedPolicyRoot = path.resolve(process.env.BTHWANI_TRUSTED_POLICY_ROOT || repoRoot);
const files = walkFiles(["apps", "services", "shared", "tools", "infra", "core"], (_full, name) =>
  name === "Dockerfile" || name.endsWith(".Dockerfile") || name.startsWith("Dockerfile.")
);

runFilesTool({
  toolId: "hadolint",
  binary: "hadolint",
  files,
  noFilesMessage: "No Dockerfiles found.",
  makeArgs: (items) => {
    const trustedConfig = path.join(trustedPolicyRoot, ".hadolint.yaml");
    const config = fs.existsSync(trustedConfig) ? ["--config", trustedConfig] : [];
    return [...config, ...items.map(quoteRel)];
  }
});
