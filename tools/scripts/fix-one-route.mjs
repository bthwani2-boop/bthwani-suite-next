import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

const repoRoot = process.cwd();
const dshOpenApiPath = path.join(repoRoot, 'services/dsh/contracts/dsh.openapi.yaml');
const runtimeExtPath = path.join(repoRoot, 'services/dsh/contracts/dsh.runtime-extensions.openapi.yaml');

const mainDoc = yaml.parseDocument(fs.readFileSync(dshOpenApiPath, 'utf8'));
const extDoc = yaml.parseDocument(fs.readFileSync(runtimeExtPath, 'utf8'));

const route = '/dsh/operator/stores';
const method = 'post';

if (!extDoc.has('paths')) extDoc.set('paths', {});
let pathItem = extDoc.get('paths').get(route);
if (!pathItem) {
    pathItem = new yaml.YAMLMap();
    extDoc.get('paths').set(route, pathItem);
}

pathItem.set(method, {
    tags: ['operator'],
    operationId: 'post_dsh_operator_stores',
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

// also set GET if needed
if (!pathItem.has('get')) {
    pathItem.set('get', {
        tags: ['operator'],
        operationId: 'get_dsh_operator_stores',
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

const ptr = route.replace(/\//g, '~1');
const refStr = `./dsh.runtime-extensions.openapi.yaml#/paths/${ptr}`;
mainDoc.get('paths').set(route, { $ref: refStr });

fs.writeFileSync(runtimeExtPath, String(extDoc));
fs.writeFileSync(dshOpenApiPath, String(mainDoc));

console.log('Fixed /dsh/operator/stores');
