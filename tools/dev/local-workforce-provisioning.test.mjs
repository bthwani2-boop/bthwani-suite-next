import assert from 'node:assert/strict';
import test from 'node:test';

import {
  captainCreatePayload,
  HttpError,
  assertLocalApiUrl,
  needsLocalProviderConvergence,
  LOCAL_CAPTAIN_DISPATCH_CAPACITY_MINOR_UNITS,
  LOCAL_SERVICE_AREA_CODE,
  localServiceAreaPayload,
} from './local-workforce-provisioning.mjs';

test('captain bootstrap payload matches the governed Workforce create contract', () => {
  const payload = captainCreatePayload('local-zone');

  assert.equal(payload.username, 'local-captain-001');
  assert.match(payload.phoneE164, /^\+[1-9][0-9]{7,14}$/u);
  assert.equal(payload.serviceZoneId, 'local-zone');
  assert.equal(Object.hasOwn(payload, 'actorId'), false);
});

test('captain bootstrap provisions spendable COD capacity beyond protected collateral', () => {
  assert.ok(LOCAL_CAPTAIN_DISPATCH_CAPACITY_MINOR_UNITS >= 1_800_000);
});

test('zone bootstrap establishes the canonical service-area owner first', () => {
  const payload = localServiceAreaPayload();

  assert.equal(LOCAL_SERVICE_AREA_CODE, 'sana');
  assert.equal(payload.expectedVersion, 0);
  assert.equal(payload.active, true);
  assert.equal(payload.srid, 4326);
  assert.equal(payload.overlapPolicy, 'priority_then_code');
  assert.deepEqual(payload.polygon[0], payload.polygon.at(-1));
  assert.equal(payload.polygon.length, 5);
  assert.match(payload.reason, /governed local mobile development data/u);
});

test('local provider session recovery converges missing and incomplete provider state', () => {
  assert.equal(
    needsLocalProviderConvergence(new HttpError('workforce:get-field', 404, '{"code":"ACTOR_NOT_FOUND"}')),
    true,
  );
  assert.equal(
    needsLocalProviderConvergence(new HttpError('workforce:get-captain', 404, '{"code":"PROFILE_NOT_PROVISIONED"}')),
    true,
  );
  assert.equal(
    needsLocalProviderConvergence(new HttpError('workforce:captain:issue-activation', 422, '{"code":"PROFILE_INCOMPLETE"}')),
    true,
  );
  assert.equal(
    needsLocalProviderConvergence(new HttpError('workforce:get-captain', 404, '{"code":"OTHER_NOT_FOUND"}')),
    false,
  );
  assert.equal(
    needsLocalProviderConvergence(new HttpError('workforce:get-captain', 500, '{"code":"PROFILE_INCOMPLETE"}')),
    false,
  );
});

test('local workforce HTTP requests accept only loopback HTTP URLs', () => {
  assert.equal(assertLocalApiUrl('http://127.0.0.1:18086/workforce').hostname, '127.0.0.1');
  assert.equal(assertLocalApiUrl('http://[::1]:18086/workforce').hostname, '[::1]');
  for (const value of [
    'file:///etc/passwd',
    'https://127.0.0.1:18086/workforce',
    'http://attacker.example/workforce',
    'http://127.0.0.1.evil/workforce',
    'http://user:password@127.0.0.1:18086/workforce',
  ]) {
    assert.throws(() => assertLocalApiUrl(value), /loopback HTTP URL|invalid/u);
  }
});
