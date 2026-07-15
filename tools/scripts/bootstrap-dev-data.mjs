import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DSH_API_BASE = process.env.DSH_API_BASE || 'http://localhost:58080';
const IDENTITY_API_BASE = process.env.IDENTITY_API_BASE || 'http://localhost:58082';

// Enforce non-production safety
if (process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'production') {
  console.error("CRITICAL ERROR: Bootstrap script cannot be run in production.");
  process.exit(1);
}

async function getToken(username, password = '123456') {
  const res = await fetch(`${IDENTITY_API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, deviceFingerprint: 'bootstrap' }),
  });
  if (!res.ok) throw new Error(`Login failed for ${username}: ${await res.text()}`);
  return (await res.json()).accessToken;
}

async function listOperatorProposals(token) {
  const res = await fetch(`${DSH_API_BASE}/dsh/operator/catalog/product-proposals?limit=200`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Failed to list proposals: ${await res.text()}`);
  return (await res.json()).proposals;
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

async function uploadAsset(token, filePath, altAr, altEn, intendedEntityType, intendedEntityId, intendedRole) {
  const fileStats = fs.statSync(filePath);
  const fileName = path.basename(filePath);
  
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
  
  const fileBuffer = fs.readFileSync(filePath);
  const putRes = await fetch(intentData.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': fileStats.size.toString()
    },
    body: fileBuffer
  });
  if (!putRes.ok) throw new Error(`PUT failed: ${await putRes.text()}`);
  
  const completeRes = await fetch(`${DSH_API_BASE}/dsh/operator/catalog/assets/${assetId}/complete`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!completeRes.ok) throw new Error(`Complete failed: ${await completeRes.text()}`);
  
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
    
    // Load generated dev products
    const devProductsPath = path.join(__dirname, 'bootstrap-products.json');
    if (!fs.existsSync(devProductsPath)) {
      throw new Error(`Products file missing: ${devProductsPath}. Run generate-realistic-images.mjs first.`);
    }
    const devProducts = JSON.parse(fs.readFileSync(devProductsPath, 'utf-8'));

    // Check existing proposals to ensure idempotency
    const existingProposalsList = await listOperatorProposals(operatorToken);
    const existingMap = new Map(existingProposalsList.map(p => [p.proposedNameEn, p]));

    for (const p of devProducts) {
      if (existingMap.has(p.proposedNameEn)) {
        console.log(`Product ${p.proposedNameEn} already exists, skipping.`);
        continue;
      }

      const { price, imgKey, storeId, ...proposalPayload } = p;
      const proposal = await proposeProduct(partnerToken, proposalPayload);
      console.log(`Transitioning ${proposal.id} (${p.proposedNameEn})...`);
      await transitionProposal(operatorToken, proposal.id, 'partner-review');
      await transitionProposal(operatorToken, proposal.id, 'marketing-review');
      const adopted = await transitionProposal(operatorToken, proposal.id, 'catalog-adopted');
      await transitionProposal(operatorToken, proposal.id, 'catalog-approved');
      
      const fixturePath = path.join(__dirname, '..', '..', 'services', 'dsh', 'database', 'seeds', 'local', 'media', imgKey);
      
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
        throw new Error(`CRITICAL: Fixture ${fixturePath} missing. Bootstrap requires realistic images and cannot proceed.`);
      }

      console.log(`Setting assortment for ${storeId}...`);
      await setStoreAssortment(operatorToken, storeId, adopted.adoptedMasterProductId, price);
      
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
