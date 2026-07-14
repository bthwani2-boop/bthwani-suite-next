import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DSH_API_BASE = 'http://localhost:58080';
const IDENTITY_API_BASE = 'http://localhost:58082';

async function getToken(username, password = '123456') {
  const res = await fetch(`${IDENTITY_API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, deviceFingerprint: 'bootstrap' }),
  });
  if (!res.ok) throw new Error(`Login failed for ${username}: ${await res.text()}`);
  return (await res.json()).accessToken;
}

async function proposeProduct(token, product) {
  const res = await fetch(`${DSH_API_BASE}/dsh/partner/catalog/product-proposals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(product),
  });
  if (!res.ok) throw new Error(`Failed to propose product: ${await res.text()}`);
  return (await res.json()).proposal;
}

async function transitionProposal(token, proposalId, nextStatus) {
  const res = await fetch(`${DSH_API_BASE}/dsh/operator/catalog/product-proposals/${proposalId}/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ nextStatus, note: 'Dev bootstrap transition' }),
  });
  if (!res.ok) throw new Error(`Failed to transition to ${nextStatus}: ${await res.text()}`);
  return (await res.json()).proposal;
}

async function setStoreAssortment(token, storeId, masterProductId, unitPrice) {
  const res = await fetch(`${DSH_API_BASE}/dsh/operator/stores/${storeId}/assortment/${masterProductId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      unitPrice,
      currency: 'YER',
      available: true,
      stockStatus: 'in_stock',
      publicationStatus: 'client_visible'
    }),
  });
  if (!res.ok) throw new Error(`Failed to set assortment: ${await res.text()}`);
}

const devProducts = [
  { proposedNameAr: 'تفاح', proposedNameEn: 'Apple', domainId: 'domain-groceries', categoryNodeId: 'node-local-vegetables', brand: 'محلي', sourceSurface: 'app-partner', price: 500, imgKey: 'apple' },
  { proposedNameAr: 'موز', proposedNameEn: 'Banana', domainId: 'domain-groceries', categoryNodeId: 'node-imported-fruits', brand: 'مستورد', sourceSurface: 'app-partner', price: 600, imgKey: 'banana' },
  { proposedNameAr: 'برتقال', proposedNameEn: 'Orange', domainId: 'domain-groceries', categoryNodeId: 'node-local-vegetables', brand: 'محلي', sourceSurface: 'app-partner', price: 400, imgKey: 'orange' },
  { proposedNameAr: 'حليب', proposedNameEn: 'Milk', domainId: 'domain-groceries', categoryNodeId: 'node-dairy-cheese', brand: 'المراعي', sourceSurface: 'app-partner', price: 1000, imgKey: 'milk' },
  { proposedNameAr: 'خبز', proposedNameEn: 'Bread', domainId: 'domain-groceries', categoryNodeId: 'node-bakeries', brand: 'مخبز', sourceSurface: 'app-partner', price: 200, imgKey: 'bread' },
  { proposedNameAr: 'جبنة كرافت شيدر', proposedNameEn: 'Kraft Cheddar Cheese', domainId: 'domain-groceries', categoryNodeId: 'node-dairy-cheese', brand: 'كرافت', sourceSurface: 'app-partner', price: 1200, imgKey: 'cheese' },
  { proposedNameAr: 'زبدة', proposedNameEn: 'Butter', domainId: 'domain-groceries', categoryNodeId: 'node-dairy-cheese', brand: 'لورباك', sourceSurface: 'app-partner', price: 1500, imgKey: 'butter' },
  { proposedNameAr: 'زبادي', proposedNameEn: 'Yogurt', domainId: 'domain-groceries', categoryNodeId: 'node-dairy-cheese', brand: 'المراعي', sourceSurface: 'app-partner', price: 300, imgKey: 'yogurt' },
  { proposedNameAr: 'دجاج', proposedNameEn: 'Chicken', domainId: 'domain-groceries', categoryNodeId: 'node-canned-food', brand: 'الوطنية', sourceSurface: 'app-partner', price: 1800, imgKey: 'chicken' },
  { proposedNameAr: 'لحم بقري', proposedNameEn: 'Beef', domainId: 'domain-groceries', categoryNodeId: 'node-canned-food', brand: 'محلي', sourceSurface: 'app-partner', price: 4000, imgKey: 'beef' },
  { proposedNameAr: 'أرز', proposedNameEn: 'Rice', domainId: 'domain-groceries', categoryNodeId: 'node-canned-food', brand: 'الوليمة', sourceSurface: 'app-partner', price: 3500, imgKey: 'rice' },
  { proposedNameAr: 'معكرونة', proposedNameEn: 'Pasta', domainId: 'domain-groceries', categoryNodeId: 'node-canned-food', brand: 'قودي', sourceSurface: 'app-partner', price: 450, imgKey: 'pasta' },
  { proposedNameAr: 'حبوب', proposedNameEn: 'Cereal', domainId: 'domain-groceries', categoryNodeId: 'node-supermarket', brand: 'كيلوجز', sourceSurface: 'app-partner', price: 2200, imgKey: 'cereal' },
  { proposedNameAr: 'قهوة', proposedNameEn: 'Coffee', domainId: 'domain-groceries', categoryNodeId: 'node-canned-food', brand: 'نسكافيه', sourceSurface: 'app-partner', price: 3000, imgKey: 'coffee' },
  { proposedNameAr: 'شاي', proposedNameEn: 'Tea', domainId: 'domain-groceries', categoryNodeId: 'node-canned-food', brand: 'ليبتون', sourceSurface: 'app-partner', price: 1200, imgKey: 'tea' },
  { proposedNameAr: 'سكر', proposedNameEn: 'Sugar', domainId: 'domain-groceries', categoryNodeId: 'node-canned-food', brand: 'الأسرة', sourceSurface: 'app-partner', price: 500, imgKey: 'sugar' },
  { proposedNameAr: 'ملح', proposedNameEn: 'Salt', domainId: 'domain-groceries', categoryNodeId: 'node-canned-food', brand: 'ساسو', sourceSurface: 'app-partner', price: 150, imgKey: 'salt' },
  { proposedNameAr: 'فلفل', proposedNameEn: 'Pepper', domainId: 'domain-groceries', categoryNodeId: 'node-canned-food', brand: 'اسناد', sourceSurface: 'app-partner', price: 400, imgKey: 'pepper' },
  { proposedNameAr: 'زيت', proposedNameEn: 'Oil', domainId: 'domain-groceries', categoryNodeId: 'node-canned-food', brand: 'عافية', sourceSurface: 'app-partner', price: 2500, imgKey: 'oil' },
  { proposedNameAr: 'ماء', proposedNameEn: 'Water', domainId: 'domain-groceries', categoryNodeId: 'node-canned-food', brand: 'نوفا', sourceSurface: 'app-partner', price: 100, imgKey: 'water' },
];

