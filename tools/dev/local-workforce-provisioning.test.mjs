import assert from 'node:assert/strict';
import test from 'node:test';

import {
  captainCreatePayload,
  HttpError,
  needsLocalProviderConvergence,
  LOCAL_CAPTAIN_DISPATCH_CAPACITY_MINOR_UNITS,
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
