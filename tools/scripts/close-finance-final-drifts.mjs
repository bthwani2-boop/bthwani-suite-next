import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, value) { fs.writeFileSync(path, value, 'utf8'); }
function insertBefore(text, anchor, block, label) {
  if (!text.includes(anchor)) throw new Error(`${label}: anchor not found`);
  return text.replace(anchor, block + anchor);
}

// DSH response aliases and finance surface contracts.
const dshContractPath = 'services/dsh/contracts/dsh.openapi.yaml';
let dsh = read(dshContractPath);
dsh = dsh.split('#/components/responses/BadRequest').join('#/components/responses/InvalidRequest');
const financeAnchor = '  /dsh/control-panel/finance/reconciliation-cases:\n';
const financeSurfacePaths = [
  {
    marker: '  /dsh/captain/finance/cod-records/{recordId}/collect:\n',
    block: `  /dsh/captain/finance/cod-records/{recordId}/collect:\n    post:\n      operationId: collectDshCaptainCodRecord\n      summary: Record COD cash entering authenticated captain custody through WLT.\n      tags: [DshCaptainFinance]\n      security: [{ bearerAuth: [] }]\n      parameters:\n        - name: recordId\n          in: path\n          required: true\n          schema: { type: string }\n      responses:\n        "200": { description: COD record collected, content: { application/json: { schema: { type: object, additionalProperties: true } } } }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "403": { $ref: "#/components/responses/Forbidden" }\n        "404": { $ref: "#/components/responses/NotFound" }\n        "409": { $ref: "#/components/responses/Conflict" }\n\n  /dsh/captain/finance/cod-records/{recordId}/remit:\n    post:\n      operationId: remitDshCaptainCodRecord\n      summary: Record remittance of captain-held COD cash through WLT.\n      tags: [DshCaptainFinance]\n      security: [{ bearerAuth: [] }]\n      parameters:\n        - name: recordId\n          in: path\n          required: true\n          schema: { type: string }\n      responses:\n        "200": { description: COD cash remitted, content: { application/json: { schema: { type: object, additionalProperties: true } } } }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "403": { $ref: "#/components/responses/Forbidden" }\n        "404": { $ref: "#/components/responses/NotFound" }\n        "409": { $ref: "#/components/responses/Conflict" }\n\n  /dsh/captain/finance/commissions:\n    get:\n      operationId: listDshCaptainFinanceCommissions\n      summary: List authenticated captain commissions from WLT.\n      tags: [DshCaptainFinance]\n      security: [{ bearerAuth: [] }]\n      responses:\n        "200": { description: Captain commissions, content: { application/json: { schema: { type: object, additionalProperties: true } } } }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n\n  /dsh/captain/finance/payouts:\n    get:\n      operationId: listDshCaptainFinancePayouts\n      summary: List authenticated captain payout requests from WLT.\n      tags: [DshCaptainFinance]\n      security: [{ bearerAuth: [] }]\n      responses:\n        "200": { description: Captain payouts, content: { application/json: { schema: { type: object, additionalProperties: true } } } }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n    post:\n      operationId: createDshCaptainFinancePayout\n      summary: Submit a payout request for the authenticated captain to WLT.\n      tags: [DshCaptainFinance]\n      security: [{ bearerAuth: [] }]\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema:\n              type: object\n              additionalProperties: false\n              required: [amountMinorUnits, currency, idempotencyKey]\n              properties:\n                amountMinorUnits: { type: integer, format: int64, minimum: 1 }\n                currency: { type: string, minLength: 1 }\n                idempotencyKey: { type: string, minLength: 1 }\n      responses:\n        "201": { description: Captain payout created, content: { application/json: { schema: { type: object, additionalProperties: true } } } }\n        "400": { $ref: "#/components/responses/InvalidRequest" }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "409": { $ref: "#/components/responses/Conflict" }\n\n`,
  },
  {
    marker: '  /dsh/field/finance/commissions:\n',
    block: `  /dsh/field/finance/commissions:\n    get:\n      operationId: listDshFieldFinanceCommissions\n      summary: List authenticated field-agent commissions from WLT.\n      tags: [DshFieldFinance]\n      security: [{ bearerAuth: [] }]\n      responses:\n        "200": { description: Field commissions, content: { application/json: { schema: { type: object, additionalProperties: true } } } }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n\n  /dsh/field/finance/wallet:\n    get:\n      operationId: getDshFieldFinanceWallet\n      summary: Return the authenticated field-agent WLT wallet.\n      tags: [DshFieldFinance]\n      security: [{ bearerAuth: [] }]\n      responses:\n        "200": { description: Field wallet, content: { application/json: { schema: { type: object, additionalProperties: true } } } }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n\n  /dsh/field/finance/payouts:\n    get:\n      operationId: listDshFieldFinancePayouts\n      summary: List authenticated field-agent payout requests from WLT.\n      tags: [DshFieldFinance]\n      security: [{ bearerAuth: [] }]\n      responses:\n        "200": { description: Field payouts, content: { application/json: { schema: { type: object, additionalProperties: true } } } }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n    post:\n      operationId: createDshFieldFinancePayout\n      summary: Submit an authenticated field-agent payout request to WLT.\n      tags: [DshFieldFinance]\n      security: [{ bearerAuth: [] }]\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema:\n              type: object\n              additionalProperties: false\n              required: [amountMinorUnits, currency, idempotencyKey]\n              properties:\n                amountMinorUnits: { type: integer, format: int64, minimum: 1 }\n                currency: { type: string, minLength: 1 }\n                idempotencyKey: { type: string, minLength: 1 }\n      responses:\n        "201": { description: Field payout created, content: { application/json: { schema: { type: object, additionalProperties: true } } } }\n        "400": { $ref: "#/components/responses/InvalidRequest" }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "409": { $ref: "#/components/responses/Conflict" }\n\n  /dsh/field/finance/payout-destinations:\n    get:\n      operationId: listDshFieldPayoutDestinations\n      summary: List authenticated field-agent payout destinations.\n      tags: [DshFieldFinance]\n      security: [{ bearerAuth: [] }]\n      responses:\n        "200": { description: Payout destinations, content: { application/json: { schema: { type: object, additionalProperties: true } } } }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n    post:\n      operationId: createDshFieldPayoutDestination\n      summary: Create a governed payout destination for the authenticated field agent.\n      tags: [DshFieldFinance]\n      security: [{ bearerAuth: [] }]\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema: { type: object, additionalProperties: true }\n      responses:\n        "201": { description: Payout destination created, content: { application/json: { schema: { type: object, additionalProperties: true } } } }\n        "400": { $ref: "#/components/responses/InvalidRequest" }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n\n  /dsh/field/finance/payout-destinations/{destinationId}:\n    patch:\n      operationId: updateDshFieldPayoutDestination\n      summary: Update an authenticated field-agent payout destination.\n      tags: [DshFieldFinance]\n      security: [{ bearerAuth: [] }]\n      parameters:\n        - name: destinationId\n          in: path\n          required: true\n          schema: { type: string }\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema: { type: object, additionalProperties: true }\n      responses:\n        "200": { description: Payout destination updated, content: { application/json: { schema: { type: object, additionalProperties: true } } } }\n        "400": { $ref: "#/components/responses/InvalidRequest" }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "404": { $ref: "#/components/responses/NotFound" }\n    delete:\n      operationId: deleteDshFieldPayoutDestination\n      summary: Delete an authenticated field-agent payout destination.\n      tags: [DshFieldFinance]\n      security: [{ bearerAuth: [] }]\n      parameters:\n        - name: destinationId\n          in: path\n          required: true\n          schema: { type: string }\n      responses:\n        "204": { description: Payout destination deleted }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "404": { $ref: "#/components/responses/NotFound" }\n\n`,
  },
  {
    marker: '  /dsh/operator/marketing/coupons:\n',
    block: `  /dsh/operator/marketing/coupons:\n    get:\n      operationId: listDshOperatorCoupons\n      summary: List governed coupon definitions and funding policies.\n      tags: [DshMarketing]\n      security: [{ bearerAuth: [] }]\n      responses:\n        "200": { description: Coupons, content: { application/json: { schema: { type: object, additionalProperties: true } } } }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "403": { $ref: "#/components/responses/Forbidden" }\n    post:\n      operationId: createDshOperatorCoupon\n      summary: Create a governed coupon with explicit platform, partner or shared funding.\n      tags: [DshMarketing]\n      security: [{ bearerAuth: [] }]\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema: { type: object, additionalProperties: true }\n      responses:\n        "201": { description: Coupon created, content: { application/json: { schema: { type: object, additionalProperties: true } } } }\n        "400": { $ref: "#/components/responses/InvalidRequest" }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "403": { $ref: "#/components/responses/Forbidden" }\n        "409": { $ref: "#/components/responses/Conflict" }\n\n  /dsh/operator/marketing/coupons/{couponId}:\n    patch:\n      operationId: updateDshOperatorCoupon\n      summary: Update a governed coupon and its funding policy.\n      tags: [DshMarketing]\n      security: [{ bearerAuth: [] }]\n      parameters:\n        - name: couponId\n          in: path\n          required: true\n          schema: { type: string }\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema: { type: object, additionalProperties: true }\n      responses:\n        "200": { description: Coupon updated, content: { application/json: { schema: { type: object, additionalProperties: true } } } }\n        "400": { $ref: "#/components/responses/InvalidRequest" }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "403": { $ref: "#/components/responses/Forbidden" }\n        "404": { $ref: "#/components/responses/NotFound" }\n        "409": { $ref: "#/components/responses/Conflict" }\n\n`,
  },
];
for (const { marker, block } of financeSurfacePaths) {
  if (!dsh.includes(marker)) dsh = insertBefore(dsh, financeAnchor, block, marker);
}
write(dshContractPath, dsh);

