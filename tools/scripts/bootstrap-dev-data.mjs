import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DSH_API_BASE = process.env.DSH_API_BASE || 'http://localhost:58080';
const IDENTITY_API_BASE = process.env.IDENTITY_API_BASE || 'http://localhost:58082';

// Enforce non-production safety.
if (process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'production') {
  console.error('CRITICAL ERROR: Bootstrap script cannot be run in production.');
  process.exit(1);
}

function stableToken(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 24);
}

function mutationHeaders(token, operation, identity) {
  const stableIdentity = stableToken(`${operation}:${identity}`);
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'Idempotency-Key': `bootstrap-${operation}-${stableIdentity}`,
    'X-Correlation-ID': `bootstrap-${operation}-${stableIdentity}`,
  };
}

async function responseError(operation, res) {
  const body = await res.text();
  return new Error(`${operation} failed HTTP ${res.status}: ${body}`);
}

async function getToken(username, password = '123456') {
  const res = await fetch(`${IDENTITY_API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, deviceFingerprint: `bootstrap-${username}` }),
  });
  if (!res.ok) throw await responseError(`login:${username}`, res);
  return (await res.json()).accessToken;
}

async function listOperatorProposals(token) {
  const res = await fetch(`${DSH_API_BASE}/dsh/operator/catalog/product-proposals?limit=200`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await responseError('catalog:list-proposals', res);
  return (await res.json()).proposals;
}

async function proposeProduct(token, product) {
  const identity = product.proposedNameEn || product.proposedNameAr || JSON.stringify(product);
  const res = await fetch(`${DSH_API_BASE}/dsh/partner/catalog/product-proposals`, {
    method: 'POST',
    headers: mutationHeaders(token, 'catalog-propose', identity),
    body: JSON.stringify(product),
  });
  if (!res.ok) throw await responseError(`catalog:propose:${identity}`, res);
  return (await res.json()).proposal;
}

async function transitionProposal(token, proposalId, nextStatus) {
  const res = await fetch(`${DSH_API_BASE}/dsh/operator/catalog/product-proposals/${proposalId}/transition`, {
    method: 'POST',
    headers: mutationHeaders(token, 'catalog-transition', `${proposalId}:${nextStatus}`),
    body: JSON.stringify({ nextStatus, note: 'Dev bootstrap transition' }),
  });
  if (!res.ok) throw await responseError(`catalog:transition:${proposalId}:${nextStatus}`, res);
  return (await res.json()).proposal;
}

async function setStoreAssortment(token, storeId, masterProductId, unitPrice) {
  const res = await fetch(`${DSH_API_BASE}/dsh/operator/stores/${storeId}/assortment/${masterProductId}`, {
    method: 'PUT',
    headers: mutationHeaders(token, 'catalog-assortment', `${storeId}:${masterProductId}`),
    body: JSON.stringify({
      unitPrice,
      currency: 'YER',
      available: true,
      stockStatus: 'in_stock',
      publicationStatus: 'client_visible',
    }),
  });
  if (!res.ok) throw await responseError(`catalog:assortment:${storeId}:${masterProductId}`, res);
}

async function reviewAsset(token, assetId, decision, reviewNote) {
  const res = await fetch(`${DSH_API_BASE}/dsh/operator/catalog/assets/${assetId}/review`, {
    method: 'POST',
    headers: mutationHeaders(token, 'catalog-asset-review', `${assetId}:${decision}`),
    body: JSON.stringify({ decision, reviewNote }),
  });
  if (!res.ok) throw await responseError(`catalog:asset-review:${assetId}:${decision}`, res);
}

async function uploadAsset(token, filePath, altAr, altEn, intendedEntityType, intendedEntityId, intendedRole) {
  const fileStats = fs.statSync(filePath);
  const fileName = path.basename(filePath);
  const assetIdentity = `${intendedEntityType}:${intendedEntityId}:${intendedRole}:${fileName}`;

  const intentRes = await fetch(`${DSH_API_BASE}/dsh/operator/catalog/assets/upload-intents`, {
    method: 'POST',
    headers: mutationHeaders(token, 'catalog-asset-intent', assetIdentity),
    body: JSON.stringify({
      fileName,
      mimeType: 'image/png',
      sizeBytes: fileStats.size,
      altAr,
      altEn,
      intendedEntityType,
      intendedEntityId,
      intendedRole,
    }),
  });
  if (!intentRes.ok) throw await responseError(`catalog:asset-intent:${assetIdentity}`, intentRes);
  const intentData = await intentRes.json();
  const assetId = intentData.asset.id;

  const fileBuffer = fs.readFileSync(filePath);
  const putRes = await fetch(intentData.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': fileStats.size.toString(),
    },
    body: fileBuffer,
  });
  if (!putRes.ok) throw await responseError(`catalog:asset-put:${assetId}`, putRes);

  const completeRes = await fetch(`${DSH_API_BASE}/dsh/operator/catalog/assets/${assetId}/complete`, {
    method: 'POST',
    headers: mutationHeaders(token, 'catalog-asset-complete', assetId),
  });
  if (!completeRes.ok) throw await responseError(`catalog:asset-complete:${assetId}`, completeRes);

  await reviewAsset(token, assetId, 'pending_review', 'Dev Bootstrap (submit)');
  await reviewAsset(token, assetId, 'approved', 'Dev Bootstrap');
  return assetId;
}

async function main() {
  try {
    const partnerToken = await getToken('bthwani');
    const operatorToken = await getToken('operator');

    const devProductsPath = path.join(__dirname, 'bootstrap-products.json');
    if (!fs.existsSync(devProductsPath)) {
      throw new Error(`Products file missing: ${devProductsPath}. Run generate-realistic-images.mjs first.`);
    }
    const devProducts = JSON.parse(fs.readFileSync(devProductsPath, 'utf-8'));

    const existingProposalsList = await listOperatorProposals(operatorToken);
    const existingMap = new Map(existingProposalsList.map((proposal) => [proposal.proposedNameEn, proposal]));

    for (const product of devProducts) {
      if (existingMap.has(product.proposedNameEn)) {
        console.log(`Product ${product.proposedNameEn} already exists, skipping.`);
        continue;
      }

      const { price, imgKey, storeId, ...proposalPayload } = product;
      const proposal = await proposeProduct(partnerToken, proposalPayload);
      console.log(`Transitioning ${proposal.id} (${product.proposedNameEn})...`);
      await transitionProposal(operatorToken, proposal.id, 'partner-review');
      await transitionProposal(operatorToken, proposal.id, 'marketing-review');
      const adopted = await transitionProposal(operatorToken, proposal.id, 'catalog-adopted');
      await transitionProposal(operatorToken, proposal.id, 'catalog-approved');

      const fixturePath = path.join(
        __dirname,
        '..',
        '..',
        'services',
        'dsh',
        'database',
        'seeds',
        'local',
        'media',
        imgKey,
      );

      if (!fs.existsSync(fixturePath)) {
        throw new Error(`CRITICAL: Fixture ${fixturePath} missing. Bootstrap requires realistic images and cannot proceed.`);
      }

      console.log(`Uploading asset for ${adopted.adoptedMasterProductId}...`);
      await uploadAsset(
        operatorToken,
        fixturePath,
        product.proposedNameAr,
        product.proposedNameEn,
        'master_product',
        adopted.adoptedMasterProductId,
        'canonical_product_image',
      );

      console.log(`Setting assortment for ${storeId}...`);
      await setStoreAssortment(operatorToken, storeId, adopted.adoptedMasterProductId, price);

      console.log(`Making ${adopted.adoptedMasterProductId} client-visible...`);
      await transitionProposal(operatorToken, proposal.id, 'client-visible');
    }

    console.log('Dev bootstrap complete.');
  } catch (error) {
    console.error('Error during bootstrap:', error);
    process.exit(1);
  }
}

main();
