const fs = require('fs');
const p = 'services/dsh/contracts/dsh.openapi.yaml';
let c = fs.readFileSync(p, 'utf8');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('$ref: ./')) {
    lines[i] = lines[i].replace(/\$ref:\s*(\.\/[^\s"']+)/, '$ref: "$1"');
  }
}
fs.writeFileSync(p, lines.join('\n'));
