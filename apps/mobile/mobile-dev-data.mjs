import { createHash } from 'node:crypto';
import { LOCAL_ACTORS, localPassword } from '../../tools/dev/local-actors.mjs';

const MODE = process.argv.includes('--repair') ? 'repair' : 'check';
const DSH_API_BASE = process.env.DSH_API_BASE || 'http://127.0.0.1:58080';
const IDENTITY_API_BASE = process.env.IDENTITY_API_BASE || 'http://127.0.0.1:58082';
const WORKFORCE_API_BASE = process.env.WORKFORCE_API_BASE || 'http://127.0.0.1:58086';
const LOCAL_PASSWORD = localPassword();

class HttpError extends Error {
  constructor(operation, status, body) {
    super(`${operation} failed with HTTP ${status}: ${body}`);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

function stableToken(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 24);
}

function mutationHeaders(token, operation, payload) {
  const identity = stableToken(`${operation}:${JSON.stringify(payload)}`);
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': `mobile-dev-${operation}-${identity}`,
    'X-Correlation-ID': `mobile-dev-${operation}-${identity}`,
  };
}

async function requestJson(operation, url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    if (options.body) console.error(`Payload failed: ${options.body}`);
    throw new HttpError(operation, response.status, text);
  }
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${operation} returned invalid JSON`);
  }
}

async function getToken(username) {
  const body = {
    username,
    password: LOCAL_PASSWORD,
    deviceFingerprint: `mobile-dev-${username}`,
  };
  const result = await requestJson(`identity:login:${username}`, `${IDENTITY_API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!result?.accessToken) throw new Error(`identity:login:${username} returned no access token`);
  return result.accessToken;
}

