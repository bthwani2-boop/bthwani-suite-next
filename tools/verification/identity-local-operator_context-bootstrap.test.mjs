import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

const identityMain = read("core/identity/backend/cmd/identity-api/main.go");
const identityDockerfile = read("core/identity/backend/Dockerfile");
const seedDockerfile = read("core/identity/backend/Dockerfile.local-bootstrap");
const seedCommand = read("core/identity/backend/cmd/identity-local-bootstrap/main.go");
const seedPackage = read("core/identity/backend/internal/localbootstrap/bootstrap.go");
const compose = read("infra/docker/compose.runtime.yml");
const devCompose = read("infra/docker/compose.dev-bootstrap.yml");
const cleanupMigration = read("core/identity/database/migrations/identity-039_retire_embedded_local_bootstrap_authority.sql");

test("production Identity API has no development bootstrap capability or wiring", () => {
  assert.doesNotMatch(identityMain, /localbootstrap|identity-local-bootstrap|BTHWANI_LOCAL_DEV_PASSWORD|BTHWANI_OPERATOR_CONTEXT_ID/);
  assert.match(identityMain, /identityhttp\.NewRouter/);
  assert.doesNotMatch(compose, /IDENTITY_LOCAL_BOOTSTRAP|IDENTITY_LOCAL_BOOTSTRAP_PASSWORD|identity-local-bootstrap|BTHWANI_LOCAL_DEV_PASSWORD/);
  assert.match(identityDockerfile, /go build -o \/out\/identity-api \.\/cmd\/identity-api/);
});

test("development seed is a separate one-shot artifact restricted to development", () => {
  assert.match(seedDockerfile, /go build -o \/out\/identity-local-bootstrap \.\/cmd\/identity-local-bootstrap/);
  assert.match(seedCommand, /BTHWANI_RUNTIME_MODE/);
  assert.match(seedCommand, /BTHWANI_LOCAL_DEV_PASSWORD/);
  assert.match(seedCommand, /localbootstrap\.Run/);
  assert.match(devCompose, /profiles:\s*\n\s*- dev-bootstrap/);
  assert.match(devCompose, /identity-local-bootstrap/);
  assert.match(devCompose, /BTHWANI_OPERATOR_CONTEXT_ID/);
  assert.match(devCompose, /BTHWANI_LOCAL_DEV_PASSWORD/);
});

test("development seed binds actors through the canonical Identity writer", () => {
  assert.match(seedPackage, /UpsertActorWithAccess/);
  assert.match(seedPackage, /GetActorPermissions/);
  assert.match(seedPackage, /identity-local-development-seed/);
  assert.doesNotMatch(seedPackage, /INSERT INTO identity_actor_direct_permissions/);
  assert.doesNotMatch(seedPackage, /INSERT INTO identity_actor_roles/);
});

test("migration removes historical development authority and fails closed on residue", () => {
  assert.match(cleanupMigration, /DELETE FROM identity_sessions/);
  assert.match(cleanupMigration, /DELETE FROM identity_actor_roles/);
  assert.match(cleanupMigration, /DELETE FROM identity_actors/);
  assert.match(cleanupMigration, /retired local bootstrap actors remain/);
  assert.match(cleanupMigration, /local platform roles remain assigned to non-fixture actors/);
});
