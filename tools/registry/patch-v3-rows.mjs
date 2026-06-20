// patch-v3-rows.mjs — targeted field-level patch for 4 rows in V3
// No header change, no row add/remove, no rebuild.
// Node.js — no external dependencies.

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const V3 = join(__dirname, '..', '..', 'machine-readable', 'slice_execution_master_matrix_v3.csv');

function parseCSV(content) {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const rows = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const row = [];
    let inQ = false, f = '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { f += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) { row.push(f); f = ''; }
      else f += c;
    }
    row.push(f);
    rows.push(row);
  }
  return rows;
}

function toCSVField(v) {
  if (v.includes('"') || v.includes(',') || v.includes('\n') || v.includes(';') || v.includes('->') || v.includes('|'))
    return '"' + v.replace(/"/g, '""') + '"';
  return '"' + v + '"';
}

function rowToLine(row) {
  return row.map(toCSVField).join(',');
}

const raw = readFileSync(V3, 'utf8');
const allRows = parseCSV(raw);
const headers = allRows[0];
const dataRows = allRows.slice(1);

// Build column index
const col = {};
headers.forEach((h, i) => { col[h] = i; });

const required = ['master_v3_id','source_matrix','source_record_ids','source_path','db_state_lifecycle','state_transitions'];
for (const c of required) {
  if (col[c] === undefined) throw new Error(`Column not found: ${c}`);
}

// Patches — keyed by master_v3_id
const patches = {
  'V3-01181': {
    db_state_lifecycle:
      'CREATED -> PAYMENT_PENDING -> ACCEPTED_BY_STORE -> PREPARING -> READY_FOR_PICKUP -> DISPATCHING -> DRIVER_ASSIGNED -> ARRIVED_AT_STORE -> PICKED_UP -> ARRIVED_AT_CUSTOMER -> DELIVERED',
    state_transitions:
      'CREATED->PAYMENT_PENDING; PAYMENT_PENDING->ACCEPTED_BY_STORE; ACCEPTED_BY_STORE->PREPARING; PREPARING->READY_FOR_PICKUP; READY_FOR_PICKUP->DISPATCHING; DISPATCHING->DRIVER_ASSIGNED; DRIVER_ASSIGNED->ARRIVED_AT_STORE; ARRIVED_AT_STORE->PICKED_UP; PICKED_UP->ARRIVED_AT_CUSTOMER; ARRIVED_AT_CUSTOMER->DELIVERED',
  },
  'V3-01182': {
    db_state_lifecycle:
      'INITIATED -> AUTHORIZED -> ON_HOLD -> CAPTURED -> SETTLED -> RECONCILED',
    state_transitions:
      'INITIATED->AUTHORIZED; AUTHORIZED->ON_HOLD; ON_HOLD->CAPTURED; CAPTURED->SETTLED; SETTLED->RECONCILED; INITIATED->FAILED; AUTHORIZED->REVERSED; SETTLED->REFUND_PENDING; REFUND_PENDING->PARTIALLY_REFUNDED; REFUND_PENDING->REFUNDED',
  },
  'V3-01179': {
    source_matrix:    'donor_control_panel_alias_matrix',
    source_record_ids: 'administration',
    source_path:      'donor/administration',
  },
  'V3-01180': {
    source_matrix:    'donor_control_panel_alias_matrix',
    source_record_ids: 'hr',
    source_path:      'donor/hr',
  },
};

let patched = 0;
for (const row of dataRows) {
  const id = row[col['master_v3_id']];
  const p = patches[id];
  if (!p) continue;
  for (const [field, value] of Object.entries(p)) {
    const before = row[col[field]];
    row[col[field]] = value;
    console.log(`  ${id}.${field}: [${before.slice(0,60)}] -> [${value.slice(0,60)}]`);
  }
  patched++;
}

console.log(`\nRows patched: ${patched} / ${Object.keys(patches).length} expected`);
if (patched !== Object.keys(patches).length) {
  console.error('ERROR: not all target rows found — aborting write');
  process.exit(1);
}

const out = [rowToLine(headers), ...dataRows.map(rowToLine)].join('\n') + '\n';

// UTF-8 no-BOM
writeFileSync(V3, out, { encoding: 'utf8' });
console.log('V3 written — UTF-8 no-BOM');

// Quick check: no BOM
const b = readFileSync(V3);
if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) {
  console.error('ERROR: BOM detected after write');
  process.exit(1);
}
console.log('BOM check: clean');
