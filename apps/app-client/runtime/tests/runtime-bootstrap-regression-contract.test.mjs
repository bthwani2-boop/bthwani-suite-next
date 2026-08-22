import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

test('Control Panel startup restores only the governed frozen lockfile', () => {
  const source = read('apps/control-panel/runtime/start.ps1');
  assert.match(source, /pnpm install --frozen-lockfile/);
  assert.match(source, /Test-ControlPanelModuleResolution/);
  assert.doesNotMatch(source, /pnpm\s+(add|install)\s+typescript/i);
});

test('mobile development bootstrap reports failures without immediate process termination', () => {
  const source = read('tools/mobile/mobile-dev-data.mjs');
  assert.doesNotMatch(source, /process\.exit\s*\(/);
  assert.match(source, /process\.exitCode = 1/);
  assert.match(source, /return token/);
  assert.match(source, /\{ field: fieldToken \}/);
});

test('existing Workforce discovery never issues an activation challenge', () => {
  const source = read('tools/dev/local-workforce-provisioning.mjs');
  const discoveryStart = source.indexOf('async function findExistingProvider(');
  const createStart = source.indexOf('async function createProvider(', discoveryStart);
  assert.ok(discoveryStart >= 0 && createStart > discoveryStart, 'provider discovery function is missing');
  const discovery = source.slice(discoveryStart, createStart);
  assert.match(discovery, /getIdentityActor\(person\.actorId\)/);
  assert.match(discovery, /assertIdentityBinding\(kind, person\.actorId, identityActor\)/);
  assert.doesNotMatch(discovery, /activation-codes|issue-activation-check/);
});

test('canonical runtime builds service images before readiness', () => {
  const source = read('infra/docker/scripts/runtime.ps1');
  const bootstrapStart = source.indexOf('"bootstrap-dev" {');
  const verifyCatalogStart = source.indexOf('"verify-catalog" {', bootstrapStart);
  assert.ok(bootstrapStart >= 0 && verifyCatalogStart > bootstrapStart, 'bootstrap-dev action is missing');
  const bootstrap = source.slice(bootstrapStart, verifyCatalogStart);
  assert.match(bootstrap, /Invoke-Compose up -d --build/);
  assert.match(bootstrap, /Mobile full-stack development data bootstrap failed/);
  assert.doesNotMatch(bootstrap, /DSH API dev bootstrap failed/);
});

test('Workforce migration reconciles persisted generated-code sequences', () => {
  const source = read('core/workforce/database/migrations/workforce-015_workforce_code_sequence_reconciliation.sql');
  for (const marker of [
    'workforce_people_provider_code_key',
    'workforce_people_workforce_code_key',
    'workforce_field_code_seq',
    'workforce_captain_code_seq',
    'workforce_employee_code_seq',
  ]) {
    assert.ok(source.includes(marker), `missing Workforce reconciliation marker: ${marker}`);
  }
});

test('DSH remains the sovereign owner of store access scopes', () => {
  const source = read('services/dsh/backend/internal/store/governance.go');
  const resolverStart = source.indexOf('func resolveStoreIDsForActor(');
  const nextFunction = source.indexOf('func ResolveActorStore(', resolverStart);
  assert.ok(resolverStart >= 0 && nextFunction > resolverStart, 'resolveStoreIDsForActor is missing');
  const resolver = source.slice(resolverStart, nextFunction);
  assert.match(resolver, /FROM dsh_store_actor_scopes/);
  assert.match(resolver, /operator_context_id/);
  assert.doesNotMatch(resolver, /GetActorScopes/);

  const accessStart = source.indexOf('func ActorCanAccessStore(');
  const updateStart = source.indexOf('func UpdatePartnerSettings(', accessStart);
  assert.ok(accessStart >= 0 && updateStart > accessStart, 'ActorCanAccessStore is missing');
  const access = source.slice(accessStart, updateStart);
  assert.match(access, /resolveStoreIDsForActor/);
  assert.doesNotMatch(access, /GetActorScopes/);
});
