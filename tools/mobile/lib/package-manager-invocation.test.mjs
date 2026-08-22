import assert from "node:assert/strict";
import test from "node:test";
import { resolvePackageManagerInvocation } from "./package-manager-invocation.mjs";

test("Windows pnpm invocation uses a fixed PowerShell argv bridge", () => {
  const invocation = resolvePackageManagerInvocation(
    "pnpm",
    ["--version"],
    { ComSpec: "evil-cmd.exe", npm_execpath: "C:/attacker/pnpm.cjs" },
    "win32",
  );
  assert.equal(invocation.executable, "pwsh");
  assert.equal(invocation.args.includes("-Command"), false);
  assert.equal(invocation.args.includes("/c"), false);
  assert.equal(invocation.args.some((arg) => /cmd\.exe/i.test(arg)), false);
  assert.equal(invocation.args.some((arg) => /attacker/i.test(arg)), false);
  const fileIndex = invocation.args.indexOf("-File");
  assert.ok(fileIndex >= 0);
  assert.match(invocation.args[fileIndex + 1], /invoke-package-manager\.ps1$/i);
  assert.equal(invocation.args[fileIndex + 2], "pnpm");
  assert.equal(invocation.args.at(-1), "--version");
});

test("non-Windows package-manager invocation is direct argv execution", () => {
  assert.deepEqual(
    resolvePackageManagerInvocation("pnpm", ["exec", "nx"], {}, "linux"),
    { executable: "pnpm", args: ["exec", "nx"] },
  );
  assert.deepEqual(
    resolvePackageManagerInvocation("npx", ["expo", "--version"], {}, "linux"),
    { executable: "npx", args: ["expo", "--version"] },
  );
});

test("node aliases resolve only to the running Node executable", () => {
  assert.deepEqual(
    resolvePackageManagerInvocation("node", ["-e", "process.exit(0)"], {}, "win32"),
    { executable: process.execPath, args: ["-e", "process.exit(0)"] },
  );
  assert.deepEqual(
    resolvePackageManagerInvocation(process.execPath, ["--version"], {}, "win32"),
    { executable: process.execPath, args: ["--version"] },
  );
});

test("git remains a direct shell-free executable", () => {
  assert.deepEqual(
    resolvePackageManagerInvocation("git", ["status", "--porcelain=v1"], {}, "win32"),
    { executable: "git", args: ["status", "--porcelain=v1"] },
  );
});

test("arbitrary executable names are rejected", () => {
  for (const command of ["cmd.exe", "powershell.exe", "bash", "sh", "npm"]) {
    assert.throws(
      () => resolvePackageManagerInvocation(command, ["whoami"], {}, "win32"),
      /Unsupported governed command/,
    );
  }
});
