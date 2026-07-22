import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import test from 'node:test';

const repositoryRoot = resolve(import.meta.dirname, '../../..');

test('JRN-014 governed dispatch integrity gate passes', () => {
  const result = spawnSync(
    process.execPath,
    [resolve(repositoryRoot, 'tools/guards/jrn-014-dispatch-integrity-gate.mjs')],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: process.env,
    },
  );

  assert.equal(
    result.status,
    0,
    `dispatch integrity gate failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  assert.match(result.stdout, /dispatch integrity gate passed/);
});
