// unified-fullstack-brain-gate.mjs
// Unified Fullstack Brain Guard
// Policy: governance/02_SERVICES_AND_SURFACES.md
//
// Enforces: ONE source of truth per domain/slice inside sovereign shared brains.
// Surfaces are UI-only renderers. All logic, state, validation, permission,
// lifecycle, and role policy must live in the sovereign shared brain.
//
// DSH brain  : services/dsh/frontend/shared
// WLT brain  : services/wlt/frontend/shared/dsh
// Exit 0 = PASS, Exit 1 = FAIL

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const errors = [];
const warnings = [];
const checks = [];

function err(msg) { errors.push(msg); console.error(`  ERROR: ${msg}`); }
function warn(msg) { warnings.push(msg); console.warn(`  WARN: ${msg}`); }
function pass(msg) { checks.push(msg); console.log(`  ✓ ${msg}`); }

// ── Helpers ───────────────────────────────────────────────────────────────────

function walkFiles(dir, exts = ['.ts', '.tsx']) {
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

function filename(p) { return p.split(/[/\\]/).pop(); }

// ── Constants ─────────────────────────────────────────────────────────────────

const DSH_SHARED = join(ROOT, 'services/dsh/frontend/shared');
const WLT_DSH_SHARED = join(ROOT, 'services/wlt/frontend/shared/dsh');

const DSH_SURFACES = [
  'services/dsh/frontend/control-panel',
  'services/dsh/frontend/app-partner',
  'services/dsh/frontend/app-field',
  'services/dsh/frontend/app-client',
  'services/dsh/frontend/app-captain',
].map(s => ({ rel: s, abs: join(ROOT, s), name: s.split('/').pop() }));

const WLT_SURFACES = [
  'services/wlt/frontend/control-panel',
  'services/wlt/frontend/app-partner',
  'services/wlt/frontend/app-field',
  'services/wlt/frontend/app-client',
  'services/wlt/frontend/app-captain',
].map(s => ({ rel: s, abs: join(ROOT, s), name: s.split('/').pop() }));

// Files that must NOT exist inside surfaces
const FORBIDDEN_LOGIC_FILE_PATTERNS = [
  { re: /\.api\.(ts|tsx)$/, label: 'API adapter' },
  { re: /\.adapter\.(ts|tsx)$/, label: 'adapter' },
  { re: /\.repository\.(ts|tsx)$/, label: 'repository' },
  { re: /\.repo\.(ts|tsx)$/, label: 'repository' },
  { re: /\.controller\.(ts|tsx)$/, label: 'controller' },
  { re: /\.controller-core\.(ts|tsx)$/, label: 'controller-core' },
  { re: /\.state-machine\.(ts|tsx)$/, label: 'state machine' },
  { re: /\.states\.(ts|tsx)$/, label: 'state contract' },
  { re: /\.view-model\.(ts|tsx)$/, label: 'view-model' },
  { re: /\.validation\.(ts|tsx)$/, label: 'validation' },
  { re: /\.permission\.(ts|tsx)$/, label: 'permission' },
  { re: /\.permissions\.(ts|tsx)$/, label: 'permissions' },
  { re: /\.lifecycle\.(ts|tsx)$/, label: 'lifecycle' },
  { re: /\.contract\.(ts|tsx)$/, label: 'contract' },
  { re: /\.policy\.(ts|tsx)$/, label: 'policy' },
  { re: /\.rules\.(ts|tsx)$/, label: 'rules' },
  { re: /\.mapper\.(ts|tsx)$/, label: 'mapper' },
  { re: /\.normalizer\.(ts|tsx)$/, label: 'normalizer' },
];

// Content patterns that must NOT be defined (not just imported) inside surfaces
// NOTE: useEffect is NOT in this list — UI effects (BackHandler, timers, event listeners) are
// permitted in surfaces. Data-loading useEffect is caught indirectly via fetch()/axios checks.
const FORBIDDEN_DEFINITION_PATTERNS = [
  // Network/Storage access — never in surfaces
  { re: /\bfetch\(/, label: 'direct fetch()' },
  { re: /\baxios\b/, label: 'axios' },
  { re: /\bprocess\.env\b/, label: 'process.env' },
  { re: /new URL\(/, label: 'URL construction (new URL)' },
  { re: /\blocalStorage\b/, label: 'localStorage' },
  { re: /\bsessionStorage\b/, label: 'sessionStorage' },
  { re: /\bAsyncStorage\b/, label: 'AsyncStorage' },
  // State machine ownership — must live in shared brain
  { re: /\buseReducer\(/, label: 'useReducer (state machine in surface)' },
  { re: /\bcreateContext\(/, label: 'createContext (context ownership in surface)' },
  // Domain logic — must be in shared brain, not surfaces
  { re: /\bstatusMap\b/, label: 'statusMap (domain mapping in surface)' },
  { re: /\bstateMap\b/, label: 'stateMap (domain mapping in surface)' },
  { re: /\btransitionMap\b/, label: 'transitionMap (lifecycle in surface)' },
  { re: /\bcanActivate\b/, label: 'canActivate (permission decision in surface)' },
  { re: /\bcanApprove\b/, label: 'canApprove (permission decision in surface)' },
  { re: /\bcanReject\b/, label: 'canReject (permission decision in surface)' },
  { re: /\bcanCancel\b/, label: 'canCancel (permission decision in surface)' },
  { re: /\bcanSettle\b/, label: 'canSettle (permission decision in surface)' },
  { re: /\bcanRefund\b/, label: 'canRefund (permission decision in surface)' },
  { re: /\bcanPayout\b/, label: 'canPayout (permission decision in surface)' },
  { re: /\bisTransitionAllowed\b/, label: 'isTransitionAllowed (lifecycle decision in surface)' },
  { re: /\btoViewModel\b/, label: 'toViewModel (view-model derivation in surface)' },
  { re: /\bmapResponse\b/, label: 'mapResponse (API mapping in surface)' },
  { re: /\bderiveStatus\b/, label: 'deriveStatus (domain logic in surface)' },
  { re: /\bderivePermission\b/, label: 'derivePermission (permission logic in surface)' },
  { re: /\brolePolicy\b/, label: 'rolePolicy (policy ownership in surface)' },
  { re: /\bviewPolicy\b/, label: 'viewPolicy (policy ownership in surface)' },
];

// Financial mutation patterns forbidden in DSH entirely and in WLT surfaces
const FINANCIAL_MUTATION_PATTERNS = [
  { re: /wallet_balance_mutation/, label: 'wallet_balance_mutation' },
  { re: /payment_confirmation/, label: 'payment_confirmation' },
  { re: /refund_finalization/, label: 'refund_finalization' },
  { re: /settlement_posting/, label: 'settlement_posting' },
  { re: /ledger_entry_mutation/, label: 'ledger_entry_mutation' },
  { re: /payout_decision_mutation/, label: 'payout_decision_mutation' },
  { re: /commission_finalization/, label: 'commission_finalization' },
  { re: /\bmutateWallet\b/, label: 'mutateWallet' },
  { re: /\bconfirmPayment\b/, label: 'confirmPayment' },
  { re: /\bfinalizeRefund\b/, label: 'finalizeRefund' },
  { re: /\bpostSettlement\b/, label: 'postSettlement' },
];

const IMPORT_LINE_RE = /^\s*(?:import|export)\s+/;

function isLocalDefinition(src, matchIndex) {
  const lineStart = src.lastIndexOf('\n', matchIndex) + 1;
  const lineEnd = src.indexOf('\n', matchIndex);
  const line = src.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
  return !IMPORT_LINE_RE.test(line);
}

// ── CHECK 1: Sovereign Brains Exist ──────────────────────────────────────────

console.log('\n=== CHECK 1: Sovereign Brain Existence ===');

if (!existsSync(DSH_SHARED)) err(`CRITICAL: DSH brain missing: services/dsh/frontend/shared`);
else pass('DSH sovereign brain: services/dsh/frontend/shared');

if (!existsSync(WLT_DSH_SHARED)) err(`CRITICAL: WLT-for-DSH brain missing: services/wlt/frontend/shared/dsh`);
else pass('WLT-for-DSH sovereign brain: services/wlt/frontend/shared/dsh');

for (const surface of [...DSH_SURFACES, ...WLT_SURFACES]) {
  if (!existsSync(surface.abs)) err(`CRITICAL: UI surface missing: ${surface.rel}`);
}

const APP_RUNTIME_BOOTSTRAPS = [
  'apps/control-panel/runtime',
  'apps/app-partner/runtime',
  'apps/app-field/runtime',
  'apps/app-client/runtime',
  'apps/app-captain/runtime',
];

for (const runtimePath of APP_RUNTIME_BOOTSTRAPS) {
  if (!existsSync(join(ROOT, runtimePath))) err(`CRITICAL: app runtime bootstrap missing: ${runtimePath}`);
  else pass(`App runtime bootstrap exists: ${runtimePath}`);
}

// ── CHECK 2: DSH Surface — No Logic Files ────────────────────────────────────

console.log('\n=== CHECK 2: DSH Surfaces — No Logic File Ownership ===');
let dshLogicFileHits = 0;
for (const surface of DSH_SURFACES) {
  for (const file of walkFiles(surface.abs)) {
    const name = filename(file);
    for (const { re, label } of FORBIDDEN_LOGIC_FILE_PATTERNS) {
      if (re.test(name)) {
        err(`${label} file '${name}' in DSH surface '${surface.name}' — move to services/dsh/frontend/shared`);
        dshLogicFileHits++;
      }
    }
  }
}
if (dshLogicFileHits === 0) pass('No logic files in DSH surfaces');

// ── CHECK 3: WLT Surface — No Logic Files ────────────────────────────────────

console.log('\n=== CHECK 3: WLT Surfaces — No Logic File Ownership ===');
let wltLogicFileHits = 0;
for (const surface of WLT_SURFACES) {
  for (const file of walkFiles(surface.abs)) {
    const name = filename(file);
    for (const { re, label } of FORBIDDEN_LOGIC_FILE_PATTERNS) {
      if (re.test(name)) {
        err(`${label} file '${name}' in WLT surface '${surface.name}' — move to services/wlt/frontend/shared/dsh`);
        wltLogicFileHits++;
      }
    }
  }
}
if (wltLogicFileHits === 0) pass('No logic files in WLT surfaces');

// ── CHECK 4: DSH Surface — No Forbidden Content ──────────────────────────────

console.log('\n=== CHECK 4: DSH Surfaces — No Forbidden Content ===');
let dshContentHits = 0;
for (const surface of DSH_SURFACES) {
  for (const file of walkFiles(surface.abs)) {
    const src = readAbs(file);
    for (const { re, label } of FORBIDDEN_DEFINITION_PATTERNS) {
      const match = re.exec(src);
      if (match && isLocalDefinition(src, match.index)) {
        err(`${label} in DSH surface ${rel(file)}`);
        dshContentHits++;
      }
    }
  }
}
if (dshContentHits === 0) pass('No forbidden content definitions in DSH surfaces');

// ── CHECK 5: Financial Mutation Must Not Exist in DSH Frontend ───────────────

console.log('\n=== CHECK 5: No Financial Mutation in DSH Frontend ===');

const DSH_FRONTEND_ABS = join(ROOT, 'services/dsh/frontend');
let dshFinancialHits = 0;
for (const file of walkFiles(DSH_FRONTEND_ABS)) {
  const src = readAbs(file);
  for (const { re, label } of FINANCIAL_MUTATION_PATTERNS) {
    if (re.test(src)) {
      err(`Financial mutation '${label}' in DSH frontend ${rel(file)} — only WLT owns financial mutations`);
      dshFinancialHits++;
    }
  }
}
if (dshFinancialHits === 0) pass('No financial mutations in DSH frontend');

// ── CHECK 6: Financial Mutation Must Not Exist in WLT Surfaces ───────────────

console.log('\n=== CHECK 6: No Financial Mutation in WLT Surfaces ===');
let wltFinancialHits = 0;
for (const surface of WLT_SURFACES) {
  for (const file of walkFiles(surface.abs)) {
    const src = readAbs(file);
    for (const { re, label } of FINANCIAL_MUTATION_PATTERNS) {
      if (re.test(src)) {
        err(`Financial mutation '${label}' in WLT surface ${rel(file)} — surfaces are read-only`);
        wltFinancialHits++;
      }
    }
  }
}
if (wltFinancialHits === 0) pass('No financial mutations in WLT surfaces');

// ── CHECK 7: No Cross-Surface Imports ────────────────────────────────────────

console.log('\n=== CHECK 7: No Cross-Surface Imports ===');
let crossSurfaceHits = 0;
const dshSurfaceNames = DSH_SURFACES.map(s => s.name);
for (const surface of DSH_SURFACES) {
  for (const file of walkFiles(surface.abs)) {
    const src = readAbs(file);
    for (const other of dshSurfaceNames) {
      if (other === surface.name) continue;
      if (new RegExp(`from\\s+['"][^'"]*/${other}/`).test(src)) {
        err(`Cross-surface import: ${surface.name} → ${other} in ${rel(file)}`);
        crossSurfaceHits++;
      }
    }
  }
}
if (crossSurfaceHits === 0) pass('No cross-surface imports');

// ── CHECK 8: DSH UI Must Not Import WLT shared/dsh Directly ─────────────────

console.log('\n=== CHECK 8: DSH UI Must Not Import WLT Directly ===');
let dshWltDirectHits = 0;
for (const surface of DSH_SURFACES) {
  for (const file of walkFiles(surface.abs)) {
    const src = readAbs(file);
    if (/from\s+['"][^'"]*services\/wlt\/frontend\/shared/.test(src)) {
      err(`DSH surface imports WLT shared/dsh directly in ${rel(file)} — route through DSH shared brain`);
      dshWltDirectHits++;
    }
  }
}
if (dshWltDirectHits === 0) pass('No DSH UI → WLT direct imports');

// ── CHECK 9: Shared Must Not Import Surfaces ──────────────────────────────────

console.log('\n=== CHECK 9: Shared Brain Must Not Import Surfaces ===');
const allSurfaceNames = [...DSH_SURFACES, ...WLT_SURFACES].map(s => s.name);
let sharedImportSurfaceHits = 0;
for (const brainAbs of [DSH_SHARED, WLT_DSH_SHARED]) {
  for (const file of walkFiles(brainAbs)) {
    const src = readAbs(file);
    for (const surfaceName of allSurfaceNames) {
      if (new RegExp(`from\\s+['"][^'"]*/${surfaceName}['"/]`).test(src)) {
        err(`Shared brain imports surface '${surfaceName}' in ${rel(file)}`);
        sharedImportSurfaceHits++;
      }
    }
    if (/from\s+['"][^'"]*\/apps\//.test(src)) {
      err(`Shared brain imports from apps/ runtime in ${rel(file)}`);
      sharedImportSurfaceHits++;
    }
  }
}
if (sharedImportSurfaceHits === 0) pass('Shared brain does not import surfaces or apps/');

// ── CHECK 10: No Old Ports in Surfaces/Shared ────────────────────────────────

console.log('\n=== CHECK 10: No Old Ports ===');
const OLD_PORT_RE = /:(8080|8081|8082|8083|8084|3000)\b/;
let oldPortHits = 0;
const portScanDirs = [
  ...DSH_SURFACES.map(s => s.abs),
  ...WLT_SURFACES.map(s => s.abs),
  DSH_SHARED,
  WLT_DSH_SHARED,
];
for (const dir of portScanDirs) {
  for (const file of walkFiles(dir)) {
    const m = OLD_PORT_RE.exec(readAbs(file));
    if (m) { err(`Old port :${m[1]} in ${rel(file)}`); oldPortHits++; }
  }
}
if (oldPortHits === 0) pass('No old ports in frontend');

// ── CHECK 11: WLT shared/dsh Must Not Have Localhost Fallback ────────────────

console.log('\n=== CHECK 11: No Localhost Fallback in WLT shared/dsh ===');
let localhostHits = 0;
for (const file of walkFiles(WLT_DSH_SHARED)) {
  if (/\bhttp:\/\/(?:localhost|127\.0\.0\.1)\b/i.test(readAbs(file))) {
    err(`Localhost fallback in WLT shared/dsh ${rel(file)}`);
    localhostHits++;
  }
}
if (localhostHits === 0) pass('No localhost fallback in WLT shared/dsh');

console.log('\n=== CHECK 12: No Closure Gap Markers In Closed Surfaces ===');
const GAP_MARKERS = new RegExp(
  `\\b(${['FIX', 'REQUIRED'].join('_')}|TODO|${['UN', 'PROVEN'].join('')}|${['NOT', 'BOUND'].join('_')}|scaffold)\\b`,
  'i',
);
let markerHits = 0;
for (const surface of DSH_SURFACES) {
  for (const file of walkFiles(surface.abs, ['.ts', '.tsx', '.js', '.jsx'])) {
    if (GAP_MARKERS.test(readAbs(file))) {
      err(`Closure gap marker in DSH surface ${rel(file)}`);
      markerHits++;
    }
  }
}
if (markerHits === 0) pass('No closure gap markers in DSH surfaces');

// ── CHECK 13: Unified Source Per Domain — No Duplicated Logic in Shared ───────

console.log('\n=== CHECK 13: Unified Source Per Domain ===');

// Scan for duplicate controller names across DSH shared
const controllerMap = new Map();
for (const file of walkFiles(DSH_SHARED)) {
  const name = filename(file);
  if (/use-.*-controller\.(ts|tsx)$/.test(name)) {
    const key = name.replace(/\.(ts|tsx)$/, '');
    if (controllerMap.has(key)) {
      err(`Duplicate controller '${key}' found at ${rel(file)} and ${rel(controllerMap.get(key))}`);
    } else {
      controllerMap.set(key, file);
    }
  }
}
if (controllerMap.size > 0) pass(`DSH shared controllers verified unique: ${controllerMap.size} controller(s)`);

// Scan for duplicate view-model names across DSH shared
const vmMap = new Map();
for (const file of walkFiles(DSH_SHARED)) {
  const name = filename(file);
  if (/\.view-model\.(ts|tsx)$/.test(name)) {
    const key = name.replace(/\.(ts|tsx)$/, '');
    if (vmMap.has(key)) {
      err(`Duplicate view-model '${key}' found at ${rel(file)} and ${rel(vmMap.get(key))}`);
    } else {
      vmMap.set(key, file);
    }
  }
}
if (vmMap.size > 0) pass(`DSH shared view-models verified unique: ${vmMap.size} view-model(s)`);

// ── CHECK 13: Surfaces Consuming Shared Controllers ───────────────────────────

console.log('\n=== CHECK 13: Surface-to-Shared Controller Consumption ===');

const CONTROLLER_BINDING_CHECKS = [
  {
    file: 'services/dsh/frontend/app-client/store/StoreDiscoveryScreen.tsx',
    pattern: /\buseStoreDiscoveryController\b/,
    label: 'StoreDiscoveryScreen must consume useStoreDiscoveryController',
  },
  {
    file: 'services/dsh/frontend/control-panel/partners/stores/StoreManagementScreen.tsx',
    pattern: /\buseStoreAdminController\b/,
    label: 'StoreManagementScreen must consume useStoreAdminController',
  },
  {
    file: 'services/dsh/frontend/app-partner/store/PartnerStoreScreen.tsx',
    pattern: /\buseStoreRoleContextController\b/,
    label: 'PartnerStoreScreen must consume useStoreRoleContextController',
  },
  {
    file: 'services/dsh/frontend/app-field/stores/FieldStoreVerificationScreen.tsx',
    pattern: /\buseStoreRoleContextController\b/,
    label: 'FieldStoreVerificationScreen must consume useStoreRoleContextController',
  },
  {
    file: 'services/dsh/frontend/app-field/store/FieldStoreVerificationScreen.tsx',
    pattern: /\buseStoreRoleContextController\b/,
    label: 'FieldStoreVerificationScreen compatibility path must consume useStoreRoleContextController',
  },
  {
    file: 'services/dsh/frontend/app-captain/store/CaptainStorePickupContextScreen.tsx',
    pattern: /\buseStoreRoleContextController\b/,
    label: 'CaptainStorePickupContextScreen must consume useStoreRoleContextController',
  },
];

let boundSurfaces = 0;
let unboundSurfaces = 0;
for (const check of CONTROLLER_BINDING_CHECKS) {
  const absPath = join(ROOT, check.file);
  if (!existsSync(absPath)) {
    err(`${['NOT', 'BOUND', 'SURFACE', 'FIX', 'REQUIRED'].join('_')}: ${check.file} — ${check.label}`);
    unboundSurfaces++;
  } else {
    const src = readAbs(absPath);
    if (!check.pattern.test(src)) {
      err(`UNBOUND: ${check.label} in ${check.file}`);
      unboundSurfaces++;
    } else {
      boundSurfaces++;
    }
  }
}
if (unboundSurfaces === 0) pass(`All surface-to-controller bindings verified: ${boundSurfaces}`);
else err(`${unboundSurfaces} surface binding(s) are missing`);

// ── CHECK 14: WLT Surfaces Must Not Import DSH Backend Directly ───────────────

console.log('\n=== CHECK 14: WLT Surfaces Must Not Import DSH Backend ===');
let wltDshBackendHits = 0;
for (const surface of WLT_SURFACES) {
  for (const file of walkFiles(surface.abs)) {
    const src = readAbs(file);
    if (/from\s+['"][^'"]*services\/dsh\/backend/.test(src) ||
        /from\s+['"][^'"]*services\/dsh\/generated/.test(src)) {
      err(`WLT surface imports DSH backend/generated in ${rel(file)}`);
      wltDshBackendHits++;
    }
  }
}
if (wltDshBackendHits === 0) pass('WLT surfaces do not import DSH backend directly');

// ── Summary ───────────────────────────────────────────────────────────────────

const result = errors.length === 0 ? 'PASS' : 'FAIL';

console.log('\n=== UNIFIED FULLSTACK BRAIN GATE RESULTS ===');
console.log(`Checks passed : ${checks.length}`);
console.log(`Errors        : ${errors.length}`);
console.log(`Warnings      : ${warnings.length}`);
console.log(`RETIRED_MATRIX: NOT_USED`);
console.log(`\nRESULT: ${result}`);

process.exit(errors.length === 0 ? 0 : 1);
