// Provisions the local development field agent and captain through the real
// governed Workforce path, exactly as an operator would in the Control Panel.
//
// These two providers are deliberately absent from the Identity local bootstrap:
// Workforce owns provider actor creation, and it always provisions Identity with
// a server-generated workforce code as the username. A pre-seeded actor holding
// the same phone under a friendly username can never be adopted by that path, so
// the bootstrap must not claim these phones at all.
//
// Because the resulting actor ids are generated at runtime, they cannot be
// hardcoded in SQL fixtures. This module writes them to a generated registry
// that the governed seed runner substitutes into @@FIELD_ACTOR_ID@@ and
// @@CAPTAIN_ACTOR_ID@@ placeholders.
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { LOCAL_ACTORS, LOCAL_WORKFORCE_PROVIDERS, localPassword } from './local-actors.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const GENERATED_REGISTRY_PATH = path.join(
  repoRoot,
  '.artifacts/local-dev/workforce-actors.json',
);

export const DSH_API_BASE = process.env.DSH_API_BASE || 'http://127.0.0.1:58080';
export const IDENTITY_API_BASE = process.env.IDENTITY_API_BASE || 'http://127.0.0.1:58082';
export const WORKFORCE_API_BASE = process.env.WORKFORCE_API_BASE || 'http://127.0.0.1:58086';

export class HttpError extends Error {
  constructor(operation, status, body) {
    super(`${operation} failed with HTTP ${status}: ${body}`);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

export function stableToken(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 24);
}

export function authorization(token) {
  return { Authorization: `Bearer ${token}` };
}

export function mutationHeaders(token, operation, payload) {
  const identity = stableToken(`${operation}:${JSON.stringify(payload)}`);
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': `mobile-dev-${operation}-${identity}`,
    'X-Correlation-ID': `mobile-dev-${operation}-${identity}`,
  };
}

export function list(value) {
  return Array.isArray(value) ? value : [];
}

