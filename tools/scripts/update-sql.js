const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../../services/dsh/database/seeds/local/media/media-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function getMediaData(filename) {
  const item = manifest.media.find(m => m.fileName === filename);
  if (!item) {
    // If exact name is missing, but maybe it's realistic/x
    const itemByPath = manifest.media.find(m => m.relativeSourcePath === filename || m.relativeSourcePath === 'realistic/' + filename);
    if (itemByPath) return { path: itemByPath.relativeSourcePath, size: 15000, checksum: itemByPath.expectedChecksum };
    throw new Error('Missing ' + filename);
  }
  return { path: item.relativeSourcePath, size: 15000, checksum: item.expectedChecksum };
}

const map = {
  'node-dairy-cheese.png': 'node-grocery.jpg',
  'node-canned-food.png': 'node-grocery.jpg',
  'node-local-vegetables.png': 'node-grocery.jpg',
  'node-imported-fruits.png': 'node-grocery.jpg',
  'node-sweets-cake.png': 'node-sweets.jpg',
  'node-sweets-chocolate.png': 'node-sweets.jpg',
  'node-phones-tablets.png': 'node-electronics.jpg',
  'node-smartphones.png': 'node-electronics.jpg',
  'node-android-phones.png': 'node-electronics.jpg',
  'node-ios-phones.png': 'node-electronics.jpg',
  'node-medications.png': 'node-pharmacy.jpg',
  'node-baby-care.png': 'node-pharmacy.jpg',
  'node-pain-relief.png': 'node-pharmacy.jpg',
  'node-baby-milk.png': 'node-pharmacy.jpg',
  'node-headache-migraine.png': 'node-pharmacy.jpg',
  'node-infant-formula.png': 'node-pharmacy.jpg'
};

const sqlPath = path.join(__dirname, '../../services/dsh/database/seeds/local/dsh-032_central_catalog_seed.local.sql');
let sql = fs.readFileSync(sqlPath, 'utf8');

for (const [oldName, newName] of Object.entries(map)) {
  const media = getMediaData(newName);
  
  // ('asset-node-dairy-cheese',       'node-dairy-cheese.png',       NULL, 'node-dairy-cheese.png',       'image/png', 135, 64, 64, '...', 'ألبان وأجبان',        'Dairy & Cheese',       '#ffffff', 'approved', 'system', 'system-seed'),
  // We need to replace the first part up to the checksum.
  // Regex to match from ('asset-xxx', to the checksum string.
  
  const regexStr = "\\('asset-[a-zA-Z0-9-]+',\\s*'" + oldName + "',\\s*NULL,\\s*'" + oldName + "',\\s*'image/png',\\s*\\d+,\\s*64,\\s*64,\\s*'[^']+',";
  const regex = new RegExp(regexStr);
  
  const match = sql.match(regex);
  if (match) {
    const assetIdMatch = match[0].match(/'asset-[^']+'/);
    if (assetIdMatch) {
       const assetId = assetIdMatch[0];
       const replacement = `(${assetId}, '${media.path}', NULL, '${media.path}', 'image/jpeg', ${media.size}, 600, 600, '${media.checksum}',`;
       sql = sql.replace(regex, replacement);
    }
  } else {
    console.warn("Could not find match for", oldName);
  }
}

fs.writeFileSync(sqlPath, sql);
console.log('Updated dsh-032_central_catalog_seed.local.sql successfully');
