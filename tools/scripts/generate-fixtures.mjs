import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, '..', '..', 'services', 'dsh', 'database', 'seeds', 'local', 'media', 'fixtures');

const devProducts = [
  { imgKey: 'apple', text: 'Apple' },
  { imgKey: 'banana', text: 'Banana' },
  { imgKey: 'orange', text: 'Orange' },
  { imgKey: 'milk', text: 'Milk' },
  { imgKey: 'bread', text: 'Bread' },
  { imgKey: 'cheese', text: 'Cheese' },
  { imgKey: 'butter', text: 'Butter' },
  { imgKey: 'yogurt', text: 'Yogurt' },
  { imgKey: 'chicken', text: 'Chicken' },
  { imgKey: 'beef', text: 'Beef' },
  { imgKey: 'rice', text: 'Rice' },
  { imgKey: 'pasta', text: 'Pasta' },
  { imgKey: 'cereal', text: 'Cereal' },
  { imgKey: 'coffee', text: 'Coffee' },
  { imgKey: 'tea', text: 'Tea' },
  { imgKey: 'sugar', text: 'Sugar' },
  { imgKey: 'salt', text: 'Salt' },
  { imgKey: 'pepper', text: 'Pepper' },
  { imgKey: 'oil', text: 'Oil' },
  { imgKey: 'water', text: 'Water' },
];

const colors = ['3498db', 'e74c3c', '2ecc71', '9b59b6', 'f1c40f', 'e67e22', '1abc9c', '34495e', '7f8c8d'];

if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

async function main() {
  for (let i = 0; i < devProducts.length; i++) {
    const p = devProducts[i];
    const name = `fixture-product-${p.imgKey}.png`;
    const color = colors[i % colors.length];
    
    console.log(`Downloading ${name}...`);
    try {
      const res = await fetch(`https://dummyimage.com/400x400/${color}/ffffff.png&text=${p.text}`);
      if (!res.ok) {
        console.error(`Failed to download ${name}`);
        continue;
      }
      
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(path.join(fixturesDir, name), buffer);
    } catch (e) {
      console.error(`Error downloading ${name}:`, e);
    }
  }
  
  console.log(`Generated ${devProducts.length} fixtures in ${fixturesDir}`);
}

main();