export async function requestJson(operation, url, options = {}) {
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

/** Password login. Only bootstrap-seeded actors (operator, partner, client) have one. */
export async function getPasswordSession(
  username,
  deviceFingerprint = `mobile-dev-${username}`,
) {
  const result = await requestJson(`identity:login:${username}`, `${IDENTITY_API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password: localPassword(),
      deviceFingerprint,
    }),
  });
  if (!result?.accessToken || !result?.refreshToken || !result?.identity?.subject) {
    throw new Error(`identity:login:${username} returned an incomplete token pair`);
  }
  return result;
}

export async function getPasswordToken(username) {
  const result = await getPasswordSession(username);
  return result.accessToken;
}

export async function ensureActiveZone(operatorToken) {
  const result = await requestJson(
    'dsh:list-zones',
    `${DSH_API_BASE}/dsh/operator/platform/zones?includeInactive=true`,
    { headers: authorization(operatorToken) },
  );
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

function endpointFor(kind) {
  return kind === 'field' ? 'field-agents' : 'captains';
}

/**
 * Workforce list search matches names and workforce codes, not phones, so the
 * canonical Arabic fixture name is what makes re-provisioning idempotent.
 */
async function findExistingProvider(operatorToken, kind) {
  const fullNameAr = LOCAL_WORKFORCE_PROVIDERS[kind].fullNameAr;
  const result = await requestJson(
    `workforce:list-${kind}`,
    `${WORKFORCE_API_BASE}/workforce/${endpointFor(kind)}?q=${encodeURIComponent(fullNameAr)}&limit=100`,
    { headers: authorization(operatorToken) },
  );
  const people = list(result?.fieldAgents).concat(list(result?.captains));
  return people.find((person) => person?.fullNameAr === fullNameAr) || null;
}

async function createProvider(operatorToken, kind, payload) {
  try {
    return await requestJson(
      `workforce:create-${kind}`,
      `${WORKFORCE_API_BASE}/workforce/${endpointFor(kind)}`,
      {
        method: 'POST',
        headers: mutationHeaders(operatorToken, `${kind}-create`, payload),
        body: JSON.stringify(payload),
      },
    );
  } catch (error) {
    if (!(error instanceof HttpError)) throw error;
    // 409 means the phone is already provisioned. That is only recoverable when
    // Workforce itself owns the actor; a bootstrap-owned actor cannot be adopted.
    if (error.status !== 409) throw error;
    const existing = await findExistingProvider(operatorToken, kind);
    if (existing) return existing;
    throw new Error(
      `workforce:create-${kind} conflicted on phone ${payload.phoneE164} but no Workforce profile owns it. ` +
        'An Identity actor outside Workforce holds this phone — remove it before provisioning.',
    );
  }
}

export function fieldCreatePayload(zoneId, actorId) {
  const fixture = LOCAL_WORKFORCE_PROVIDERS.field;
  return {
    fullNameAr: fixture.fullNameAr,
    fullNameEn: fixture.fullNameEn,
    actorId,
    engagementType: 'independent_contractor',
    engagementStartDate: '2026-01-01',
    serviceZoneId: zoneId,
    photoMediaRef: 'local-dev/workforce/field-profile.jpg',
    documentMediaRefs: [
      'local-dev/workforce/field-identity-front.jpg',
      'local-dev/workforce/field-contract.pdf',
    ],
  };
}

export function captainCreatePayload(zoneId, actorId) {
  const fixture = LOCAL_WORKFORCE_PROVIDERS.captain;
  return {
    fullNameAr: fixture.fullNameAr,
    fullNameEn: fixture.fullNameEn,
    actorId,
    engagementType: 'independent_contractor',
    engagementStartDate: '2026-01-01',
    photoMediaRef: 'local-dev/workforce/captain-profile.jpg',
    vehicleType: 'motorcycle',
    vehicleIdentifier: 'LOCAL-CAPTAIN-001',
    licenseStatus: 'valid',
    licenseExpiresAt: '2035-12-31',
    serviceZoneId: zoneId,
    operatingScopeCode: 'local-dsh',
    documentMediaRefs: [
      'local-dev/workforce/captain-license.jpg',
      'local-dev/workforce/captain-identity-front.jpg',
      'local-dev/workforce/captain-contract.pdf',
    ],
  };
}

export function commonOperationalCore(kind) {
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

async function patchOperationalCore(operatorToken, kind, actorId, payload) {
  return requestJson(
    `workforce:${kind}:operational-core`,
    `${WORKFORCE_API_BASE}/workforce/${endpointFor(kind)}/${encodeURIComponent(actorId)}/operational-core`,
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

export async function getProvider(operatorToken, kind, actorId) {
  return requestJson(
    `workforce:get-${kind}`,
    `${WORKFORCE_API_BASE}/workforce/${endpointFor(kind)}/${encodeURIComponent(actorId)}`,
    { headers: authorization(operatorToken) },
  );
}

/**
 * Workforce-provisioned actors never hold a password: they authenticate by
 * redeeming an operator-issued activation code, which is the real production
 * onboarding path for both mobile provider apps.
 */
export async function issueProviderSession(
  operatorToken,
  kind,
  actorId,
  phoneE164,
  deviceFingerprint = `mobile-dev-${kind}`,
) {
  const detail = await getProvider(operatorToken, kind, actorId);
  // Issuing an activation code is a fresh operation every time, never a replay:
  // a stable idempotency key collides with the previously issued challenge.
  const attempt = randomUUID();
  const issued = await requestJson(
    `workforce:${kind}:issue-activation`,
    `${WORKFORCE_API_BASE}/workforce/${endpointFor(kind)}/${encodeURIComponent(actorId)}/activation-codes`,
    {
      method: 'POST',
      headers: {
        ...authorization(operatorToken),
        'Content-Type': 'application/json',
        'Idempotency-Key': `mobile-dev-${kind}-activation-${attempt}`,
        'X-Correlation-ID': `mobile-dev-${kind}-activation-${attempt}`,
      },
      body: JSON.stringify({ expectedVersion: detail.version }),
    },
  );
  if (!issued?.code) throw new Error(`workforce:${kind}:issue-activation returned no code`);

  const pair = await requestJson(`identity:activate:${kind}`, `${IDENTITY_API_BASE}/auth/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      actorType: kind,
      phone: phoneE164,
      code: issued.code,
      deviceFingerprint,
    }),
  });
  if (!pair?.accessToken || !pair?.refreshToken || !pair?.identity?.subject) {
    throw new Error(`identity:activate:${kind} returned an incomplete token pair`);
  }
  return pair;
}