function authorization(token) {
  return { Authorization: `Bearer ${token}` };
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

async function collectClientStorefrontFailures() {
  const failures = [];
  try {
    const home = await requestJson('dsh:home-discovery', `${DSH_API_BASE}/dsh/home-discovery?limit=50`);
    const stores = list(home?.stores);
    if (stores.length === 0) failures.push('app-client: no client-visible stores');
    if (list(home?.categories).length === 0) failures.push('app-client: no discovery categories');

    for (const store of stores) {
      const storeId = typeof store?.id === 'string' ? store.id.trim() : '';
      if (!storeId) {
        failures.push('app-client: home discovery returned a store without an id');
        continue;
      }

      const encodedStoreId = encodeURIComponent(storeId);
      try {
        const detail = await requestJson(
          `dsh:store-detail:${storeId}`,
          `${DSH_API_BASE}/dsh/stores/${encodedStoreId}`,
        );
        if (detail?.store?.id !== storeId) {
          failures.push(`app-client: store detail mismatch for ${storeId}`);
        }
      } catch (error) {
        failures.push(`app-client: storefront ${storeId} detail failed: ${error.message}`);
        continue;
      }

      try {
        const catalog = await requestJson(
          `dsh:store-catalog:${storeId}`,
          `${DSH_API_BASE}/dsh/stores/${encodedStoreId}/catalog`,
        );
        if (list(catalog?.products).length === 0) {
          failures.push(`app-client: storefront ${storeId} has no client-visible products`);
        }
      } catch (error) {
        failures.push(`app-client: storefront ${storeId} catalog failed: ${error.message}`);
      }
    }
  } catch (error) {
    failures.push(`app-client: ${error.message}`);
  }
  return failures;
}

async function collectReadinessFailures() {
  const failures = await collectClientStorefrontFailures();

  try {
    const partnerToken = await getToken(LOCAL_ACTORS.partner.username);
    const scopes = await requestJson('dsh:partner-scopes', `${DSH_API_BASE}/dsh/partner/scopes`, {
      headers: authorization(partnerToken),
    });
    if (list(scopes?.scopes).length === 0) failures.push('app-partner: no governed store scopes');
  } catch (error) {
    failures.push(`app-partner: ${error.message}`);
  }

  for (const role of ['field', 'captain']) {
    try {
      const actor = LOCAL_ACTORS[role];
      const token = await getToken(actor.username);
      const me = await requestJson(`workforce:${role}:me`, `${WORKFORCE_API_BASE}/workforce/me`, {
        headers: authorization(token),
      });
      if (me?.actorId !== actor.actorId) failures.push(`app-${role}: unexpected Workforce actor binding`);
      if (me?.workforceKind !== role) failures.push(`app-${role}: unexpected Workforce kind`);
      if (me?.profileComplete !== true) failures.push(`app-${role}: Workforce self profile is incomplete`);
      if (me?.engagementStatus !== 'active') failures.push(`app-${role}: Workforce engagement is not active`);
    } catch (error) {
      failures.push(`app-${role}: ${error.message}`);
    }
  }

  return failures;
}

async function ensureActiveZone(operatorToken) {
  const result = await requestJson('dsh:list-zones', `${DSH_API_BASE}/dsh/operator/platform/zones?includeInactive=true`, {
    headers: authorization(operatorToken),
  });
  const active = list(result?.zones).find((zone) => zone?.isActive === true);
  if (active) return active;

  const payload = {
    name: 'منطقة صنعاء المحلية',
    cityCode: 'sana',
    description: 'Local governed mobile development zone',
    reason: 'Provision governed local mobile development data',
  };
  const created = await requestJson('dsh:create-zone', `${DSH_API_BASE}/dsh/operator/platform/zones`, {
    method: 'POST',
    headers: mutationHeaders(operatorToken, 'zone-create', payload),
    body: JSON.stringify(payload),
  });
  if (!created?.zone?.id) throw new Error('dsh:create-zone returned no zone');
  return created.zone;
}

async function createOrAttachProvider(operatorToken, kind, payload) {
  const endpoint = kind === 'field' ? 'field-agents' : 'captains';
  try {
    return await requestJson(`workforce:create-${kind}`, `${WORKFORCE_API_BASE}/workforce/${endpoint}`, {
      method: 'POST',
      headers: mutationHeaders(operatorToken, `${kind}-create`, payload),
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 409) throw error;
    return null;
  }
}

async function getProvider(operatorToken, kind, actorId) {
  const endpoint = kind === 'field' ? 'field-agents' : 'captains';
  return requestJson(`workforce:get-${kind}`, `${WORKFORCE_API_BASE}/workforce/${endpoint}/${encodeURIComponent(actorId)}`, {
    headers: authorization(operatorToken),
  });
}

async function patchProvider(operatorToken, kind, actorId, payload) {
  const endpoint = kind === 'field' ? 'field-agents' : 'captains';
  return requestJson(`workforce:update-${kind}`, `${WORKFORCE_API_BASE}/workforce/${endpoint}/${encodeURIComponent(actorId)}`, {
    method: 'PATCH',
    headers: {
      ...authorization(operatorToken),
      'Content-Type': 'application/json',
      'X-Correlation-ID': `mobile-dev-${kind}-update-${stableToken(actorId)}`,
    },
    body: JSON.stringify(payload),
  });
}

async function patchOperationalCore(operatorToken, kind, actorId, payload) {
  const endpoint = kind === 'field' ? 'field-agents' : 'captains';
  return requestJson(
    `workforce:${kind}:operational-core`,
    `${WORKFORCE_API_BASE}/workforce/${endpoint}/${encodeURIComponent(actorId)}/operational-core`,
    {
      method: 'PATCH',
      headers: {
        ...authorization(operatorToken),
        'Content-Type': 'application/json',
        'X-Correlation-ID': `mobile-dev-${kind}-operational-core-${stableToken(actorId)}`,
      },
      body: JSON.stringify(payload),
    },
  );
}

function commonOperationalCore(kind) {
  return {
    referralSourceType: 'direct',
    referralChannel: 'local_development',
    referralNote: `Governed local ${kind} development bootstrap`,
    guarantorFullName: kind === 'field' ? 'ضامن المندوب المحلي' : 'ضامن الكابتن المحلي',
    guarantorRelationship: 'relative',
    guarantorPhoneE164: kind === 'field' ? '+967770000011' : '+967770000012',
    guarantorPhoneVerified: true,
    nationalIdNumber: kind === 'field' ? 'LOCAL-FIELD-NID-001' : 'LOCAL-CAPTAIN-NID-001',
    identityFrontMediaRef: `local-dev/workforce/${kind}-identity-front.jpg`,
    identityBackMediaRef: `local-dev/workforce/${kind}-identity-back.jpg`,
    identityVerificationStatus: 'approved',
    contractMediaRef: `local-dev/workforce/${kind}-contract.pdf`,
    contractReviewStatus: 'approved',
    onboardingStage: 'activation_ready',
    reviewedByActorId: LOCAL_ACTORS.operator.actorId,
  };
}

function fieldSovereignMatches(person, zoneId) {
  return person?.fullNameAr === 'مندوب بثواني المحلي'
    && person?.photoMediaRef === 'local-dev/workforce/field-profile.jpg'
    && person?.fieldProfile?.serviceZoneId === zoneId;
}

function captainSovereignMatches(person, zoneId) {
  return person?.fullNameAr === 'كابتن بثواني المحلي'
    && person?.photoMediaRef === 'local-dev/workforce/captain-profile.jpg'
    && person?.captainProfile?.serviceZoneId === zoneId
    && person?.captainProfile?.vehicleType === 'motorcycle'
    && person?.captainProfile?.vehicleIdentifier === 'LOCAL-CAPTAIN-001'
    && person?.captainProfile?.licenseStatus === 'valid';
}

async function repairField(operatorToken, fieldToken, zone) {
  const createPayload = {
    fullNameAr: 'مندوب بثواني المحلي',
    fullNameEn: 'BThwani Local Field Agent',
    phoneE164: LOCAL_ACTORS.field.phoneE164,
    engagementType: 'independent_contractor',
    engagementStartDate: '2026-01-01',
    serviceZoneId: zone.id,
    photoMediaRef: 'local-dev/workforce/field-profile.jpg',
    documentMediaRefs: [
      'local-dev/workforce/field-identity-front.jpg',
      'local-dev/workforce/field-contract.pdf',
    ],
  };
  await createOrAttachProvider(operatorToken, 'field', createPayload);

  let detail = await getProvider(operatorToken, 'field', LOCAL_ACTORS.field.actorId);
  if (!fieldSovereignMatches(detail, zone.id)) {
    detail = await patchProvider(operatorToken, 'field', LOCAL_ACTORS.field.actorId, {
      expectedVersion: detail.version,
      fullNameAr: createPayload.fullNameAr,
      fullNameEn: createPayload.fullNameEn,
      engagementType: createPayload.engagementType,
      engagementStartDate: createPayload.engagementStartDate,
      serviceZoneId: zone.id,
      photoMediaRef: createPayload.photoMediaRef,
    });
  }

  const operational = await patchOperationalCore(
    operatorToken,
    'field',
    LOCAL_ACTORS.field.actorId,
    {
      ...commonOperationalCore('field'),
      partnershipsApproved: true,
    },
  );
  if (operational?.activationReadiness?.ready !== true) {
    throw new Error(`field operational core remained incomplete: ${JSON.stringify(operational?.activationReadiness)}`);
  }

  let me = await requestJson('workforce:field:me-before-self-repair', `${WORKFORCE_API_BASE}/workforce/me`, {
    headers: authorization(fieldToken),
  });
  if (me?.profileComplete !== true) {
    me = await requestJson('workforce:field:self-update', `${WORKFORCE_API_BASE}/workforce/me`, {
      method: 'PATCH',
      headers: {
        ...authorization(fieldToken),
        'Content-Type': 'application/json',
        'X-Correlation-ID': `mobile-dev-field-self-${stableToken(LOCAL_ACTORS.field.actorId)}`,
      },
      body: JSON.stringify({
        photoMediaRef: createPayload.photoMediaRef,
        emergencyContactName: 'جهة اتصال محلية',
        emergencyContactPhone: '+967770000010',
        preferredLanguage: 'ar',
        policyConsent: true,
      }),
    });
  }
  if (me?.profileComplete !== true) throw new Error('field Workforce profile remained incomplete after repair');
}

async function repairCaptain(operatorToken, zone) {
  const createPayload = {
    fullNameAr: 'كابتن بثواني المحلي',
    fullNameEn: 'BThwani Local Captain',
    phoneE164: LOCAL_ACTORS.captain.phoneE164,
    engagementType: 'independent_contractor',
    engagementStartDate: '2026-01-01',
    photoMediaRef: 'local-dev/workforce/captain-profile.jpg',
    vehicleType: 'motorcycle',
    vehicleIdentifier: 'LOCAL-CAPTAIN-001',
    licenseStatus: 'valid',
    licenseExpiresAt: '2035-12-31',
    serviceZoneId: zone.id,
    operatingScopeCode: 'local-dsh',
    documentMediaRefs: [
      'local-dev/workforce/captain-license.jpg',
      'local-dev/workforce/captain-identity-front.jpg',
      'local-dev/workforce/captain-contract.pdf',
    ],
  };
  await createOrAttachProvider(operatorToken, 'captain', createPayload);

  let detail = await getProvider(operatorToken, 'captain', LOCAL_ACTORS.captain.actorId);
  if (!captainSovereignMatches(detail, zone.id)) {
    detail = await patchProvider(operatorToken, 'captain', LOCAL_ACTORS.captain.actorId, {
      expectedVersion: detail.version,
      fullNameAr: createPayload.fullNameAr,
      fullNameEn: createPayload.fullNameEn,
      engagementType: createPayload.engagementType,
      engagementStartDate: createPayload.engagementStartDate,
      photoMediaRef: createPayload.photoMediaRef,
      vehicleType: createPayload.vehicleType,
      vehicleIdentifier: createPayload.vehicleIdentifier,
      licenseStatus: createPayload.licenseStatus,
      licenseExpiresAt: createPayload.licenseExpiresAt,
      serviceZoneId: zone.id,
      operatingScopeCode: createPayload.operatingScopeCode,
    });
  }

  const operational = await patchOperationalCore(
    operatorToken,
    'captain',
    LOCAL_ACTORS.captain.actorId,
    {
      ...commonOperationalCore('captain'),
      captain: {
        classification: 'joker',
        financialGuaranteeMinorUnits: 100000,
        financialGuaranteeCurrency: 'YER',
        financialGuaranteeStatus: 'funded',
        financialGuaranteeReference: 'local-dev/wlt/captain-guarantee-001',
        deliveryBagCustodyStatus: 'issued',
        deliveryBagCustodyReference: 'local-dev/assets/delivery-bag-001',
        mandatoryPurchasesStatus: 'paid_and_delivered',
        mandatoryPurchasesReference: 'local-dev/wlt/captain-purchases-001',
        trainingStatus: 'passed',
        operationsAccreditationStatus: 'approved',
      },
    },
  );
  if (operational?.activationReadiness?.ready !== true) {
    throw new Error(`captain operational core remained incomplete: ${JSON.stringify(operational?.activationReadiness)}`);
  }
}

async function repairWorkforce() {
  if (process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'production') {
    throw new Error('mobile development data repair is forbidden in production');
  }

  const [operatorToken, fieldToken] = await Promise.all([
    getToken(LOCAL_ACTORS.operator.username),
    getToken(LOCAL_ACTORS.field.username),
  ]);
  const zone = await ensureActiveZone(operatorToken);
  await repairField(operatorToken, fieldToken, zone);
  await repairCaptain(operatorToken, zone);
}

async function main() {
  if (MODE === 'repair') {
    await repairWorkforce();
  }

  const failures = await collectReadinessFailures();
  if (failures.length > 0) {
    console.error('Mobile development data is not ready:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Mobile development data ${MODE === 'repair' ? 'repaired and verified' : 'verified'}.`);
}

main().catch((error) => {
  console.error(`Mobile development data ${MODE} failed:`, error);
  process.exit(1);
});
