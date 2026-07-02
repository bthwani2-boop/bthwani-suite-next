// guard-journey-operating-model.mjs
// Sovereign Brain & Live Topology Guard
// Policy: governance/02_SERVICES_AND_SURFACES.md
//
// Method: live repository topology + sovereign brain contracts + unified fullstack brain
// Exit 0 = PASS, Exit 1 = FAIL

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const RETIRED_MATRIX_ROOT = 'machine' + '-readable';

const errors = [];
const warnings = [];
const checks = [];

function err(msg) { errors.push(msg); console.error(`  ERROR: ${msg}`); }
function warn(msg) { warnings.push(msg); console.warn(`  WARN: ${msg}`); }
function pass(msg) { checks.push(msg); console.log(`  ✓ ${msg}`); }

// ── Helpers ───────────────────────────────────────────────────────────────────

function dirExists(rel) { return existsSync(join(ROOT, rel)); }
function fileExists(rel) { return existsSync(join(ROOT, rel)); }

function walkFiles(dir, exts = ['.ts', '.tsx', '.mjs', '.js']) {
  const results = [];
  if (!existsSync(dir)) return results;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        results.push(...walkFiles(full, exts));
      } else if (exts.some(e => entry.name.endsWith(e))) {
        results.push(full);
      }
    }
  } catch { /* skip unreadable */ }
  return results;
}

function readAbs(p) {
  try { return readFileSync(p, 'utf8'); } catch { return ''; }
}

function rel(p) { return relative(ROOT, p).replace(/\\/g, '/'); }

// ── 1. Machine-Readable Dependency Scan ──────────────────────────────────────
// CRITICAL: the retired matrix root must not be referenced in any active guard, CI, or script.

console.log('\n=== CHECK 1: Machine-Readable Dependency Scan ===');

const MR_DIR = join(ROOT, RETIRED_MATRIX_ROOT);
if (existsSync(MR_DIR)) {
  err(`${RETIRED_MATRIX_ROOT}/ directory still exists`);
}

// Active guards: those registered in guard-manifest.json foundation/journey sets
const THIS_FILE = 'tools/guards/guard-journey-operating-model.mjs';
const DEAD_CODE_PREFIXES = [
  'tools/registry/',
  'tools/plan/',
  'governance/',
];

