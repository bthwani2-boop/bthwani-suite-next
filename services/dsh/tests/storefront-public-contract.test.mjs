import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");

test("public storefront has one discovery contract and no bearer requirement", () => {
  const discovery = read("services/dsh/contracts/paths/discovery.paths.yaml");
  const runtimeExtensions = read("services/dsh/contracts/dsh.runtime-extensions.openapi.yaml");
  const primary = read("services/dsh/contracts/dsh.openapi.yaml");
  const storefront = discovery.slice(discovery.indexOf("/dsh/storefront/{storeId}:"));

  assert.match(primary, /paths\/discovery\.paths\.yaml#\/~1dsh~1storefront~1\{storeId\}/u);
  assert.match(storefront, /operationId: getDshStorefront/u);
  assert.match(storefront, /security: \[\]/u);
  assert.doesNotMatch(storefront, /bearerAuth/u);
  assert.match(storefront, /"304":/u);
  assert.match(storefront, /"404":/u);
  assert.match(storefront, /"500":/u);
  assert.doesNotMatch(runtimeExtensions, /\/dsh\/storefront\/\{storeId\}/u);
});

test("runtime registers the same storefront as a public route", () => {
  const server = read("services/dsh/backend/internal/http/server.go");
  assert.match(server, /HandleFunc\("GET \/dsh\/storefront\/\{storeId\}", handlePublicStorefront\(db\)\)/u);
  assert.doesNotMatch(server, /storefront\/\{storeId\}.*withBearer|withBearer.*storefront\/\{storeId\}/su);
});
