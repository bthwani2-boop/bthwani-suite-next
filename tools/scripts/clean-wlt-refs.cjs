const fs = require('fs');
const yaml = require('yaml');
const path = require('path');

const wltDir = 'c:/bthwani-suite-next/services/wlt/contracts';
const files = fs.readdirSync(wltDir).filter(f => f.endsWith('.yaml') && !f.includes('manifest'));

let updated = 0;
for (const f of files) {
  const filePath = path.join(wltDir, f);
  const text = fs.readFileSync(filePath, 'utf8');
  const doc = yaml.parseDocument(text);
  const json = doc.toJSON();
  let modified = false;

  if (json.components) {
    for (const [section, entries] of Object.entries(json.components)) {
      if (entries) {
        for (const [k, v] of Object.entries(entries)) {
          if (v && v.$ref && v.$ref.includes('.yaml')) {
             doc.get('components').get(section).delete(k);
             modified = true;
          }
        }
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, String(doc));
    updated++;
  }
}
console.log(`Cleaned up refs in ${updated} WLT contracts.`);
