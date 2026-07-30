import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = path.join(__dirname, '..', '..', 'services', 'dsh', 'database', 'seeds', 'local', 'media');
const MANIFEST_PATH = path.join(MEDIA_DIR, 'media-manifest.json');

const STORES = [
  { id: 'store-test-grocery', keyword: 'grocery,store', prefix: 'grocery', nameAr: 'بقالة', nameEn: 'Grocery' },
  { id: 'store-test-restaurant', keyword: 'restaurant,food', prefix: 'restaurant', nameAr: 'مطعم', nameEn: 'Restaurant' },
  { id: 'store-test-pharmacy', keyword: 'pharmacy,medicine', prefix: 'pharmacy', nameAr: 'صيدلية', nameEn: 'Pharmacy' },
  { id: 'store-test-electronics', keyword: 'electronics,gadget', prefix: 'electronics', nameAr: 'إلكترونيات', nameEn: 'Electronics' },
  { id: 'store-test-sweets', keyword: 'sweets,dessert', prefix: 'sweets', nameAr: 'حلويات', nameEn: 'Sweets' },
];

function generateManifestTemplate() {
  const items = [];
  
  for (let i = 0; i < STORES.length; i++) {
    const store = STORES[i];
    
    // Store Logo
    items.push({
      fixtureId: `fixture-logo-${store.id}`,
      entityType: 'store',
      entityLogicalKey: store.id,
      role: 'logo',
      fileName: `${store.id}-logo.jpg`,
      relativeSourcePath: `realistic/${store.id}-logo.jpg`,
      mimeType: 'image/jpeg',
      expectedWidth: 600,
      expectedHeight: 600,
      expectedChecksum: "",
      altAr: `شعار ${store.nameAr}`,
      altEn: `${store.nameEn} Logo`,
      license: 'loremflickr',
      required: true,
      keyword: `${store.keyword},logo`,
      lock: i * 100 + 1
    });

    // Store Hero
    items.push({
      fixtureId: `fixture-hero-${store.id}`,
      entityType: 'store',
      entityLogicalKey: store.id,
      role: 'hero',
      fileName: `${store.id}-hero.jpg`,
      relativeSourcePath: `realistic/${store.id}-hero.jpg`,
      mimeType: 'image/jpeg',
      expectedWidth: 1200,
      expectedHeight: 600,
      expectedChecksum: "",
      altAr: `غلاف ${store.nameAr}`,
      altEn: `${store.nameEn} Cover`,
      license: 'loremflickr',
      required: true,
      keyword: `${store.keyword},shop`,
      lock: i * 100 + 2
    });

    // Category
    items.push({
      fixtureId: `fixture-category-${store.prefix}`,
      entityType: 'category',
      entityLogicalKey: `node-${store.prefix}`,
      role: 'thumbnail',
      fileName: `node-${store.prefix}.jpg`,
      relativeSourcePath: `realistic/node-${store.prefix}.jpg`,
      mimeType: 'image/jpeg',
      expectedWidth: 600,
      expectedHeight: 600,
      expectedChecksum: "",
      altAr: `فئة ${store.nameAr}`,
      altEn: `${store.nameEn} Category`,
      license: 'loremflickr',
      required: true,
      keyword: `${store.keyword}`,
      lock: i * 100 + 3
    });

    // Products (5 per store)
    for (let p = 1; p <= 5; p++) {
      items.push({
        fixtureId: `fixture-product-${store.prefix}-${p}`,
        entityType: 'product',
        entityLogicalKey: `product-${store.prefix}-${p}`,
        role: 'gallery',
        fileName: `product-${store.prefix}-${p}.jpg`,
        relativeSourcePath: `realistic/product-${store.prefix}-${p}.jpg`,
        mimeType: 'image/jpeg',
        expectedWidth: 600,
        expectedHeight: 600,
        expectedChecksum: "",
        altAr: `منتج ${store.nameAr} ${p}`,
        altEn: `${store.nameEn} Product ${p}`,
        license: 'loremflickr',
        required: true,
        keyword: `${store.keyword},product`,
        lock: i * 100 + 10 + p
      });
    }
  }

  return { media: items };
}

async function downloadImage(url, destPath) {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  console.log(`Downloading ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  return buffer;
}

function computeChecksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function main() {
  let manifest;
  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  } else {
    manifest = generateManifestTemplate();
  }

  for (const item of manifest.media) {
    const destPath = path.join(MEDIA_DIR, item.relativeSourcePath);
    let buffer;
    if (fs.existsSync(destPath)) {
      buffer = fs.readFileSync(destPath);
    } else {
      const url = `https://loremflickr.com/${item.expectedWidth}/${item.expectedHeight}/${item.keyword}?lock=${item.lock}`;
      buffer = await downloadImage(url, destPath);
      // Wait a bit to not spam loremflickr
      await new Promise(r => setTimeout(r, 200));
    }
    
    const checksum = computeChecksum(buffer);
    if (item.expectedChecksum !== checksum) {
      item.expectedChecksum = checksum;
    }
  }

  const devProducts = [];
  for (let i = 0; i < STORES.length; i++) {
    const store = STORES[i];
    for (let p = 1; p <= 5; p++) {
      devProducts.push({
        proposedNameAr: `منتج ${store.nameAr} ${p}`,
        proposedNameEn: `${store.nameEn} Product ${p}`,
        domainId: `domain-${store.prefix}`, // Make sure this domain exists or is valid
        categoryNodeId: `node-${store.prefix}`,
        brand: `Brand ${store.nameEn}`,
        sourceSurface: 'app-partner',
        price: 1000 + p * 100,
        imgKey: `realistic/product-${store.prefix}-${p}.jpg`,
        storeId: store.id
      });
    }
  }
  fs.writeFileSync(path.join(__dirname, 'bootstrap-products.json'), JSON.stringify(devProducts, null, 2));

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log('Media generation complete and manifest updated.');
}

main().catch(console.error);
