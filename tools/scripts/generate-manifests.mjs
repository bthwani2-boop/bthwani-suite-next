import fs from 'fs';
import path from 'path';

const dshContracts = 'c:/bthwani-suite-next/services/dsh/contracts';
const wltContracts = 'c:/bthwani-suite-next/services/wlt/contracts';

function generateManifest(dir, entry, bundle) {
    const modules = [];
    
    function walk(current) {
        const files = fs.readdirSync(current);
        for (const file of files) {
            const fullPath = path.join(current, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                if (!fullPath.includes('generated') && !fullPath.includes('fragments')) {
                    walk(fullPath);
                }
            } else if (fullPath.endsWith('.yaml') && file !== entry && file !== 'contract.manifest.yaml') {
                modules.push(path.relative(dir, fullPath).replace(/\\/g, '/'));
            }
        }
    }
    walk(dir);
    
    const manifest = {
        formatVersion: 1,
        bundle: bundle,
        entry: entry,
        modules: modules
    };
    
    fs.writeFileSync(path.join(dir, 'contract.manifest.yaml'), 'bundle: ' + bundle + '\nentry: ' + entry + '\nmodules:\n' + modules.map(m => '  - ' + m).join('\n') + '\n');
}

generateManifest(dshContracts, 'dsh.openapi.yaml', 'generated/dsh.bundle.openapi.yaml');
generateManifest(wltContracts, 'wlt.openapi.yaml', 'generated/wlt.bundle.openapi.yaml');
console.log('Manifests generated');
