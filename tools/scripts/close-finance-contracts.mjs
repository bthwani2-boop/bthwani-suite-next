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

if (!dsh.includes('/dsh/control-panel/finance/settlements/from-delivered-orders:')) {
  assertContains(dsh, dshAnchor, 'DSH finance reconciliation anchor');
  const settlementPaths = `  /dsh/control-panel/finance/settlements/from-delivered-orders:\n    post:\n      operationId: createDshGovernedSettlementFromDeliveredOrders\n      summary: Derive eligible delivered-order sources in DSH and ask WLT to calculate the settlement.\n      tags: [DshFinanceProxy]\n      security: [{ bearerAuth: [] }]\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema:\n              type: object\n              additionalProperties: false\n              required: [partnerId, periodStart, periodEnd]\n              properties:\n                partnerId: { type: string, minLength: 1 }\n                periodStart: { type: string, format: date }\n                periodEnd: { type: string, format: date }\n                currency: { type: string, default: YER }\n      responses:\n        "201":\n          description: Governed WLT settlement created from DSH-owned delivered-order sources.\n          content:\n            application/json:\n              schema: { type: object, additionalProperties: true }\n        "400": { $ref: "#/components/responses/InvalidRequest" }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "403": { $ref: "#/components/responses/Forbidden" }\n        "409": { $ref: "#/components/responses/Conflict" }\n\n  /dsh/control-panel/finance/settlement-policies/{partnerId}:\n    put:\n      operationId: upsertDshSettlementPolicy\n      summary: Upsert the WLT-owned partner settlement fee policy.\n      tags: [DshFinanceProxy]\n      security: [{ bearerAuth: [] }]\n      parameters:\n        - name: partnerId\n          in: path\n          required: true\n          schema: { type: string }\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema:\n              type: object\n              additionalProperties: false\n              required: [feeBasisPoints]\n              properties:\n                feeBasisPoints: { type: integer, minimum: 0, maximum: 10000 }\n                currency: { type: string, default: YER }\n                status: { type: string, enum: [active, inactive], default: active }\n      responses:\n        "200":\n          description: Settlement policy persisted by WLT.\n          content:\n            application/json:\n              schema: { type: object, additionalProperties: true }\n        "400": { $ref: "#/components/responses/InvalidRequest" }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "403": { $ref: "#/components/responses/Forbidden" }\n\n`;
  dsh = dsh.replace(dshAnchor, settlementPaths + dshAnchor);
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

const settlementPaths = section(wlt, '  /wlt/settlements:\n', '  /wlt/settlements/summary:\n');
const governedSettlementPost = `  /wlt/settlements:\n    post:\n      operationId: createWltSettlement\n      summary: Create a partner settlement from immutable delivered-order sources.\n      description: >-\n        DSH supplies server-derived delivered order identities, immutable gross snapshots and delivery timestamps.\n        WLT owns the active fee policy and computes gross, platform fee, partner net and order count.\n        Caller-supplied financial totals are forbidden. The mutation remains disabled unless WLT_MUTATIONS_ENABLED=true.\n      x-bthwani-mutation-approved: true\n      x-bthwani-default-enabled: false\n      tags:\n        - WltSettlements\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema:\n              $ref: "#/components/schemas/WltCreateSettlementRequest"\n      responses:\n        "201":\n          description: Governed settlement created.\n          content:\n            application/json:\n              schema:\n                $ref: "#/components/schemas/WltSettlementResponse"\n        "400":\n          $ref: "#/components/responses/InvalidRequest"\n        "403":\n          $ref: "#/components/responses/Forbidden"\n        "409":\n          $ref: "#/components/responses/Conflict"\n`;
let settlementBlock = settlementPaths.value;
const postStart = settlementBlock.indexOf('    post:\n');
const getStart = settlementBlock.indexOf('    get:\n');
if (postStart < 0 || getStart < 0) throw new Error('WLT settlement post/get anchors missing');
settlementBlock = governedSettlementPost + settlementBlock.slice(getStart);
wlt = wlt.slice(0, settlementPaths.start) + settlementBlock + wlt.slice(settlementPaths.end);

if (!wlt.includes('  /wlt/settlement-policies/{partnerId}:\n')) {
  const anchor = '  /wlt/cod-records:\n';
  assertContains(wlt, anchor, 'WLT COD path anchor');
  const policyPath = `  /wlt/settlement-policies/{partnerId}:\n    put:\n      operationId: upsertWltSettlementPolicy\n      summary: Upsert a partner settlement fee policy owned by WLT.\n      description: Mutation-gated and service-authenticated.\n      x-bthwani-mutation-approved: true\n      x-bthwani-default-enabled: false\n      tags: [WltSettlements]\n      parameters:\n        - name: partnerId\n          in: path\n          required: true\n          schema: { type: string }\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema:\n              $ref: "#/components/schemas/WltSettlementPolicyRequest"\n      responses:\n        "200":\n          description: Settlement policy persisted.\n          content:\n            application/json:\n              schema:\n                $ref: "#/components/schemas/WltSettlementPolicyResponse"\n        "400": { $ref: "#/components/responses/InvalidRequest" }\n        "403": { $ref: "#/components/responses/Forbidden" }\n\n`;
  wlt = wlt.replace(anchor, policyPath + anchor);
}

const settlementSchema = section(wlt, '    WltCreateSettlementRequest:\n', '    WltSettlementResponse:\n');
const governedSettlementSchema = `    WltCreateSettlementRequest:\n      type: object\n      additionalProperties: false\n      required: [partnerId, periodStart, periodEnd, orderSources, operatorId]\n      properties:\n        partnerId: { type: string, minLength: 1 }\n        periodStart: { type: string, format: date }\n        periodEnd: { type: string, format: date }\n        operatorId: { type: string, minLength: 1 }\n        orderSources:\n          type: array\n          minItems: 1\n          items:\n            $ref: "#/components/schemas/WltDeliveredOrderSettlementSource"\n\n    WltDeliveredOrderSettlementSource:\n      type: object\n      additionalProperties: false\n      required: [orderId, grossAmountMinorUnits, currency, deliveredAt]\n      properties:\n        orderId: { type: string, minLength: 1 }\n        grossAmountMinorUnits: { type: integer, format: int64, minimum: 1 }\n        currency: { type: string, minLength: 1 }\n        deliveredAt: { type: string, format: date-time }\n\n    WltSettlementPolicyRequest:\n      type: object\n      additionalProperties: false\n      required: [feeBasisPoints, operatorId]\n      properties:\n        feeBasisPoints: { type: integer, minimum: 0, maximum: 10000 }\n        currency: { type: string, default: YER }\n        status: { type: string, enum: [active, inactive], default: active }\n        operatorId: { type: string, minLength: 1 }\n\n    WltSettlementPolicy:\n      type: object\n      required: [partnerId, feeBasisPoints, currency, status, updatedByOperatorId, updatedAt]\n      properties:\n        partnerId: { type: string }\n        feeBasisPoints: { type: integer }\n        currency: { type: string }\n        status: { type: string, enum: [active, inactive] }\n        updatedByOperatorId: { type: string }\n        updatedAt: { type: string, format: date-time }\n\n    WltSettlementPolicyResponse:\n      type: object\n      required: [settlementPolicy]\n      properties:\n        settlementPolicy:\n          $ref: "#/components/schemas/WltSettlementPolicy"\n\n`;
wlt = wlt.slice(0, settlementSchema.start) + governedSettlementSchema + wlt.slice(settlementSchema.end);

const accountSchema = section(wlt, '    WltLedgerAccountBalance:\n', '    WltLedgerCurrencySummary:\n');
if (!accountSchema.value.includes('            - cash_in_transit\n')) {
  const marker = '            - provider_clearing\n';
  assertContains(accountSchema.value, marker, 'WLT ledger account enum');
  const next = accountSchema.value.replace(marker, marker + '            - cash_in_transit\n');
  wlt = wlt.slice(0, accountSchema.start) + next + wlt.slice(accountSchema.end);
}
write(wltPath, wlt);

console.log('Finance contracts patched idempotently.');