export async function issueProviderToken(operatorToken, kind, actorId, phoneE164) {
  const pair = await issueProviderSession(operatorToken, kind, actorId, phoneE164);
  return pair.accessToken;
}

async function provisionIdentityActor(kind, phoneE164) {
  const serviceToken = 'LOCAL_ONLY_replace_with_workforce_internal_service_token';
  const result = await requestJson(
    `identity:provision-actor`,
    `${IDENTITY_API_BASE}/internal/actors/provision`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceToken}`,
        'X-Service-Caller': 'workforce',
        'X-Operator-Context-ID': 'local-dsh',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: kind === 'field' ? 'local-field-001' : 'local-captain-001',
        phoneE164,
        role: kind,
        operatorContextID: 'local-dsh',
      }),
    }
  );
  if (!result?.actorId) throw new Error(`identity:provision-actor returned no actorId`);
  return result.actorId;
}

async function provisionOne(operatorToken, kind, zone) {
  const existing = await findExistingProvider(operatorToken, kind);
  let actorId;
  let person;

  if (existing) {
    actorId = existing.actorId;
    person = existing;
  } else {
    const phoneE164 = LOCAL_WORKFORCE_PROVIDERS[kind].phoneE164;
    try {
      actorId = await provisionIdentityActor(kind, phoneE164);
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) {
        throw new Error(`Identity actor with phone ${phoneE164} already exists but no workforce profile was found. Manual cleanup of identity_actors required.`);
      }
      throw error;
    }

    const payload = kind === 'field' ? fieldCreatePayload(zone.id, actorId) : captainCreatePayload(zone.id, actorId);
    person = await createProvider(operatorToken, kind, payload);
    if (!person?.actorId) throw new Error(`workforce:${kind} provisioning returned no actorId`);
  }

  const operationalCore = {
    ...commonOperationalCore(kind),
    ...(kind === 'field'
      ? { partnershipsApproved: true }
      : {
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
        }),
  };
  const operational = await patchOperationalCore(operatorToken, kind, actorId, operationalCore);
  if (operational?.activationReadiness?.ready !== true) {
    throw new Error(
      `${kind} operational core remained incomplete: ${JSON.stringify(operational?.activationReadiness)}`,
    );
  }

  return {
    actorId,
    workforceCode: person.workforceCode,
    phoneE164: LOCAL_WORKFORCE_PROVIDERS[kind].phoneE164,
  };
}

export function readGeneratedRegistry() {
  if (!fs.existsSync(GENERATED_REGISTRY_PATH)) return null;
  return JSON.parse(fs.readFileSync(GENERATED_REGISTRY_PATH, 'utf-8'));
}

function writeGeneratedRegistry(actors) {
  fs.mkdirSync(path.dirname(GENERATED_REGISTRY_PATH), { recursive: true });
  const registry = {
    $comment:
      'Generated by tools/dev/local-workforce-provisioning.mjs. Local development only. ' +
      'The governed seed runner substitutes these into @@TOKEN@@ placeholders in *.local.sql fixtures.',
    generatedAt: new Date().toISOString(),
    FIELD_ACTOR_ID: actors.field.actorId,
    CAPTAIN_ACTOR_ID: actors.captain.actorId,
    actors,
  };
  fs.writeFileSync(GENERATED_REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, 'utf-8');
  return registry;
}

/** Provisions both providers and records their generated actor ids. Idempotent. */
export async function provisionLocalWorkforceActors(operatorToken) {
  const zone = await ensureActiveZone(operatorToken);
  const field = await provisionOne(operatorToken, 'field', zone);
  const captain = await provisionOne(operatorToken, 'captain', zone);
  const actors = { field, captain };
  writeGeneratedRegistry(actors);
  return { zone, actors };
}

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'production') {
    throw new Error('local workforce provisioning is forbidden in production');
  }
  const operatorToken = await getPasswordToken(LOCAL_ACTORS.operator.username);
  const { actors } = await provisionLocalWorkforceActors(operatorToken);
  console.log(
    `Local Workforce providers provisioned: field=${actors.field.actorId} (${actors.field.workforceCode}) ` +
      `captain=${actors.captain.actorId} (${actors.captain.workforceCode})`,
  );
  console.log(`Generated registry: ${path.relative(repoRoot, GENERATED_REGISTRY_PATH)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error('Local Workforce provisioning failed:', error);
    process.exitCode = 1;
  });
}
