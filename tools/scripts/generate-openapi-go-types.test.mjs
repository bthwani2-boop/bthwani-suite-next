import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { parse } from "yaml";
import { generateGoTypesFromDocument } from "./generate-openapi-go-types.mjs";

const bundle = parse(fs.readFileSync("core/identity/contracts/generated/identity.bundle.openapi.yaml", "utf8"));

test("generates deterministic Go models for component and inline response schemas", () => {
  const first = generateGoTypesFromDocument(bundle, "core/identity/contracts/generated/identity.bundle.openapi.yaml");
  const second = generateGoTypesFromDocument(bundle, "core/identity/contracts/generated/identity.bundle.openapi.yaml");

  assert.equal(first, second);
  assert.match(first, /type ActorIdentity struct/);
  assert.match(first, /OperatorContextID\s+string\s+`json:"operatorContextId"`/);
  assert.match(first, /NameAr\s+string\s+`json:"nameAr"`/);
  assert.match(first, /type RbacRole struct/);
  assert.match(first, /type ListRBACRolesResponse struct/);
  assert.match(first, /type ResolveActorPermissionsResponse struct/);
  assert.doesNotMatch(first, /type Identity struct/);
});

test("fails closed instead of emitting any for unsupported OpenAPI schemas", () => {
  assert.throws(
    () => generateGoTypesFromDocument({ components: { schemas: { Unsupported: { type: "null" } } } }, "unsupported-null.yaml"),
    /unsupported-null\.yaml: unsupported OpenAPI schema at components\.schemas\.Unsupported/,
  );
  assert.throws(
    () => generateGoTypesFromDocument({ components: { schemas: { Unsupported: { oneOf: [{ type: "string" }, { type: "integer" }] } } } }, "unsupported-union.yaml"),
    /unsupported-union\.yaml: unsupported OpenAPI schema at components\.schemas\.Unsupported\.oneOf/,
  );
});

test("formats with the exact Identity Go toolchain instead of ambient gofmt", () => {
  const generator = fs.readFileSync("tools/scripts/generate-openapi-go-types.mjs", "utf8");
  assert.match(generator, /GOVERSION/);
  assert.match(generator, /GOTOOLCHAIN:\s*"local"/);
  assert.doesNotMatch(generator, /execFileSync\("gofmt"/);
});
