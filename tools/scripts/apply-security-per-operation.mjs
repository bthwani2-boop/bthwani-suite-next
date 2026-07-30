import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.openapi.yaml') && !file.includes('shared')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(path.join(root, 'contracts'))
    .concat(walk(path.join(root, 'core')))
    .concat(walk(path.join(root, 'services')));

let modifiedCount = 0;

for (const file of files) {
    // Skip generated files
    if (file.includes('generated')) continue;

    const content = fs.readFileSync(file, 'utf8');
    const doc = yaml.parseDocument(content);
    const json = doc.toJSON();
    
    if (!json.paths) continue;

    let modified = false;

    // Check top-level security
    const topSecurity = json.security;
    if (topSecurity) {
        doc.delete('security');
        modified = true;
    }

    const paths = doc.get('paths');
    if (!paths || !paths.items) continue;

    for (const pathItem of paths.items) {
        if (!pathItem.value || !pathItem.value.items) continue;
        for (const methodItem of pathItem.value.items) {
            const methodStr = methodItem.key.value;
            if (!['get', 'post', 'put', 'delete', 'patch'].includes(methodStr)) continue;
            
            const operation = methodItem.value;
            if (!operation.has('security')) {
                const secValue = topSecurity ? topSecurity : [{ bearerAuth: [] }];
                operation.set('security', secValue);
                modified = true;
            }
        }
    }

    if (modified) {
        fs.writeFileSync(file, String(doc));
        modifiedCount++;
    }
}

console.log(`Updated security in ${modifiedCount} files.`);
