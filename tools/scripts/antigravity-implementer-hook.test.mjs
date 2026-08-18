import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { evaluateToolCall } from "./antigravity-implementer-hook.mjs";

const hookPath = fileURLToPath(new URL("./antigravity-implementer-hook.mjs", import.meta.url));

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bthwani-antigravity-hook-"));
  fs.mkdirSync(path.join(root, "services", "orders", "generated"), { recursive: true });
  fs.mkdirSync(path.join(root, "services", "orders-internal"), { recursive: true });
  fs.mkdirSync(path.join(root, "governance", "product"), { recursive: true });
  fs.mkdirSync(path.join(root, "tools", "scripts"), { recursive: true });
  fs.mkdirSync(path.join(root, ".git"), { recursive: true });
  return root;
}

function options(root) {
  return {
    repoRoot: root,
    allowedWrite: [path.join(root, "services", "orders")],
    forbiddenWrite: [path.join(root, "services", "orders", "generated")],
  };
}

function call(name, args) {
  return { toolCall: { name, args }, workspacePaths: [] };
}

test("denies non-write tools when hook is invoked", () => {
  const root = fixture();
  for (const name of ["view_file", "run_command", "search_web", "invoke_subagent", "call_mcp_tool"]) {
    assert.equal(evaluateToolCall(call(name, {}), options(root)).decision, "deny");
  }
});

test("allows write_to_file inside declared prefix", () => {
  const root = fixture();
  assert.equal(evaluateToolCall(call("write_to_file", { TargetFile: path.join(root, "services/orders/a.ts"), TargetContent: "x" }), options(root)).decision, "allow");
});

test("allows replace tools inside declared prefix", () => {
  const root = fixture();
  for (const name of ["replace_file_content", "multi_replace_file_content"]) {
    assert.equal(evaluateToolCall(call(name, { TargetFile: path.join(root, "services/orders/a.ts") }), options(root)).decision, "allow");
  }
});

test("denies sibling-prefix escape", () => {
  const root = fixture();
  assert.equal(evaluateToolCall(call("write_to_file", { TargetFile: path.join(root, "services/orders-internal/a.ts") }), options(root)).decision, "deny");
});

test("denies explicitly forbidden descendant", () => {
  const root = fixture();
  assert.equal(evaluateToolCall(call("replace_file_content", { TargetFile: path.join(root, "services/orders/generated/client.ts") }), options(root)).decision, "deny");
});

test("denies governance writes even under broad allow", () => {
  const root = fixture();
  const result = evaluateToolCall(call("write_to_file", { TargetFile: path.join(root, "governance/product/a.json") }), {
    repoRoot: root,
    allowedWrite: [path.join(root, "governance")],
    forbiddenWrite: [],
  });
  assert.equal(result.decision, "deny");
});

test("denies delegation wrappers under broad tools/scripts allow", () => {
  const root = fixture();
  for (const file of ["invoke-antigravity-implementer.mjs", "invoke-claude-antigravity-implementer.mjs"]) {
    const result = evaluateToolCall(call("write_to_file", { TargetFile: path.join(root, "tools/scripts", file) }), {
      repoRoot: root,
      allowedWrite: [path.join(root, "tools", "scripts")],
      forbiddenWrite: [],
    });
    assert.equal(result.decision, "deny");
  }
});

test("denies .git writes", () => {
  const root = fixture();
  assert.equal(evaluateToolCall(call("write_to_file", { TargetFile: path.join(root, ".git/config") }), options(root)).decision, "deny");
});

test("hook failures return structured denial with exit code zero", () => {
  const env = { ...process.env };
  delete env.BTHWANI_ANTIGRAVITY_REPO_ROOT;
  delete env.BTHWANI_ANTIGRAVITY_ALLOWED_WRITE;
  delete env.BTHWANI_ANTIGRAVITY_FORBIDDEN_WRITE;
  const result = spawnSync(process.execPath, [hookPath], { input: "{}", encoding: "utf8", env });
  assert.equal(result.status, 0);
  const parsed = JSON.parse(result.stdout.trim());
  assert.equal(parsed.decision, "deny");
  assert.match(parsed.reason, /hook failure/i);
});
