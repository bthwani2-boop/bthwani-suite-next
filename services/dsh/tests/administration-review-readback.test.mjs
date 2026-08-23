import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (relativePath) => fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

describe("administration review canonical readback", () => {
  const controller = read("services/dsh/frontend/shared/administration/use-administration-controller.tsx");

  it("awaits one scoped subscriber invalidation authority", () => {
    assert.match(controller, /new Map<AdministrationReadScope, Set<AdministrationReload>>/);
    assert.match(controller, /await Promise\.all\(\[\.\.\.reloads\]\.map\(\(reload\) => reload\(\)\)\)/);
    assert.match(controller, /generation === loadGeneration\.current/);
  });

  it("refreshes every materially affected readback after review", () => {
    assert.match(controller, /\["role-definitions", "roles", "audit", "diagnostics"\]/);
    assert.match(controller, /\["role-assignments", "staff", "audit", "diagnostics"\]/);
    assert.match(controller, /\["rollbacks", "staff", "audit", "diagnostics"\]/);
  });

  it("wraps all dashboard and queue consumers with the shared provider", () => {
    const screen = read("services/dsh/frontend/control-panel/administration/GovernedAdministrationScreen.tsx");
    assert.match(screen, /<AdministrationInvalidationProvider>/);
    assert.match(screen, /<AdministrationDashboardScreen \/>/);
    assert.match(screen, /<RoleDefinitionApprovalQueue \/>/);
    assert.match(screen, /<RoleAssignmentApprovalQueue \/>/);
    assert.match(screen, /<DecisionRollbackQueue \/>/);
  });

  it("removes duplicate screen-local reload paths and matches backend response shapes", () => {
    const rollbackQueue = read("services/dsh/frontend/control-panel/administration/DecisionRollbackQueue.tsx");
    const api = read("services/dsh/frontend/shared/administration/administration.api.ts");
    assert.doesNotMatch(rollbackQueue, /await approvals\.reload\(\)|await rollbacks\.reload\(\)/);
    assert.match(api, /operations\["post_dsh_operator_admin_approvals__approvalId__review"\]/);
    assert.match(api, /req<RoleAssignmentReviewResponse>/);
    assert.match(api, /req<RollbackReviewResponse>/);
  });
});
