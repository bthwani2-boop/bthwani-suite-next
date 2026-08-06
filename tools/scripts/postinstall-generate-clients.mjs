#!/usr/bin/env node
// Generated OpenAPI clients (**/clients/generated/*-api.ts) are intentionally
// gitignored -- they are pure derivations of the committed OpenAPI contracts,
// and committing generated code invites drift between the two. But that
// means a fresh clone has no clients/generated/*-api.ts until they are
// produced, and several tsconfig `paths` point directly at those files
// (e.g. @bthwani/core-platform-control, @bthwani/core-providers), so a fresh
// `pnpm install` followed immediately by `pnpm -r typecheck` failed with
// "Cannot find module" (B7 remediation). CI already ran this generation step
// explicitly (ci-policy.yml); this hook makes local `pnpm install` do the
// same automatically so the same failure mode does not surprise local
// development.
import { spawnSync } from "node:child_process";

const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(executable, ["run", "openapi:generate:all"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(`postinstall-generate-clients: could not start pnpm: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  console.error("postinstall-generate-clients: openapi:generate:all failed; generated clients/generated/*-api.ts may be missing or stale.");
  process.exit(result.status ?? 1);
}
