import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml'; // We use the standard yaml library installed in the project

const repoRoot = process.cwd();
const allowlistPath = path.join(repoRoot, 'tools/guards/dsh-route-declaration-allowlist.json');
const dshOpenApiPath = path.join(repoRoot, 'services/dsh/contracts/dsh.openapi.yaml');
const contractsDir = path.join(repoRoot, 'services/dsh/contracts');

const allowlistRaw = fs.readFileSync(allowlistPath, 'utf8');
const allowlist = JSON.parse(allowlistRaw);

const mainDoc = yaml.parseDocument(fs.readFileSync(dshOpenApiPath, 'utf8'));

const contractMap = {
  '/dsh/client/addresses': 'dsh.client-address.openapi.yaml',
  '/dsh/notifications': 'dsh.notifications-governance.openapi.yaml',
  '/dsh/operator/catalog': 'dsh.catalog-governance.openapi.yaml',
  '/dsh/captain/dispatch': 'dsh.dispatch-governance.openapi.yaml',
  '/dsh/captain/me/ratings': 'dsh.captain-financial-eligibility.openapi.yaml',
  '/dsh/captain/partner-fleet': 'dsh.partner-fleet.openapi.yaml',
  '/dsh/client/benefits': 'dsh.marketing-commercial.openapi.yaml',
  '/dsh/client/marketing': 'dsh.marketing-commercial.openapi.yaml',
  '/dsh/client/me/ratings': 'dsh.order-truth.openapi.yaml',
  '/dsh/client/order-truth': 'dsh.order-truth.openapi.yaml',
  '/dsh/client/orders': 'dsh.order-truth.openapi.yaml',
  '/dsh/field/catalog': 'dsh.catalog.openapi.yaml',
  '/dsh/field/me/ratings': 'dsh.runtime-extensions.openapi.yaml',
  '/dsh/field/partners': 'dsh.partner-onboarding.openapi.yaml',
  '/dsh/operator/admin': 'dsh.administration.openapi.yaml',
  '/dsh/operator/analytics': 'dsh.analytics-extensions.openapi.yaml',
  '/dsh/operator/delivery-proofs': 'dsh.delivery-proof-media.openapi.yaml',
  '/dsh/operator/dispatch': 'dsh.dispatch-governance.openapi.yaml',
  '/dsh/operator/home-discovery': 'dsh.home-marketing-governance.openapi.yaml',
  '/dsh/operator/marketing': 'dsh.marketing-commercial.openapi.yaml',
  '/dsh/operator/notifications': 'dsh.notifications-governance.openapi.yaml',
  '/dsh/operator/operational-incidents': 'dsh.incident-governance.openapi.yaml',
  '/dsh/operator/order-truth': 'dsh.order-truth.openapi.yaml',
  '/dsh/operator/order-workboard': 'dsh.order-workboards.openapi.yaml',
  '/dsh/operator/partner-delivery': 'dsh.partner-delivery.openapi.yaml',
  '/dsh/operator/pickups': 'dsh.store-captain-handoff.openapi.yaml',
  '/dsh/operator/platform': 'dsh.platform-policies.openapi.yaml',
  '/dsh/operator/privacy': 'dsh.client-address-privacy.openapi.yaml',
  '/dsh/operator/reels': 'dsh.reels.openapi.yaml',
  '/dsh/operator/stores': 'dsh.runtime-extensions.openapi.yaml',
  '/dsh/operator/support': 'dsh.support-governance.openapi.yaml',
  '/dsh/operator/workforce': 'dsh.workforce-scopes.openapi.yaml',
  '/dsh/partner/catalog': 'dsh.catalog.openapi.yaml',
  '/dsh/partner/me/ratings': 'dsh.order-truth.openapi.yaml',
  '/dsh/partner/order-truth': 'dsh.order-truth.openapi.yaml',
  '/dsh/partner/stores': 'dsh.partner-onboarding.openapi.yaml',
  '/dsh/support': 'dsh.support-message-delivery.openapi.yaml'
};

const getDefaultContract = (routePath) => {
  for (const [prefix, contractFile] of Object.entries(contractMap)) {
    if (routePath.startsWith(prefix)) return contractFile;
  }
  return 'dsh.runtime-extensions.openapi.yaml';
};

const routesByContract = {};
for (const entry of allowlist.entries) {
  const contractFile = getDefaultContract(entry.path);
  if (!routesByContract[contractFile]) routesByContract[contractFile] = {};
  if (!routesByContract[contractFile][entry.path]) routesByContract[contractFile][entry.path] = [];
  routesByContract[contractFile][entry.path].push(entry.method.toLowerCase());
}

if (!mainDoc.get('paths')) {
    mainDoc.set('paths', {});
}

for (const [contractFile, routesMap] of Object.entries(routesByContract)) {
  const targetPath = path.join(contractsDir, contractFile);

  let targetDoc;
  if (fs.existsSync(targetPath)) {
    targetDoc = yaml.parseDocument(fs.readFileSync(targetPath, 'utf8'));
  } else {
    targetDoc = new yaml.Document({
        openapi: '3.1.0',
        'x-bthwani-owner': 'services/dsh',
        info: { title: 'Generated Fallback', version: '1.0.0' },
        paths: {}
    });
  }

  if (!targetDoc.has('paths')) targetDoc.set('paths', {});

  for (const [routePath, methods] of Object.entries(routesMap)) {
    const ptr = routePath.replace(/\//g, '~1');
    const refStr = `./${contractFile}#/paths/${ptr}`;

    // Add to main openapi
    if (!mainDoc.get('paths').has(routePath)) {
        mainDoc.get('paths').set(routePath, { $ref: refStr });
    }

    // Prepare parameters
    const params = [];
    const parts = routePath.split('/');
    for (const part of parts) {
      if (part.startsWith('{') && part.endsWith('}')) {
        params.push(part.slice(1, -1));
      }
    }

    let pathItem = targetDoc.get('paths').get(routePath);
    if (!pathItem) {
        pathItem = new yaml.YAMLMap();
        targetDoc.get('paths').set(routePath, pathItem);
    }

    if (params.length > 0 && !pathItem.has('parameters')) {
        const paramsSeq = new yaml.YAMLSeq();
        for (const p of params) {
            paramsSeq.add({
                name: p,
                in: 'path',
                required: true,
                schema: { type: 'string' }
            });
        }
        pathItem.set('parameters', paramsSeq);
    }

    for (const method of methods) {
        if (!pathItem.has(method)) {
            const tag = routePath.split('/')[2] || 'misc';
            const opId = `${method}${routePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
            pathItem.set(method, {
                tags: [tag],
                operationId: opId,
                responses: {
                    '200': {
                        description: 'Auto-generated',
                        content: {
                            'application/json': {
                                schema: { type: 'object' }
                            }
                        }
                    }
                },
                security: [{ bearerAuth: [] }]
            });
        }
    }
  }

  fs.writeFileSync(targetPath, String(targetDoc));
}

fs.writeFileSync(dshOpenApiPath, String(mainDoc));

const count = allowlist.entries.length;
allowlist.entries = [];
fs.writeFileSync(allowlistPath, JSON.stringify(allowlist, null, 2));

console.log('Done migrating ' + count + ' routes safely via AST!');
