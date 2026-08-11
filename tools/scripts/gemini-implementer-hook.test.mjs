import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { evaluateToolCall } from "./gemini-implementer-hook.mjs";

const hookPath = fileURLToPath(new URL("./gemini-implementer-hook.mjs", import.meta.url));

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bthwani-gemini-hook-"));
  fs.mkdirSync(path.join(root, "services", "orders"), { recursive: true });
  fs.mkdirSync(path.join(root, "services", "orders-internal"), { recursive: true });
  fs.mkdirSync(path.join(root, "services", "orders", "generated"), { recursive: true });
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

test("allows repository reads", () => {
  const root = fixture();
  const result = evaluateToolCall(
    { tool_name: "read_file", tool_input: { file_path: "services/orders/a.ts" }, cwd: root },
    options(root),
  );
  assert.equal(result.decision, "allow");
});

test("denies shell execution", () => {
  const root = fixture();
  const result = evaluateToolCall(
    { tool_name: "run_shell_command", tool_input: { command: "git status" }, cwd: root },
    options(root),
  );
  assert.equal(result.decision, "deny");
});

test("denies metadata tools that can mutate agent state", () => {
  const root = fixture();
  const result = evaluateToolCall(
    { tool_name: "write_todos", tool_input: { todos: [] }, cwd: root },
    options(root),
  );
  assert.equal(result.decision, "deny");
});

test("allows write inside declared prefix", () => {
  const root = fixture();
  const result = evaluateToolCall(
    { tool_name: "write_file", tool_input: { file_path: "services/orders/a.ts" }, cwd: root },
    options(root),
  );
  assert.equal(result.decision, "allow");
});

test("denies sibling-prefix escape", () => {
  const root = fixture();
  const result = evaluateToolCall(
    { tool_name: "write_file", tool_input: { file_path: "services/orders-internal/a.ts" }, cwd: root },
    options(root),
  );
  assert.equal(result.decision, "deny");
});

test("denies explicitly forbidden descendant", () => {
  const root = fixture();
  const result = evaluateToolCall(
    { tool_name: "replace", tool_input: { file_path: "services/orders/generated/client.ts" }, cwd: root },
    options(root),
  );
  assert.equal(result.decision, "deny");
});

test("denies governance writes even when an allow prefix is broad", () => {
  const root = fixture();
  fs.mkdirSync(path.join(root, "governance", "product"), { recursive: true });
  const result = evaluateToolCall(
    { tool_name: "write_file", tool_input: { file_path: "governance/product/a.json" }, cwd: root },
    { repoRoot: root, allowedWrite: [path.join(root, "governance")], forbiddenWrite: [] },
  );
  assert.equal(result.decision, "deny");
});

test("denies Claude delegation wrapper even under broad tools/scripts allow", () => {
  const root = fixture();
  const result = evaluateToolCall(
    { tool_name: "write_file", tool_input: { file_path: "tools/scripts/invoke-claude-gemini-implementer.mjs" }, cwd: root },
    { repoRoot: root, allowedWrite: [path.join(root, "tools", "scripts")], forbiddenWrite: [] },
  );
  assert.equal(result.decision, "deny");
});

test("denies .git writes", () => {
  const root = fixture();
  const result = evaluateToolCall(
    { tool_name: "write_file", tool_input: { file_path: ".git/config" }, cwd: root },
    options(root),
  );
  assert.equal(result.decision, "deny");
});

test("denies repository escape", () => {
  const root = fixture();
  const outside = path.join(path.dirname(root), "outside.txt");
  const result = evaluateToolCall(
    { tool_name: "write_file", tool_input: { file_path: outside }, cwd: root },
    options(root),
  );
  assert.equal(result.decision, "deny");
});

test("hook failures return structured denial with exit code zero", () => {
  const env = { ...process.env };
  delete env.BTHWANI_GEMINI_REPO_ROOT;
  delete env.BTHWANI_GEMINI_ALLOWED_WRITE;
  delete env.BTHWANI_GEMINI_FORBIDDEN_WRITE;
  const result = spawnSync(process.execPath, [hookPath], {
    input: "{}",
    encoding: "utf8",
    env,
  });
  assert.equal(result.status, 0);
  const parsed = JSON.parse(result.stdout.trim());
  assert.equal(parsed.decision, "deny");
  assert.match(parsed.reason, /hook failure/i);
});
