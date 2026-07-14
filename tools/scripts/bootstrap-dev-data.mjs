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

const mockProducts = [
  {
    proposedNameAr: 'جبنة كرافت شيدر',
    proposedNameEn: 'Kraft Cheddar Cheese',
    domainId: 'domain-groceries',
    categoryNodeId: 'node-dairy-cheese',
    brand: 'كرافت',
    sourceSurface: 'app-partner',
    price: 1200
  },
  {
    proposedNameAr: 'فاصوليا معلبة',
    proposedNameEn: 'Canned Beans',
    domainId: 'domain-groceries',
    categoryNodeId: 'node-canned-food',
    brand: 'لونا',
    sourceSurface: 'app-partner',
    price: 850
  },
  {
    proposedNameAr: 'طماطم محلي',
    proposedNameEn: 'Local Tomatoes',
    domainId: 'domain-groceries',
    categoryNodeId: 'node-local-vegetables',
    brand: 'محلي',
    sourceSurface: 'app-partner',
    price: 1200
  }
];

async function main() {
  try {
    const partnerToken = await getToken('bthwani');
    const operatorToken = await getToken('operator');
    
    for (const p of mockProducts) {
      const { price, ...proposalPayload } = p;
      const proposal = await proposeProduct(partnerToken, proposalPayload);
      console.log(`Transitioning ${proposal.id}...`);
      await transitionProposal(operatorToken, proposal.id, 'partner-review');
      await transitionProposal(operatorToken, proposal.id, 'marketing-review');
      const adopted = await transitionProposal(operatorToken, proposal.id, 'catalog-adopted');
      await transitionProposal(operatorToken, proposal.id, 'catalog-approved');
      
      console.log(`Setting assortment for store-test-grocery...`);
      await setStoreAssortment(operatorToken, 'store-test-grocery', adopted.adoptedMasterProductId, p.price);
      
      console.log(`Making ${adopted.adoptedMasterProductId} client-visible...`);
      await transitionProposal(operatorToken, proposal.id, 'client-visible');
      
      try {
        const { execSync } = await import('node:child_process');
        let imgKey = '';
        if (p.proposedNameEn.includes('Cheese')) imgKey = 'product-cheese-kraft.png';
        if (p.proposedNameEn.includes('Beans')) imgKey = 'node-canned-food.png';
        if (p.proposedNameEn.includes('Tomatoes')) imgKey = 'node-local-vegetables.png';
        
        if (imgKey) {
          console.log(`Injecting image ${imgKey} for ${adopted.adoptedMasterProductId}...`);
          const assetId = 'asset-' + adopted.adoptedMasterProductId;
          const linkId = 'link-' + adopted.adoptedMasterProductId;
          const sql = `
            INSERT INTO dsh_catalog_assets (id, object_key, original_file_name, mime_type, size_bytes, width, height, checksum_sha256, alt_ar, alt_en, dominant_color, status, source_surface, uploaded_by) 
            VALUES ('${assetId}', '${imgKey}', '${imgKey}', 'image/png', 100, 64, 64, 'hash', '${p.proposedNameAr}', '${p.proposedNameEn}', '#ffffff', 'approved', 'system', 'system-seed') ON CONFLICT DO NOTHING;
            INSERT INTO dsh_catalog_asset_links (id, asset_id, entity_type, entity_id, role, sort_order, is_primary, status)
            VALUES ('${linkId}', '${assetId}', 'master_product', '${adopted.adoptedMasterProductId}', 'canonical_product_image', 1, true, 'approved') ON CONFLICT DO NOTHING;
          `;
          execSync(`docker exec bthwani-postgres-runtime psql -U postgres -d bthwani -c "${sql}"`);
        }
      } catch (e) {
        console.error('Failed to inject image', e);
      }
    }
    
    console.log('Dev bootstrap complete.');
  } catch (err) {
    console.error('Error during bootstrap:', err);
    process.exit(1);
  }
}

main();
