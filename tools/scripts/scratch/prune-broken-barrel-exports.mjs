import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const logPath = path.join(repoRoot, '.diagnostics/operational-journey-factory/typecheck-after-unused-export-burn.log');

if (!fs.existsSync(logPath)) {
  console.error(`Missing typecheck log: ${logPath}`);
  process.exit(1);
}

const log = fs.readFileSync(logPath, 'utf8');
const fixesByFile = new Map();

function addFix(file, symbol) {
  const normalized = path.resolve(repoRoot, file.replace(/^\.\.\/\.\.\/\.\.\//, ''));
  const set = fixesByFile.get(normalized) ?? new Set();
  set.add(symbol);
  fixesByFile.set(normalized, set);
}

for (const line of log.split(/\r?\n/)) {
  const fileMatch = line.match(/typecheck:\s+(.+?\.ts)x?\((\d+),(\d+)\): error TS\d+:/);
  if (!fileMatch) continue;

  const sourceFile = fileMatch[1].replace(/\\/g, '/');
  const symbolMatch = line.match(/'([^']+)'(?: locally, but it is not exported|\.|$)/)
    ?? line.match(/exported member named '([^']+)'/)
    ?? line.match(/exported member '([^']+)'/);
  if (!symbolMatch) continue;

  addFix(sourceFile, symbolMatch[1]);
}

function normalizeSpecifier(spec) {
  return spec.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
}

function removeSymbolsFromExports(content, symbols) {
  const exportBlock = /export\s+(type\s+)?\{([\s\S]*?)\}\s+from\s+(['"][^'"]+['"]);?/g;
  let changed = false;

  const next = content.replace(exportBlock, (full, typePrefix = '', body, fromPart) => {
    const specs = body.split(',').map((item) => item.trim()).filter(Boolean);
    const kept = specs.filter((spec) => !symbols.has(normalizeSpecifier(spec)));
    if (kept.length === specs.length) return full;
    changed = true;
    if (kept.length === 0) return '';
    if (full.includes('\n')) {
      return `export ${typePrefix || ''}{\n  ${kept.join(',\n  ')},\n} from ${fromPart};`;
    }
    return `export ${typePrefix || ''}{ ${kept.join(', ')} } from ${fromPart};`;
  });

  return { content: next.replace(/\n{3,}/g, '\n\n'), changed };
}

let filesChanged = 0;
let symbolsRemoved = 0;

for (const [file, symbols] of fixesByFile) {
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, 'utf8');
  const result = removeSymbolsFromExports(before, symbols);
  if (!result.changed) continue;
  fs.writeFileSync(file, result.content, 'utf8');
  filesChanged += 1;
  symbolsRemoved += symbols.size;
  console.log(`${path.relative(repoRoot, file)}: removed ${Array.from(symbols).join(', ')}`);
}

console.log(`prune-broken-barrel-exports: changed ${filesChanged} files, removed ${symbolsRemoved} broken re-export names`);
