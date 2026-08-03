import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const serviceRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sharedRoot = join(serviceRoot, "frontend", "shared", "dsh");

function sourceFiles(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(path));
    else if ([".ts", ".tsx"].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

test("WLT-for-DSH has one live transport path and no retired aliases", () => {
  for (const retired of [
    join(sharedRoot, "dsh-http"),
    join(sharedRoot, "wlt-dsh-api-base-url.ts"),
    join(sharedRoot, "wlt-dsh-http-request.ts"),
  ]) {
    assert.equal(existsSync(retired), false, `retired transport path exists: ${retired}`);
  }

  const forbiddenImports = [
    "../dsh-http/",
    "/dsh-http/",
    "wlt-dsh-api-base-url",
    "wlt-dsh-http-request",
  ];
  for (const file of sourceFiles(sharedRoot)) {
    const source = readFileSync(file, "utf8");
    for (const forbidden of forbiddenImports) {
      assert.equal(
        source.includes(forbidden),
        false,
        `${file} imports retired DSH transport authority: ${forbidden}`,
      );
    }
  }

  assert.equal(
    existsSync(join(sharedRoot, "dsh-link", "dsh-api-base-url.ts")),
    true,
    "the temporary canonical WLT-to-DSH transport must remain explicit until DSH injection cutover",
  );
  assert.equal(
    existsSync(join(sharedRoot, "dsh-link", "dsh-http-request.ts")),
    true,
    "the temporary canonical WLT-to-DSH request kernel must remain explicit until DSH injection cutover",
  );
});