function isDeadCode(filePath) {
  const p = filePath.replace(/\\/g, '/');
  return DEAD_CODE_PREFIXES.some(prefix => p.includes(prefix.replace(/\//g, '/')));
}

const MR_SCAN_DIRS = ['tools/guards', 'tools/scripts', '.github', 'contracts'];
let mrHits = 0;
let mrWarnings = 0;
for (const scanDir of MR_SCAN_DIRS) {
  const abs = join(ROOT, scanDir);
  if (!existsSync(abs)) continue;
  const files = walkFiles(abs, ['.ts', '.tsx', '.mjs', '.js', '.json', '.yml', '.yaml', '.ps1']);
  for (const f of files) {
    if (f.replace(/\\/g, '/').endsWith(THIS_FILE)) continue;
    const src = readAbs(f);
    if (new RegExp(`${RETIRED_MATRIX_ROOT}[/\\\\]`).test(src) || src.includes(`readJSON('${RETIRED_MATRIX_ROOT}`) || src.includes(`readJSON("${RETIRED_MATRIX_ROOT}`)) {
      if (isDeadCode(f)) {
        err(`retired matrix reference in inactive file scanned by guard: ${rel(f)}`);
        mrWarnings++;
      } else {
        err(`retired matrix dependency in active guard: ${rel(f)}`);
        mrHits++;
      }
    }
  }
}
if (mrHits === 0 && mrWarnings === 0) pass('No retired matrix dependencies in any guards/CI');

// ── 2. Sovereign Brain Existence ──────────────────────────────────────────────

console.log('\n=== CHECK 2: Sovereign Brain Existence ===');

const DSH_SHARED = 'services/dsh/frontend/shared';
const WLT_DSH_SHARED = 'services/wlt/frontend/shared/dsh';

if (!dirExists(DSH_SHARED)) {
  err(`CRITICAL: DSH sovereign brain missing: ${DSH_SHARED}`);
} else {
  pass(`DSH sovereign brain exists: ${DSH_SHARED}`);
}

if (!dirExists(WLT_DSH_SHARED)) {
  err(`CRITICAL: WLT-for-DSH sovereign brain missing: ${WLT_DSH_SHARED}`);
} else {
  pass(`WLT-for-DSH sovereign brain exists: ${WLT_DSH_SHARED}`);
}

// ── 3. DSH UI-Only Surfaces Existence or Reservation ─────────────────────────

console.log('\n=== CHECK 3: DSH UI-Only Surfaces ===');

const DSH_SURFACES = [
  'services/dsh/frontend/control-panel',
  'services/dsh/frontend/app-partner',
  'services/dsh/frontend/app-field',
  'services/dsh/frontend/app-client',
  'services/dsh/frontend/app-captain',
];

for (const surface of DSH_SURFACES) {
  if (!dirExists(surface)) {
    err(`DSH surface not found: ${surface}`);
  } else {
    pass(`DSH surface exists: ${surface}`);
  }
}

// ── 4. WLT UI-Only Surfaces Existence or Reservation ─────────────────────────

console.log('\n=== CHECK 4: WLT UI-Only Surfaces ===');

const WLT_SURFACES = [
  'services/wlt/frontend/control-panel',
  'services/wlt/frontend/app-partner',
  'services/wlt/frontend/app-field',
  'services/wlt/frontend/app-client',
  'services/wlt/frontend/app-captain',
];

for (const surface of WLT_SURFACES) {
  if (!dirExists(surface)) {
    err(`WLT surface not found: ${surface}`);
  } else {
    pass(`WLT surface exists: ${surface}`);
  }
}

// ── 5. Shared Must Not Import Surfaces ───────────────────────────────────────

console.log('\n=== CHECK 5: Shared Must Not Import Surfaces ===');

const ALL_SURFACE_NAMES = [...DSH_SURFACES, ...WLT_SURFACES].map(s => s.split('/').pop());
const SHARED_DIRS = [DSH_SHARED, WLT_DSH_SHARED];

for (const sharedDir of SHARED_DIRS) {
  for (const file of walkFiles(join(ROOT, sharedDir))) {
    const src = readAbs(file);
    for (const surface of ALL_SURFACE_NAMES) {
      if (new RegExp(`from\\s+['"][^'"]*/${surface}['"/]`).test(src)) {
        err(`shared imports surface '${surface}' in ${rel(file)}`);
      }
    }
    if (/from\s+['"][^'"]*\/apps\/[^'"]+['"]/.test(src) || /from\s+['"]apps\//.test(src)) {
      err(`shared imports from apps/ runtime in ${rel(file)}`);
    }
  }
}
pass('Shared brain import boundary scan complete');

// ── 6. DSH Surfaces Must Not Own Logic Files ─────────────────────────────────

console.log('\n=== CHECK 6: DSH Surface Logic File Ownership ===');

const FORBIDDEN_FILE_PATTERNS = [
  /\.api\.(ts|tsx)$/,
  /\.adapter\.(ts|tsx)$/,
  /\.repository\.(ts|tsx)$/,
  /\.repo\.(ts|tsx)$/,
  /\.controller\.(ts|tsx)$/,
  /\.controller-core\.(ts|tsx)$/,
  /\.state-machine\.(ts|tsx)$/,
  /\.view-model\.(ts|tsx)$/,
  /\.validation\.(ts|tsx)$/,
  /\.permission\.(ts|tsx)$/,
  /\.permissions\.(ts|tsx)$/,
  /\.lifecycle\.(ts|tsx)$/,
  /\.policy\.(ts|tsx)$/,
  /\.rules\.(ts|tsx)$/,
  /\.mapper\.(ts|tsx)$/,
  /\.normalizer\.(ts|tsx)$/,
];

for (const surfaceRel of DSH_SURFACES) {
  const surfaceAbs = join(ROOT, surfaceRel);
  for (const file of walkFiles(surfaceAbs)) {
    const filename = file.split(/[/\\]/).pop();
    for (const pat of FORBIDDEN_FILE_PATTERNS) {
      if (pat.test(filename)) {
        err(`Logic file '${filename}' in DSH surface ${surfaceRel} — move to shared brain`);
      }
    }
  }
}
pass('DSH surface logic ownership scan complete');

// ── 7. WLT Surfaces Must Not Own Logic Files ──────────────────────────────────

console.log('\n=== CHECK 7: WLT Surface Logic File Ownership ===');

for (const surfaceRel of WLT_SURFACES) {
  const surfaceAbs = join(ROOT, surfaceRel);
  for (const file of walkFiles(surfaceAbs)) {
    const filename = file.split(/[/\\]/).pop();
    for (const pat of FORBIDDEN_FILE_PATTERNS) {
      if (pat.test(filename)) {
        err(`Logic file '${filename}' in WLT surface ${surfaceRel} — move to WLT shared brain`);
      }
    }
  }
}
pass('WLT surface logic ownership scan complete');

// ── 8. DSH Surfaces Must Not Have Forbidden Content ──────────────────────────

console.log('\n=== CHECK 8: DSH Surface Forbidden Content Patterns ===');

const FORBIDDEN_CONTENT = [
  { re: /\bfetch\(/, label: 'direct fetch()' },
  { re: /\baxios\b/, label: 'axios import/call' },
  { re: /\bprocess\.env\b/, label: 'process.env access' },
  { re: /\buseReducer\(/, label: 'useReducer (state machine in surface)' },
  { re: /\bcreateContext\(/, label: 'createContext (context ownership in surface)' },
  { re: /new URL\(/, label: 'URL construction' },
  { re: /\blocalStorage\b/, label: 'localStorage' },
  { re: /\bsessionStorage\b/, label: 'sessionStorage' },
  { re: /\bAsyncStorage\b/, label: 'AsyncStorage' },
  { re: /\bstatusMap\b/, label: 'statusMap (domain mapping)' },
  { re: /\bstateMap\b/, label: 'stateMap (domain mapping)' },
  { re: /\btransitionMap\b/, label: 'transitionMap (lifecycle in surface)' },
  { re: /\bcanActivate\b/, label: 'canActivate (permission in surface)' },
  { re: /\bcanApprove\b/, label: 'canApprove (permission in surface)' },
  { re: /\bcanReject\b/, label: 'canReject (permission in surface)' },
  { re: /\bcanCancel\b/, label: 'canCancel (permission in surface)' },
  { re: /\bisTransitionAllowed\b/, label: 'isTransitionAllowed (lifecycle in surface)' },
  { re: /\btoViewModel\b/, label: 'toViewModel (view-model derivation)' },
  { re: /\bmapResponse\b/, label: 'mapResponse (API mapping in surface)' },
  { re: /\bderiveStatus\b/, label: 'deriveStatus (domain logic in surface)' },
  { re: /\bderivePermission\b/, label: 'derivePermission (permission in surface)' },
  { re: /\brolePolicy\b/, label: 'rolePolicy (policy ownership in surface)' },
  { re: /\bviewPolicy\b/, label: 'viewPolicy (policy ownership in surface)' },
];

const IMPORT_LINE_RE = /^\s*(?:import|export)\s+/;

function isLocalDefinition(src, matchIndex) {
  const lineStart = src.lastIndexOf('\n', matchIndex) + 1;
  const lineEnd = src.indexOf('\n', matchIndex);
  const line = src.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
  return !IMPORT_LINE_RE.test(line);
}

for (const surfaceRel of DSH_SURFACES) {
  const surfaceAbs = join(ROOT, surfaceRel);
  for (const file of walkFiles(surfaceAbs)) {
    const src = readAbs(file);
    for (const { re, label } of FORBIDDEN_CONTENT) {
      const match = re.exec(src);
      if (match && isLocalDefinition(src, match.index)) {
        err(`${label} in DSH surface ${rel(file)}`);
      }
    }
  }
}
pass('DSH surface forbidden content scan complete');

// ── 9. No Cross-Surface Imports ───────────────────────────────────────────────

console.log('\n=== CHECK 9: No Cross-Surface Imports ===');

const DSH_SURFACE_NAMES = DSH_SURFACES.map(s => s.split('/').pop());

for (const surfaceRel of DSH_SURFACES) {
  const thisSurface = surfaceRel.split('/').pop();
  const surfaceAbs = join(ROOT, surfaceRel);
  for (const file of walkFiles(surfaceAbs)) {
    const src = readAbs(file);
    for (const other of DSH_SURFACE_NAMES) {
      if (other === thisSurface) continue;
      if (new RegExp(`from\\s+['"][^'"]*/${other}/`).test(src)) {
        err(`Cross-surface import: ${thisSurface} → ${other} in ${rel(file)}`);
      }
    }
  }
}
pass('Cross-surface import scan complete');

// ── 10. DSH UI Must Not Import WLT Directly ──────────────────────────────────

console.log('\n=== CHECK 10: DSH UI Must Not Import WLT Directly ===');

for (const surfaceRel of DSH_SURFACES) {
  const surfaceAbs = join(ROOT, surfaceRel);
  for (const file of walkFiles(surfaceAbs)) {
    const src = readAbs(file);
    if (/from\s+['"][^'"]*services\/wlt\/frontend\/shared/.test(src)) {
      err(`DSH surface imports WLT shared/dsh directly in ${rel(file)} — route through DSH shared brain`);
    }
  }
}
pass('DSH UI → WLT direct import scan complete');

// ── 11. No Old Ports ──────────────────────────────────────────────────────────

console.log('\n=== CHECK 11: No Old Ports in Frontend ===');

const OLD_PORT_RE = /:(8080|8081|8082|8083|8084|3000)\b/;
const PORT_SCAN_DIRS = [
  ...DSH_SURFACES.map(s => join(ROOT, s)),
  join(ROOT, DSH_SHARED),
  join(ROOT, WLT_DSH_SHARED),
];
let oldPortHits = 0;
for (const dir of PORT_SCAN_DIRS) {
  for (const file of walkFiles(dir)) {
    const src = readAbs(file);
    const m = OLD_PORT_RE.exec(src);
    if (m) {
      err(`Old port :${m[1]} in ${rel(file)} — use canonical ports`);
      oldPortHits++;
    }
  }
}
if (oldPortHits === 0) pass('No old ports in frontend surfaces/shared');

// ── 12. unified-fullstack-brain-gate Must Exist and Be Registered ─────────────

console.log('\n=== CHECK 12: Unified Fullstack Brain Gate Registration ===');

const UFB_GATE_PATH = 'tools/guards/unified-fullstack-brain-gate.mjs';
if (!fileExists(UFB_GATE_PATH)) {
  err(`CRITICAL: ${UFB_GATE_PATH} missing`);
} else {
  pass('unified-fullstack-brain-gate.mjs exists');
}

const manifestPath = join(ROOT, 'tools/guards/guard-manifest.json');
if (existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const hasInFoundation = (manifest.guardSets?.foundation || []).includes('unified-fullstack-brain');
    const hasInJourney = (manifest.guardSets?.journey || []).includes('unified-fullstack-brain');
    const hasEntry = (manifest.guards || []).some(g => g.id === 'unified-fullstack-brain');
    if (!hasInFoundation) err('unified-fullstack-brain not in guard-manifest foundation set');
    else pass('unified-fullstack-brain registered in foundation set');
    if (!hasInJourney) err('unified-fullstack-brain not in guard-manifest journey set');
    else pass('unified-fullstack-brain registered in journey set');
    if (!hasEntry) err('unified-fullstack-brain has no entry in guard-manifest guards array');
    else pass('unified-fullstack-brain guard entry found');
  } catch (e) {
    err(`Could not parse guard-manifest.json: ${e.message}`);
  }
}

// ── 13. Guard Paths Must Exist ────────────────────────────────────────────────

console.log('\n=== CHECK 13: Guard File Existence ===');

if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  let missingGuards = 0;
  for (const guard of (manifest.guards || [])) {
    if (guard.path && !fileExists(guard.path)) {
      err(`Guard file not found for '${guard.id}': ${guard.path}`);
      missingGuards++;
    }
  }
  if (missingGuards === 0) pass('All guard files exist');
}

// ── 14. No Personal IDE Settings in Repo ─────────────────────────────────────

console.log('\n=== CHECK 14: No Personal IDE Settings ===');

const VSCODE_SETTINGS = join(ROOT, '.vscode/settings.json');
if (existsSync(VSCODE_SETTINGS)) {
  const content = readAbs(join(ROOT, '.vscode/settings.json'));
  if (/CodeGeeX|codegeex/i.test(content)) {
    err('.vscode/settings.json contains CodeGeeX personal IDE settings — remove from repo');
  } else {
    warn('.vscode/settings.json present — verify it contains only shared project settings');
  }
}

// ── 15. DSH Fullstack Chain: adapter → controller → view-model in shared ──────

console.log('\n=== CHECK 15: DSH Shared Brain Fullstack Chain ===');

const DSH_SHARED_ABS = join(ROOT, DSH_SHARED);
const sharedFiles = walkFiles(DSH_SHARED_ABS);
if (sharedFiles.some(f => /\.api\.(ts|tsx)$/.test(f))) pass('DSH shared has API adapter(s)');
else warn('No *.api.ts adapter in DSH shared — fullstack chain may be incomplete');
if (sharedFiles.some(f => /use-.*-controller\.(ts|tsx)$/.test(f))) pass('DSH shared has controller(s)');
else warn('No use-*-controller in DSH shared');
if (sharedFiles.some(f => /\.view-model\.(ts|tsx)$/.test(f))) pass('DSH shared has view-model(s)');
else warn('No *.view-model.ts in DSH shared');
if (sharedFiles.some(f => /\.states\.(ts|tsx)$/.test(f))) pass('DSH shared has state contract(s)');
else warn('No *.states.ts in DSH shared');

// ── 16. WLT-for-DSH Required Boundary Files ───────────────────────────────────

console.log('\n=== CHECK 16: WLT-for-DSH Boundary Files ===');

const REQUIRED_WLT_DSH_FILES = [
  'services/wlt/frontend/shared/dsh/index.ts',
  'services/wlt/frontend/shared/dsh/wlt-dsh-boundary.types.ts',
];

for (const f of REQUIRED_WLT_DSH_FILES) {
  if (!fileExists(f)) err(`Missing WLT-for-DSH boundary file: ${f}`);
  else pass(`WLT-for-DSH boundary file exists: ${f}`);
}

// ── Summary ───────────────────────────────────────────────────────────────────

const result = errors.length === 0 ? 'PASS' : 'FAIL';

const output = {
  timestamp: new Date().toISOString(),
  guard: 'journey-operating-model-live-topology',
  retired_matrix: 'NOT_USED',
  result,
  errors,
  warnings,
  checks_passed: checks.length,
  sovereign_brains: {
    dsh: DSH_SHARED,
    wlt_for_dsh: WLT_DSH_SHARED,
  },
};

console.log('\n=== GUARD MATRIX V3 (LIVE TOPOLOGY) RESULTS ===');
console.log(`Checks passed : ${checks.length}`);
console.log(`Errors        : ${errors.length}`);
console.log(`Warnings      : ${warnings.length}`);
console.log(`RETIRED_MATRIX: NOT_USED`);
console.log(`\nRESULT: ${result}`);

process.exit(errors.length === 0 ? 0 : 1);
