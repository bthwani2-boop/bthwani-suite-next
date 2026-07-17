import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, value) { fs.writeFileSync(path, value, 'utf8'); }
function assertContains(text, marker, label) {
  if (!text.includes(marker)) throw new Error(`${label}: marker not found`);
}
function section(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) throw new Error(`missing section ${startMarker}`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`missing section end ${endMarker}`);
  return { start, end, value: text.slice(start, end) };
}

const dshPath = 'services/dsh/contracts/dsh.openapi.yaml';
let dsh = read(dshPath);
const dshAnchor = '  /dsh/control-panel/finance/reconciliation-cases:\n';
if (!dsh.includes('/dsh/control-panel/finance/payout-requests/{payoutId}/process:')) {
  assertContains(dsh, dshAnchor, 'DSH finance reconciliation anchor');
  const paths = `  /dsh/control-panel/finance/payout-requests/{payoutId}/process:\n    post:\n      operationId: processDshControlPanelFinancePayoutRequest\n      summary: Operator sends an approved governed payout request to the configured WLT financial provider.\n      tags: [DshFinanceProxy]\n      security: [{ bearerAuth: [] }]\n      parameters:\n        - name: payoutId\n          in: path\n          required: true\n          schema: { type: string }\n      responses:\n        "200":\n          description: WLT provider processing result with persisted provider proof (verbatim passthrough).\n          content:\n            application/json:\n              schema: { type: object, additionalProperties: true }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "403": { $ref: "#/components/responses/Forbidden" }\n        "404": { $ref: "#/components/responses/NotFound" }\n        "409": { $ref: "#/components/responses/Conflict" }\n\n  /dsh/control-panel/finance/payout-requests/{payoutId}/complete:\n    post:\n      operationId: completeDshControlPanelFinancePayoutRequest\n      summary: A checker distinct from approver and processor completes a provider-proven payout and posts its WLT journal.\n      tags: [DshFinanceProxy]\n      security: [{ bearerAuth: [] }]\n      parameters:\n        - name: payoutId\n          in: path\n          required: true\n          schema: { type: string }\n      responses:\n        "200":\n          description: WLT payout completion and ledger result (verbatim passthrough).\n          content:\n            application/json:\n              schema: { type: object, additionalProperties: true }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "403": { $ref: "#/components/responses/Forbidden" }\n        "404": { $ref: "#/components/responses/NotFound" }\n        "409": { $ref: "#/components/responses/Conflict" }\n\n  /dsh/control-panel/finance/payout-requests/{payoutId}/fail:\n    post:\n      operationId: failDshControlPanelFinancePayoutRequest\n      summary: Route an unresolved provider payout to WLT reconciliation; it never invents a failed financial outcome.\n      tags: [DshFinanceProxy]\n      security: [{ bearerAuth: [] }]\n      parameters:\n        - name: payoutId\n          in: path\n          required: true\n          schema: { type: string }\n      responses:\n        "409": { $ref: "#/components/responses/Conflict" }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "403": { $ref: "#/components/responses/Forbidden" }\n        "404": { $ref: "#/components/responses/NotFound" }\n\n`;
  dsh = dsh.replace(dshAnchor, paths + dshAnchor);
}
write(dshPath, dsh);

const wltPath = 'services/wlt/contracts/wlt.openapi.yaml';
let wlt = read(wltPath);

const list = section(wlt, '  /wlt/payout-requests:\n', '  /wlt/payout-requests/{payoutId}:\n');
if (!list.value.includes('        - name: status\n')) {
  const actorType = `        - name: beneficiaryActorType\n          in: query\n          schema: { type: string }\n`;
  assertContains(list.value, actorType, 'WLT payout actor type parameter');
  const next = list.value.replace(actorType, actorType + `        - name: status\n          in: query\n          schema:\n            type: string\n            enum: [pending, approved, rejected, provider_pending, processing, provider_result_unknown, completed, failed]\n`);
  wlt = wlt.slice(0, list.start) + next + wlt.slice(list.end);
}

