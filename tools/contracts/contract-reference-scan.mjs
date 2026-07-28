#!/usr/bin/env node
// Scans every git-tracked file for references to a contract filename (or any
// literal token). Must be run before any contract file rename/move/delete —
// the operation is not safe to proceed until this returns empty (aside from
// expected historical governance-doc prose, which is judged by a human).
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Boundary-aware: a bare token like "openapi.yaml" must not match as a suffix of a
// longer filename (e.g. "identity.openapi.yaml") — only exact-token occurrences count.
function buildBoundaryRegex(token) {
  return new RegExp(`(?<![A-Za-z0-9_.-])${escapeRegex(token)}(?![A-Za-z0-9_-])`);
}

function gitGrep(token) {
  // -I skips binary files; --fixed-strings avoids regex-metachar surprises in filenames like "dsh.catalog.overlay.yaml".
  const result = spawnSync('git', ['grep', '-n', '-I', '--fixed-strings', '--', token], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  // git grep exit code: 0 = matches found, 1 = no matches, >1 = error.
  if (result.status !== null && result.status > 1) {
    throw new Error(`git grep failed for "${token}": ${result.stderr}`);
  }
  const candidateLines = (result.stdout ?? '').split('\n').filter(Boolean);
  const boundary = buildBoundaryRegex(token);
  return candidateLines.filter((line) => {
    // line format is "path:lineNumber:content" — only test the content part for boundary match.
    const contentStart = line.indexOf(':', line.indexOf(':') + 1) + 1;
    return boundary.test(line.slice(contentStart));
  });
}

function main() {
  const tokens = process.argv.slice(2);
  if (tokens.length === 0) {
    console.error('Usage: contract-reference-scan.mjs <filename-or-token> [...more tokens]');
    process.exitCode = 1;
    return;
  }

  let anyMatches = false;
  const report = {};
  for (const token of tokens) {
    const matches = gitGrep(token);
    report[token] = matches;
    if (matches.length > 0) anyMatches = true;
  }

  console.log(JSON.stringify(report, null, 2));
  if (anyMatches) {
    console.error('\ncontract-reference-scan: matches found — review each before proceeding with any rename/delete.');
    process.exitCode = 1;
  } else {
    console.error('\ncontract-reference-scan: OK (no references found in any git-tracked file).');
  }
}

main();
