import fs from "node:fs";
import path from "node:path";
import { fail, listCodeFiles, repoRoot, toPosix } from "./_guard-utils.mjs";

const violations = [];
const allowedInternalFiles = new Set([
  "infra/docker/compose.runtime.yml",
  "infra/docker/runtime-profiles/dsh.runtime-profile.json",
  "infra/docker/runtime-profiles/wlt.runtime-profile.json",
  "infra/docker/runtime-profiles/dsh-wlt-link.runtime-profile.json",
  "infra/docker/env/dsh.runtime.env.example",
  "infra/docker/env/wlt.runtime.env.example",
  "services/dsh/backend/Dockerfile",
  "services/wlt/backend/Dockerfile",
  "services/dsh/backend/cmd/dsh-api/main.go",
  "services/wlt/backend/cmd/wlt-api/main.go",
]);

const files = [
  ...listCodeFiles(),
  "apps/control-panel/runtime/package.json",
  "services/dsh/docker/RUNTIME_CONTRACT.md",
  "services/wlt/docker/RUNTIME_CONTRACT.md",
].filter((file, index, all) => all.indexOf(file) === index);

for (const file of files) {
  const rel = toPosix(file);
  if (allowedInternalFiles.has(rel) || rel.includes("/tests/")) continue;
  const full = path.join(repoRoot, file);
  if (!fs.existsSync(full)) continue;
  const source = fs.readFileSync(full, "utf8");
  for (const match of source.matchAll(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(8080|8083|3000)\b/g)) {
    violations.push({
      file: rel,
      message: `forbidden host runtime URL ${match[0]}; use DSH 58080, WLT 58083, or control-panel 13000`,
    });
  }
}

const controlPanelPackage = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "apps/control-panel/runtime/package.json"), "utf8"),
);
if (!String(controlPanelPackage.scripts?.dev ?? "").includes("--port 13000")) {
  violations.push({
    file: "apps/control-panel/runtime/package.json",
    message: "control-panel dev script must pin --port 13000",
  });
}

fail("canonical-host-ports", violations);