// Keep the contract patcher from reintroducing the wrong DSH response name.
const contractPatcherPath = 'tools/scripts/close-finance-contracts.mjs';
let contractPatcher = read(contractPatcherPath);
contractPatcher = contractPatcher.split('#/components/responses/BadRequest').join('#/components/responses/InvalidRequest');
write(contractPatcherPath, contractPatcher);

// Re-register governed settlement routes if a concurrent server rewrite dropped them.
const dshServerPath = 'services/dsh/backend/internal/http/server.go';
let dshServer = read(dshServerPath);
const settlementRouteAnchor = '\tmux.HandleFunc("GET /dsh/control-panel/finance/settlements/summary", protected.handleFinanceSettlementSummary)\n';
if (!dshServer.includes('POST /dsh/control-panel/finance/settlements/from-delivered-orders')) {
  if (!dshServer.includes(settlementRouteAnchor)) throw new Error('DSH settlement summary route anchor missing');
  dshServer = dshServer.replace(
    settlementRouteAnchor,
    settlementRouteAnchor +
      '\tmux.HandleFunc("POST /dsh/control-panel/finance/settlements/from-delivered-orders", protected.handleCreateFinanceSettlementFromDeliveredOrders)\n' +
      '\tmux.HandleFunc("PUT /dsh/control-panel/finance/settlement-policies/{partnerId}", protected.handleUpsertFinanceSettlementPolicy)\n',
  );
}
write(dshServerPath, dshServer);

