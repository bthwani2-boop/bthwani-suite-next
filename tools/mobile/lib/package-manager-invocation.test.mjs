import assert from "node:assert/strict";
import test from "node:test";
import { resolvePackageManagerInvocation } from "./package-manager-invocation.mjs";

function decodePayload(invocation) {
  const encoded = invocation.args.at(-1);
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
}

test("Windows pnpm invocation is fixed, shell-independent, and preserves argv", () => {
  const args = ["--dir", "apps/app-client/runtime", "exec", "expo", "config", "--json"];
  const invocation = resolvePackageManagerInvocation(
    "pnpm",
    args,
    { ComSpec: "C:\\attacker\\cmd.exe", npm_execpath: "C:\\attacker\\pnpm.cjs" },
    "win32",
  );

  assert.equal(invocation.executable, "pwsh");
  assert.deepEqual(invocation.args.slice(0, 6), [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    invocation.args[5],
  ]);
  assert.match(invocation.args[5], /invoke-pnpm\.ps1$/i);
  assert.equal(invocation.args.includes("-Command"), false);
  assert.equal(invocation.args.includes("/c"), false);
  assert.equal(invocation.args.some((arg) => /cmd\.exe/i.test(arg)), false);
  assert.deepEqual(decodePayload(invocation), args);
});

test("non-Windows pnpm invocation remains direct argv execution", () => {
  const args = ["exec", "nx", "show", "projects"];
  assert.deepEqual(
    resolvePackageManagerInvocation("pnpm", args, {}, "linux"),
    { executable: "pnpm", args },
  );
});

test("node command is pinned to the current Node executable", () => {
  assert.deepEqual(
    resolvePackageManagerInvocation("node", ["--version"], {}, "win32"),
    { executable: process.execPath, args: ["--version"] },
  );
  assert.deepEqual(
    resolvePackageManagerInvocation(process.execPath, ["-e", "process.exit(0)"], {}, "win32"),
    { executable: process.execPath, args: ["-e", "process.exit(0)"] },
  );
});

test("git stays a direct executable with argv boundaries", () => {
  assert.deepEqual(
    resolvePackageManagerInvocation("git", ["status", "--porcelain=v1"], {}, "win32"),
    { executable: "git", args: ["status", "--porcelain=v1"] },
  );
});

test("ambient environment cannot select an executable", () => {
  const invocation = resolvePackageManagerInvocation(
    "pnpm",
    ["--version"],
    { ComSpec: "C:\\evil\\shell.exe", npm_execpath: "C:\\evil\\runner.cjs" },
    "win32",
  );
  assert.equal(invocation.executable, "pwsh");
  assert.equal(invocation.args.some((value) => value.includes("evil")), false);
});

test("unsupported executable authority is rejected", () => {
  assert.throws(
    () => resolvePackageManagerInvocation("cmd.exe", ["/c", "whoami"], {}, "win32"),
    /Unsupported governed command/,
  );
});