async function uploadAsset(token, filePath, altAr, altEn, intendedEntityType, intendedEntityId, intendedRole) {
  const fileStats = fs.statSync(filePath);
  const fileName = path.basename(filePath);
  
  // 1. Create intent
  const intentRes = await fetch(`${DSH_API_BASE}/dsh/operator/catalog/assets/upload-intents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      fileName,
      mimeType: 'image/png',
      sizeBytes: fileStats.size,
      altAr,
      altEn,
      intendedEntityType,
      intendedEntityId,
      intendedRole
    }),
  });
  if (!intentRes.ok) throw new Error(`Intent failed: ${await intentRes.text()}`);
  const intentData = await intentRes.json();
  const assetId = intentData.asset.id;
  
  // 2. PUT file
  const fileBuffer = fs.readFileSync(filePath);
  const putRes = await fetch(intentData.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': fileStats.size
    },
    body: fileBuffer
  });
  if (!putRes.ok) throw new Error(`PUT failed: ${await putRes.text()}`);
  
  // 3. Complete
  const completeRes = await fetch(`${DSH_API_BASE}/dsh/operator/catalog/assets/${assetId}/complete`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!completeRes.ok) throw new Error(`Complete failed: ${await completeRes.text()}`);
  
  // 4. Review
  let reviewRes = await fetch(`${DSH_API_BASE}/dsh/operator/catalog/assets/${assetId}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ decision: 'pending_review', reviewNote: 'Dev Bootstrap (submit)' })
  });
  if (!reviewRes.ok) throw new Error(`Submit failed: ${await reviewRes.text()}`);

  reviewRes = await fetch(`${DSH_API_BASE}/dsh/operator/catalog/assets/${assetId}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ decision: 'approved', reviewNote: 'Dev Bootstrap' })
  });
  if (!reviewRes.ok) throw new Error(`Approve failed: ${await reviewRes.text()}`);
  
  return assetId;
}

async function main() {
  try {
    const partnerToken = await getToken('bthwani');
    const operatorToken = await getToken('operator');
    
    for (const p of devProducts) {
      const { price, imgKey, ...proposalPayload } = p;
      const proposal = await proposeProduct(partnerToken, proposalPayload);
      console.log(`Transitioning ${proposal.id}...`);
      await transitionProposal(operatorToken, proposal.id, 'partner-review');
      await transitionProposal(operatorToken, proposal.id, 'marketing-review');
      const adopted = await transitionProposal(operatorToken, proposal.id, 'catalog-adopted');
      await transitionProposal(operatorToken, proposal.id, 'catalog-approved');
      
      const fixturePath = path.join(__dirname, '..', '..', 'services', 'dsh', 'database', 'seeds', 'local', 'media', 'fixtures', `fixture-product-${imgKey}.png`);
      
      if (fs.existsSync(fixturePath)) {
        console.log(`Uploading asset for ${adopted.adoptedMasterProductId}...`);
        await uploadAsset(
          operatorToken,
          fixturePath,
          p.proposedNameAr,
          p.proposedNameEn,
          'master_product',
          adopted.adoptedMasterProductId,
          'canonical_product_image'
        );
      } else {
        console.warn(`Fixture ${fixturePath} missing. Skipping image upload.`);
      }

      console.log(`Setting assortment for store-test-grocery...`);
      await setStoreAssortment(operatorToken, 'store-test-grocery', adopted.adoptedMasterProductId, p.price);
      
      console.log(`Making ${adopted.adoptedMasterProductId} client-visible...`);
      await transitionProposal(operatorToken, proposal.id, 'client-visible');
    }
    
    console.log('Dev bootstrap complete.');
  } catch (err) {
    console.error('Error during bootstrap:', err);
    process.exit(1);
  }
}

main();
