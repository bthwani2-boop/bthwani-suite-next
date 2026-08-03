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
  assert.match(source, /Test-ControlPanelPackageResolution/);
  assert.doesNotMatch(source, /pnpm\s+(add|install)\s+typescript/i);
});

test('mobile development bootstrap reports failures without immediate process termination', () => {
  const source = read('apps/mobile/mobile-dev-data.mjs');
  assert.doesNotMatch(source, /process\.exit\s*\(/);
  assert.match(source, /process\.exitCode = 1/);
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