// Every authenticated WLT commercial route must document Authorization explicitly.
const wltCommercialPath = 'services/wlt/contracts/wlt.commercial.openapi.yaml';
let wltCommercial = read(wltCommercialPath);
wltCommercial = wltCommercial.replace(
  /parameters:\n        - \$ref: '#\/components\/parameters\/ServiceCallerHeader'/g,
  "parameters:\n        - $ref: '#/components/parameters/AuthorizationHeader'\n        - $ref: '#/components/parameters/ServiceCallerHeader'",
);
write(wltCommercialPath, wltCommercial);

// Remove stale Go import introduced by a concurrent alphabet fix.
const courierCodesPath = 'services/dsh/backend/internal/partnerfleet/courier_codes.go';
let courierCodes = read(courierCodesPath);
courierCodes = courierCodes.replace('\n\t"fmt"', '');
write(courierCodesPath, courierCodes);

// PowerShell parses $name: as a scoped variable. Delimit ordinary variables
// while preserving valid $env:, $script:, $global:, $local:, $private:, $using: forms.
const runtimePath = 'infra/docker/scripts/runtime.ps1';
let runtime = read(runtimePath);
runtime = runtime.replace(/\$(?!(?:env|script|global|local|private|using):)([A-Za-z_][A-Za-z0-9_]*):/g, '${$1}:');
write(runtimePath, runtime);

console.log('Final finance route, contract and runtime drifts closed.');
