import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, value) => fs.writeFileSync(path, value, 'utf8');

function insertBefore(text, anchor, block, label) {
  if (!text.includes(anchor)) throw new Error(`${label}: anchor not found`);
  return text.replace(anchor, `${block}${anchor}`);
}

function genericPath(path, methods, tag) {
  const pathParamMatches = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  let output = `  ${path}:\n`;
  for (const method of methods) {
    const operationId = `${method}${path}`
      .replace(/[^A-Za-z0-9]+(.)/g, (_, character) => character.toUpperCase())
      .replace(/[^A-Za-z0-9]/g, '');
    output += `    ${method.toLowerCase()}:\n`;
    output += `      operationId: ${operationId}\n`;
    output += `      summary: Governed finance operation owned by DSH/WLT.\n`;
    output += `      tags: [${tag}]\n`;
    output += `      security: [{ bearerAuth: [] }]\n`;
    if (pathParamMatches.length > 0) {
      output += '      parameters:\n';
      for (const name of pathParamMatches) {
        output += `        - name: ${name}\n          in: path\n          required: true\n          schema: { type: string }\n`;
      }
    }
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      output += `      requestBody:\n        required: false\n        content:\n          application/json:\n            schema: { type: object, additionalProperties: true }\n`;
    }
    output += `      responses:\n`;
    output += `        "200": { description: Governed finance response, content: { application/json: { schema: { type: object, additionalProperties: true } } } }\n`;
    if (method === 'POST') {
      output += `        "201": { description: Governed finance object created, content: { application/json: { schema: { type: object, additionalProperties: true } } } }\n`;
    }
    if (method === 'DELETE') output += `        "204": { description: Governed finance object deleted }\n`;
    output += `        "400": { $ref: "#/components/responses/InvalidRequest" }\n`;
    output += `        "401": { $ref: "#/components/responses/Unauthenticated" }\n`;
    output += `        "403": { $ref: "#/components/responses/Forbidden" }\n`;
    output += `        "404": { $ref: "#/components/responses/NotFound" }\n`;
    output += `        "409": { $ref: "#/components/responses/Conflict" }\n`;
  }
  return `${output}\n`;
}

const dshContractPath = 'services/dsh/contracts/dsh.openapi.yaml';
let dsh = read(dshContractPath).split('#/components/responses/BadRequest').join('#/components/responses/InvalidRequest');
const financeAnchor = '  /dsh/control-panel/finance/reconciliation-cases:\n';

const specialSettlementPaths = [
  {
    path: '/dsh/control-panel/finance/settlements/from-delivered-orders',
    yaml: `  /dsh/control-panel/finance/settlements/from-delivered-orders:\n    post:\n      operationId: createDshGovernedSettlementFromDeliveredOrders\n      summary: Derive immutable delivered-order sources in DSH and ask WLT to calculate the settlement.\n      tags: [DshFinanceProxy]\n      security: [{ bearerAuth: [] }]\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema:\n              type: object\n              additionalProperties: false\n              required: [partnerId, periodStart, periodEnd]\n              properties:\n                partnerId: { type: string, minLength: 1 }\n                periodStart: { type: string, format: date }\n                periodEnd: { type: string, format: date }\n                currency: { type: string, default: YER }\n      responses:\n        "201": { description: Governed settlement created, content: { application/json: { schema: { type: object, additionalProperties: true } } } }\n        "400": { $ref: "#/components/responses/InvalidRequest" }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "403": { $ref: "#/components/responses/Forbidden" }\n        "409": { $ref: "#/components/responses/Conflict" }\n\n`,
  },
  {
    path: '/dsh/control-panel/finance/settlement-policies/{partnerId}',
    yaml: `  /dsh/control-panel/finance/settlement-policies/{partnerId}:\n    put:\n      operationId: upsertDshSettlementPolicy\n      summary: Upsert the WLT-owned partner settlement fee policy.\n      tags: [DshFinanceProxy]\n      security: [{ bearerAuth: [] }]\n      parameters:\n        - name: partnerId\n          in: path\n          required: true\n          schema: { type: string }\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema:\n              type: object\n              additionalProperties: false\n              required: [feeBasisPoints]\n              properties:\n                feeBasisPoints: { type: integer, minimum: 0, maximum: 10000 }\n                currency: { type: string, default: YER }\n                status: { type: string, enum: [active, inactive], default: active }\n      responses:\n        "200": { description: Settlement policy persisted, content: { application/json: { schema: { type: object, additionalProperties: true } } } }\n        "400": { $ref: "#/components/responses/InvalidRequest" }\n        "401": { $ref: "#/components/responses/Unauthenticated" }\n        "403": { $ref: "#/components/responses/Forbidden" }\n\n`,
  },
];
for (const entry of specialSettlementPaths) {
  if (!dsh.includes(`  ${entry.path}:\n`)) dsh = insertBefore(dsh, financeAnchor, entry.yaml, entry.path);
}

