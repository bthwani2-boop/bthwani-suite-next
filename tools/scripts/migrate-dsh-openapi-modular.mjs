import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { migrateDshOpenApi } from './dsh-openapi-modular-lib.mjs';

const apply = process.argv.includes('--apply');
if (!apply) {
  throw new Error('Refusing to modify contracts without --apply.');
}

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const diagnosticPath = path.join(repositoryRoot, '.diagnostics/contracts/dsh-openapi-modularization-error.txt');

function persistFailure(error) {
  if (process.env.GITHUB_ACTIONS !== 'true') return;
  fs.mkdirSync(path.dirname(diagnosticPath), { recursive: true });
  const payload = [
    `commit=${process.env.GITHUB_SHA ?? 'unknown'}`,
    `workflow=${process.env.GITHUB_WORKFLOW ?? 'unknown'}`,
    '',
    error?.stack ?? String(error),
    '',
  ].join('\n');
  fs.writeFileSync(diagnosticPath, payload, 'utf8');
  execFileSync('git', ['config', 'user.name', 'github-actions[bot]'], { cwd: repositoryRoot });
  execFileSync('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'], { cwd: repositoryRoot });
  execFileSync('git', ['add', '-f', '.diagnostics/contracts/dsh-openapi-modularization-error.txt'], { cwd: repositoryRoot });
  execFileSync('git', ['commit', '-m', 'diagnostics(dsh): capture OpenAPI modularization failure'], { cwd: repositoryRoot, stdio: 'inherit' });
  execFileSync('git', ['push', 'origin', 'HEAD:sambassam'], { cwd: repositoryRoot, stdio: 'inherit' });
}

try {
  const result = migrateDshOpenApi();
  if (fs.existsSync(diagnosticPath)) fs.rmSync(diagnosticPath, { force: true });
  console.log(`DSH OpenAPI modularization completed: ${JSON.stringify(result)}`);
} catch (error) {
  console.error(error?.stack ?? error);
  persistFailure(error);
  process.exitCode = 1;
}
