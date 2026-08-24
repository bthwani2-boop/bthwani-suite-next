import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

const apiMain = read("core/identity/backend/cmd/identity-api/main.go");
const bootstrapMain = read("core/identity/backend/cmd/identity-local-bootstrap/main.go");
const apiDockerfile = read("core/identity/backend/Dockerfile");
const bootstrapDockerfile = read("core/identity/backend/Dockerfile.local-bootstrap");
const repository = read("core/identity/backend/internal/identity/repository.go");
const platformBootstrap = read("core/identity/backend/internal/identity/platform_local_bootstrap.go");
const compose = read("infra/docker/compose.runtime.yml");
const localProduction = read("infra/docker/env/runtime.local-production.env.example");

test("production-capable identity-api owns no local-development bootstrap entry authority", () => {
  for (const marker of [
    "BootstrapLocalActors",
    "BootstrapLocalPlatformActors",
    "BootstrapSovereignLeadershipAccess",
    "ReconcileLocalBootstrapSecurityState",
    "superviseLocalBootstrap",
    "IDENTITY_LOCAL_BOOTSTRAP",
    "BTHWANI_LOCAL_IDENTITY_BOOTSTRAP_PASSWORD",
  ]) {
    assert.doesNotMatch(apiMain, new RegExp(marker));
  }
  assert.doesNotMatch(apiDockerfile, /identity-local-bootstrap/);
});

test("one-shot bootstrap binds runtime class and operator context before writes", () => {
  const authorization = bootstrapMain.indexOf("localDevelopmentBootstrapAuthorized()");
  const operatorContext = bootstrapMain.indexOf("OperatorContextID:");
  const baseActors = bootstrapMain.indexOf("BootstrapLocalActors");
  const platformActors = bootstrapMain.indexOf("BootstrapLocalPlatformActors");
  const leadership = bootstrapMain.indexOf("BootstrapSovereignLeadershipAccess");
  const reconcile = bootstrapMain.indexOf("ReconcileLocalBootstrapSecurityState");
  const readback = bootstrapMain.indexOf("LocalBootstrapConverged");

  assert.ok(authorization >= 0);
  assert.ok(operatorContext > authorization);
  assert.ok(baseActors > operatorContext);
  assert.ok(platformActors > baseActors);
  assert.ok(leadership > platformActors);
  assert.ok(reconcile > leadership);
  assert.ok(readback > reconcile);
  assert.match(bootstrapMain, /BTHWANI_LOCAL_DEVELOPMENT_BOOTSTRAP_AUTHORIZED/);
  assert.match(bootstrapMain, /BTHWANI_RUNTIME_MODE/);
  assert.match(bootstrapMain, /BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED/);
  assert.match(bootstrapMain, /BTHWANI_OPERATOR_CONTEXT_ID/);
});

test("local bootstrap image is physically separate from the production API image", () => {
  assert.match(bootstrapDockerfile, /\.\/cmd\/identity-local-bootstrap/);
  assert.doesNotMatch(bootstrapDockerfile, /\.\/cmd\/identity-api/);
  assert.match(apiDockerfile, /\.\/cmd\/identity-api/);
  assert.doesNotMatch(apiDockerfile, /\.\/cmd\/identity-local-bootstrap/);
});

test("compose routes fixture writes through the one-shot service and fences production-like mode", () => {
  const apiStart = compose.indexOf("  identity-api:");
  const bootstrapStart = compose.indexOf("  identity-local-bootstrap:");
  const workforceStart = compose.indexOf("  workforce-api:");
  assert.ok(apiStart >= 0 && bootstrapStart > apiStart && workforceStart > bootstrapStart);

  const apiBlock = compose.slice(apiStart, bootstrapStart);
  const bootstrapBlock = compose.slice(bootstrapStart, workforceStart);
  assert.match(apiBlock, /identity-local-bootstrap:[\s\S]*condition: service_completed_successfully/);
  assert.doesNotMatch(apiBlock, /IDENTITY_LOCAL_BOOTSTRAP|BTHWANI_LOCAL_IDENTITY_BOOTSTRAP_PASSWORD/);
  assert.match(bootstrapBlock, /Dockerfile\.local-bootstrap/);
  assert.match(bootstrapBlock, /BTHWANI_LOCAL_DEVELOPMENT_BOOTSTRAP_AUTHORIZED/);
  assert.match(bootstrapBlock, /BTHWANI_LOCAL_IDENTITY_BOOTSTRAP_PASSWORD/);
  assert.match(localProduction, /^BTHWANI_RUNTIME_MODE=production$/m);
  assert.match(localProduction, /^BTHWANI_LOCAL_DEVELOPMENT_BOOTSTRAP_AUTHORIZED=false$/m);
  assert.doesNotMatch(localProduction, /^BTHWANI_LOCAL_IDENTITY_BOOTSTRAP_PASSWORD=/m);
});

test("bootstrap mutation primitives require a bound operator context", () => {
  assert.match(repository, /operatorContextID := strings\.TrimSpace\(input\.OperatorContextID\)/);
  assert.match(repository, /operator_context_id = EXCLUDED\.operator_context_id/);
  assert.match(platformBootstrap, /operatorContextID := strings\.TrimSpace\(input\.OperatorContextID\)/);
  assert.match(platformBootstrap, /operator_context_id = EXCLUDED\.operator_context_id/);
});
