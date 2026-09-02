import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const serviceRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const walletRoot = join(serviceRoot, "..", "dsh", "frontend", "wlt-boundary");

function sourceFiles(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(path));
    else if ([".ts", ".tsx"].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

test("DSH-owned WLT surface has one live transport authority", () => {
  assert.equal(existsSync(walletRoot), true, "the DSH-owned wallet surface tree must exist");

  for (const retired of [
    join(walletRoot, "dsh-link"),
    join(walletRoot, "dsh-http"),
    join(walletRoot, "wlt-dsh-api-base-url.ts"),
    join(walletRoot, "wlt-dsh-http-request.ts"),
  ]) {
    assert.equal(existsSync(retired), false, `retired transport path exists: ${retired}`);
  }

  const forbiddenImports = [
    "/dsh-link/",
    "../dsh-http/",
    "/dsh-http/",
    "wlt-dsh-api-base-url",
    "wlt-dsh-http-request",
  ];
  for (const file of sourceFiles(walletRoot)) {
    const source = readFileSync(file, "utf8");
    for (const forbidden of forbiddenImports) {
      assert.equal(
        source.includes(forbidden),
        false,
        `${file} imports retired DSH transport authority: ${forbidden}`,
      );
    }
  }

  const kernelRoot = join(serviceRoot, "..", "dsh", "frontend", "shared", "_kernel");
  assert.equal(
    existsSync(join(kernelRoot, "dsh-api-base-url.ts")),
    true,
    "the canonical DSH transport base-url kernel must remain the single owner",
  );
  assert.equal(
    existsSync(join(kernelRoot, "dsh-http-request.ts")),
    true,
    "the canonical DSH request kernel must remain the single owner",
  );
});
