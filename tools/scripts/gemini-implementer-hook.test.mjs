import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { evaluateToolCall } from "./gemini-implementer-hook.mjs";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bthwani-gemini-hook-"));
  fs.mkdirSync(path.join(root, "services", "orders"), { recursive: true });
  fs.mkdirSync(path.join(root, "services", "orders-internal"), { recursive: true });
  fs.mkdirSync(path.join(root, "services", "orders", "generated"), { recursive: true });
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