const operatorBody = `      requestBody:\n        required: true\n        content:\n          application/json:\n            schema:\n              $ref: "#/components/schemas/WltPayoutOperatorRequest"\n`;
for (const action of ['approve', 'reject', 'process', 'complete', 'fail']) {
  const startMarker = `  /wlt/payout-requests/{payoutId}/${action}:\n`;
  const start = wlt.indexOf(startMarker);
  if (start < 0) throw new Error(`missing WLT payout path ${action}`);
  let end = wlt.indexOf('\n  /wlt/', start + startMarker.length);
  if (end < 0) end = wlt.length;
  let block = wlt.slice(start, end);
  if (!block.includes('      requestBody:\n')) {
    assertContains(block, '      responses:\n', `WLT payout ${action} responses`);
    block = block.replace('      responses:\n', operatorBody + '      responses:\n');
    wlt = wlt.slice(0, start) + block + wlt.slice(end);
  }
}

if (!wlt.includes('    WltPayoutOperatorRequest:\n')) {
  const anchor = '    WltPayoutRequestResponse:\n';
  assertContains(wlt, anchor, 'WLT payout response schema');
  const schema = `    WltPayoutOperatorRequest:\n      type: object\n      required: [operatorId]\n      additionalProperties: false\n      properties:\n        operatorId:\n          type: string\n          minLength: 1\n          description: Authenticated DSH operator identity. Maker/checker separation is enforced by WLT.\n\n`;
  wlt = wlt.replace(anchor, schema + anchor);
}

const payoutSchema = section(wlt, '    WltPayoutRequest:\n', '    WltWalletStatusRefResponse:\n');
if (!payoutSchema.value.includes('        providerReference:\n')) {
  const replacement = `    WltPayoutRequest:\n      type: object\n      required:\n        - id\n        - beneficiaryActorId\n        - beneficiaryActorType\n        - amountMinorUnits\n        - currency\n        - status\n        - requestedAt\n      properties:\n        id: { type: string }\n        beneficiaryActorId: { type: string }\n        beneficiaryActorType: { type: string }\n        amountMinorUnits: { type: integer, format: int64 }\n        currency: { type: string }\n        status:\n          type: string\n          enum: [pending, approved, rejected, provider_pending, processing, provider_result_unknown, completed, failed]\n        requestedAt: { type: string, format: date-time }\n        approvedAt: { type: [string, 'null'], format: date-time }\n        rejectedAt: { type: [string, 'null'], format: date-time }\n        processedAt: { type: [string, 'null'], format: date-time }\n        completedAt: { type: [string, 'null'], format: date-time }\n        failedAt: { type: [string, 'null'], format: date-time }\n        failureReason: { type: string }\n        operatorId: { type: string }\n        approvedByOperatorId: { type: string }\n        rejectedByOperatorId: { type: string }\n        processedByOperatorId: { type: string }\n        completedByOperatorId: { type: string }\n        failedByOperatorId: { type: string }\n        providerReference:\n          type: string\n          description: Persisted provider or simulator transaction reference required before completion.\n        providerStatus:\n          type: string\n          enum: ['', unknown, declined, processed, succeeded]\n        providerProcessedAt: { type: [string, 'null'], format: date-time }\n        idempotencyKey: { type: string }\n\n`;
  wlt = wlt.slice(0, payoutSchema.start) + replacement + wlt.slice(payoutSchema.end);
}

const accountSchema = section(wlt, '    WltLedgerAccountBalance:\n', '    WltLedgerCurrencySummary:\n');
if (!accountSchema.value.includes('            - cash_in_transit\n')) {
  const marker = '            - provider_clearing\n';
  assertContains(accountSchema.value, marker, 'WLT ledger account enum');
  const next = accountSchema.value.replace(marker, marker + '            - cash_in_transit\n');
  wlt = wlt.slice(0, accountSchema.start) + next + wlt.slice(accountSchema.end);
}
write(wltPath, wlt);

console.log('Finance contracts patched idempotently.');
