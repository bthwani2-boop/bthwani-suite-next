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
