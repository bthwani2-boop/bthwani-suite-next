import fs from 'node:fs';

const entryPath = 'services/wlt/contracts/wlt.openapi.yaml';
let entry = fs.readFileSync(entryPath, 'utf8').replace(/\r\n/g, '\n');

function removeBoundedPathRange(startMarker, endMarker, label) {
  const start = entry.indexOf(startMarker);
  if (start < 0) return;
  const end = entry.indexOf(endMarker, start + startMarker.length);
  if (end <= start) throw new Error(`VC-004 could not bound duplicate ${label}`);
  entry = `${entry.slice(0, start)}${entry.slice(end)}`;
}

// The dedicated settlement-operations contract owns settlement reads and the
// posting transition. JRN-036 owns settlement creation on the shared path.
removeBoundedPathRange(
  '  /wlt/settlements:\n',
  '  /wlt/payout-requests/{payoutId}/fail:\n',
  'root settlement operations',
);

// The dedicated payout-failure boundary owns the fail-closed route and its
// reconciliation semantics. The root index must not carry a second copy.
removeBoundedPathRange(
  '  /wlt/payout-requests/{payoutId}/fail:\n',
  '  /wlt/ledger/entries:\n',
  'root payout failure boundary',
);

// The dedicated COD-record contract owns create/list/read semantics and the
// request schema derived from WLT payment truth.
removeBoundedPathRange(
  '  /wlt/cod-records:\n',
  '  /wlt/ledger/entries:\n',
  'root COD record operations',
);

fs.writeFileSync(entryPath, entry.endsWith('\n') ? entry : `${entry}\n`, 'utf8');
console.log('VC-004 specialized WLT contract ownership applied.');
