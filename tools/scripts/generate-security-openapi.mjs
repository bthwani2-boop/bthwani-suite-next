import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');

const vocabPath = path.join(root, 'governance', 'contracts', 'scope-vocabulary.json');
const vocab = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));

const scopes = {};
for (const family of vocab.families) {
    for (const scopeObj of family.scopes) {
        scopes[scopeObj.scope] = `Scope from ${family.family} domain: ${scopeObj.domain}`;
    }
}

const yaml = `openapi: 3.0.3
info:
  title: BThwani Security Schemes
  version: 1.0.0
  contact:
    name: Platform Engineering
    email: platform@bthwani.com

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      description: |
        Standard operator JWT bearer token.
        Required scopes are defined in the x-bthwani-scopes enum.
    serviceBearer:
      type: http
      scheme: bearer
      description: Internal service-to-service communication token.

  x-bthwani-scopes:
    type: string
    enum:
${Object.keys(scopes).sort().map(s => `      - ${s}`).join('\n')}
`;

const outDir = path.join(root, 'contracts', 'shared');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}
const outPath = path.join(outDir, 'security.openapi.yaml');
fs.writeFileSync(outPath, yaml);
console.log('Created contracts/shared/security.openapi.yaml');
