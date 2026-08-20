import assert from 'node:assert/strict';
import test from 'node:test';

import {
  captainCreatePayload,
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