const financeSurfacePaths = [
  ['/dsh/captain/finance/cod-records/{recordId}/collect', ['POST'], 'DshCaptainFinance'],
  ['/dsh/captain/finance/cod-records/{recordId}/remit', ['POST'], 'DshCaptainFinance'],
  ['/dsh/captain/finance/commissions', ['GET'], 'DshCaptainFinance'],
  ['/dsh/captain/finance/payouts', ['GET', 'POST'], 'DshCaptainFinance'],
  ['/dsh/field/finance/commissions', ['GET'], 'DshFieldFinance'],
  ['/dsh/field/finance/wallet', ['GET'], 'DshFieldFinance'],
  ['/dsh/field/finance/payouts', ['GET', 'POST'], 'DshFieldFinance'],
  ['/dsh/field/finance/payout-destinations', ['GET', 'POST'], 'DshFieldFinance'],
  ['/dsh/field/finance/payout-destinations/{destinationId}', ['PATCH', 'DELETE'], 'DshFieldFinance'],
];
for (const [path, methods, tag] of financeSurfacePaths) {
  if (!dsh.includes(`  ${path}:\n`)) dsh = insertBefore(dsh, financeAnchor, genericPath(path, methods, tag), path);
}
write(dshContractPath, dsh);

const contractPatcherPath = 'tools/scripts/close-finance-contracts.mjs';
let contractPatcher = read(contractPatcherPath).split('#/components/responses/BadRequest').join('#/components/responses/InvalidRequest');
write(contractPatcherPath, contractPatcher);

const dshServerPath = 'services/dsh/backend/internal/http/server.go';
let dshServer = read(dshServerPath);
const settlementSummaryRoute = '\tmux.HandleFunc("GET /dsh/control-panel/finance/settlements/summary", protected.handleFinanceSettlementSummary)\n';
if (!dshServer.includes('POST /dsh/control-panel/finance/settlements/from-delivered-orders')) {
  if (!dshServer.includes(settlementSummaryRoute)) throw new Error('DSH settlement summary route anchor missing');
  dshServer = dshServer.replace(
    settlementSummaryRoute,
    settlementSummaryRoute +
      '\tmux.HandleFunc("POST /dsh/control-panel/finance/settlements/from-delivered-orders", protected.handleCreateFinanceSettlementFromDeliveredOrders)\n' +
      '\tmux.HandleFunc("PUT /dsh/control-panel/finance/settlement-policies/{partnerId}", protected.handleUpsertFinanceSettlementPolicy)\n',
  );
}
write(dshServerPath, dshServer);

const courierCodesPath = 'services/dsh/backend/internal/partnerfleet/courier_codes.go';
write(courierCodesPath, read(courierCodesPath).replace('\n\t"fmt"', ''));

const runtimePath = 'infra/docker/scripts/runtime.ps1';
let runtime = read(runtimePath);
runtime = runtime.replace(/\$(?!(?:env|script|global|local|private|using):)([A-Za-z_][A-Za-z0-9_]*):/g, '${$1}:');
write(runtimePath, runtime);

const wltCommercialPath = 'services/wlt/contracts/wlt.commercial.openapi.yaml';
let wltCommercial = read(wltCommercialPath);
wltCommercial = wltCommercial.replace(
  /parameters:\n        - \$ref: '#\/components\/parameters\/ServiceCallerHeader'/g,
  "parameters:\n        - $ref: '#/components/parameters/AuthorizationHeader'\n        - $ref: '#/components/parameters/ServiceCallerHeader'",
);
write(wltCommercialPath, wltCommercial);

console.log('Final finance route, contract and runtime drifts closed.');
