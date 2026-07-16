const fs = require('fs');

const path = 'services/dsh/contracts/dsh.openapi.yaml';
let content = fs.readFileSync(path, 'utf8');

// Fix the formatting error:
content = content.replace(/version: \{ type: integer \}id: \{ type: string \}/g, 'version: { type: integer }\n        id: { type: string }');

fs.writeFileSync(path, content);
console.log('Fixed formatting.');
