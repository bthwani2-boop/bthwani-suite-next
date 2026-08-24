// Provisions the local development field agent and captain through the real
// governed Workforce path, exactly as an operator would in the Control Panel.
//
// These two providers are deliberately absent from the Identity local bootstrap:
// Workforce owns provider actor creation. The generated actor id is persisted in
// Workforce and is therefore sovereign across later Identity rebuilds; when a
// local Identity database is recreated, this module restores the missing actor
// under that same id instead of minting a divergent replacement.
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

export const DSH_API_BASE = process.env.DSH_API_BASE || 'http://127.0.0.1:18080';
export const IDENTITY_API_BASE = process.env.IDENTITY_API_BASE || 'http://127.0.0.1:18082';
export const WORKFORCE_API_BASE = process.env.WORKFORCE_API_BASE || 'http://127.0.0.1:18086';
const WLT_API_BASE = process.env.WLT_API_BASE || 'http://127.0.0.1:18083';
const WLT_DSH_SERVICE_TOKEN =
  process.env.WLT_DSH_SERVICE_TOKEN ||
  process.env.DSH_WLT_SERVICE_TOKEN ||
  'dev-only-dsh-wlt-shared-secret';
const IDENTITY_WORKFORCE_SERVICE_TOKEN =
  process.env.IDENTITY_WORKFORCE_SERVICE_TOKEN ||
  'LOCAL_ONLY_replace_with_workforce_internal_service_token';
export const LOCAL_OPERATOR_CONTEXT_ID = process.env.BTHWANI_OPERATOR_CONTEXT_ID || 'local-dsh';
// The local COD journey must have spendable wallet capacity in addition to the
// protected collateral position. This is a governed development top-up, not a
// direct wallet write; production balances remain WLT-owned.
export const LOCAL_CAPTAIN_DISPATCH_CAPACITY_MINOR_UNITS = 5_000_000;
// The local platform-owner actor is the governed supervisor for both provider
// kinds. This is a local fixture binding, not a Workforce fallback: Identity
// must expose the matching workforce.supervise.* roles before any profile can
// be activated.
const LOCAL_WORKFORCE_SUPERVISOR_ACTOR_ID = LOCAL_ACTORS.operator.actorId;

export class HttpError extends Error {
  constructor(operation, status, body) {
    super(`${operation} failed with HTTP ${status}: ${body}`);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

export function needsLocalProviderConvergence(error) {
  if (!(error instanceof HttpError)) return false;

  let code = '';
  try {
    const body = JSON.parse(error.body);
    code = typeof body?.code === 'string' ? body.code : '';
  } catch {
    code = '';
  }

  if (!code) {
    const match = error.message.match(/[\"]code[\"]\s*:\s*[\"]([^\"]+)[\"]/);
    code = match?.[1] ?? '';
  }

  return (error.status === 404 && (code === 'ACTOR_NOT_FOUND' || code === 'PROFILE_NOT_PROVISIONED'))
    || (error.status === 422 && code === 'PROFILE_INCOMPLETE');
}

export function stableToken(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 24);
}

export function authorization(token) {
  return { Authorization: `Bearer ${token}` };
}

function identityWorkforceHeaders() {
  return {
    Authorization: `Bearer ${IDENTITY_WORKFORCE_SERVICE_TOKEN}`,
    'X-Service-Caller': 'workforce',
    'X-Operator-Context-ID': LOCAL_OPERATOR_CONTEXT_ID,
  };
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
 * Workforce list search matches names and workforce codes, not phones. Prefer
 * the actor recorded in the generated registry so DSH/WLT local fixtures keep
 * the same sovereign cross-service key after a partial Identity rebuild.
 */
async function findExistingProvider(operatorToken, kind) {
  const fullNameAr = LOCAL_WORKFORCE_PROVIDERS[kind].fullNameAr;
  const result = await requestJson(
    `workforce:list-${kind}`,
    `${WORKFORCE_API_BASE}/workforce/${endpointFor(kind)}?q=${encodeURIComponent(fullNameAr)}&limit=100`,
    { headers: authorization(operatorToken) },
  );
  const exact = list(result?.fieldAgents)
    .concat(list(result?.captains))
    .filter((person) => person?.fullNameAr === fullNameAr);

  const preferredActorId = readGeneratedRegistry()?.actors?.[kind]?.actorId;
  const preferredPerson = exact.find((person) => person?.actorId === preferredActorId);

  const peopleToCheck = preferredPerson ? [preferredPerson, ...exact.filter(p => p.actorId !== preferredActorId)] : exact;

  for (const person of peopleToCheck) {
    const identityActor = await getIdentityActor(person.actorId);
    if (!identityActor) {
      console.warn(`[dev-provision] Ignoring orphaned Workforce profile ${person.actorId}`);
      continue;
    }
    assertIdentityBinding(kind, person.actorId, identityActor);
    return person;
  }
  return null;
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
    if (error.status !== 409) throw error;
    const existing = await findExistingProvider(operatorToken, kind);
    if (existing) return existing;
    throw new Error(
      `workforce:create-${kind} conflicted but no canonical Workforce profile was found for the local fixture.`,
    );
  }
}

export function fieldCreatePayload(zoneId) {
  const fixture = LOCAL_WORKFORCE_PROVIDERS.field;
  return {
    fullNameAr: fixture.fullNameAr,
    fullNameEn: fixture.fullNameEn,
    username: 'local-field-001',
    phoneE164: fixture.phoneE164,
    engagementType: 'independent_contractor',
    engagementStartDate: '2026-01-01',
    serviceZoneId: zoneId,
    supervisorActorId: LOCAL_WORKFORCE_SUPERVISOR_ACTOR_ID,
    photoMediaRef: 'local-dev/workforce/field-profile.jpg',
    documentMediaRefs: [
      'local-dev/workforce/field-identity-front.jpg',
      'local-dev/workforce/field-contract.pdf',
    ],
  };
}

export function captainCreatePayload(zoneId) {
  const fixture = LOCAL_WORKFORCE_PROVIDERS.captain;
  return {
    fullNameAr: fixture.fullNameAr,
    fullNameEn: fixture.fullNameEn,
    username: 'local-captain-001',
    phoneE164: fixture.phoneE164,
    engagementType: 'independent_contractor',
    engagementStartDate: '2026-01-01',
    photoMediaRef: 'local-dev/workforce/captain-profile.jpg',
    vehicleType: 'motorcycle',
    vehicleIdentifier: 'LOCAL-CAPTAIN-001',
    licenseStatus: 'valid',
    licenseExpiresAt: '2035-12-31',
    serviceZoneId: zoneId,
    operatingScopeCode: 'local-dsh',
    supervisorActorId: LOCAL_WORKFORCE_SUPERVISOR_ACTOR_ID,
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

function wltHeaders(operation, idempotencyKey = '') {
  const headers = {
    Authorization: `Bearer ${WLT_DSH_SERVICE_TOKEN}`,
    'X-Service-Caller': 'dsh',
    'X-Delegated-Operator-Context': LOCAL_OPERATOR_CONTEXT_ID,
    'X-Correlation-ID': `mobile-dev-${operation}-${stableToken(operation)}`,
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  return headers;
}

function replayedWltPaymentSession(error) {
  if (!(error instanceof HttpError) || error.status !== 409) return null;
  try {
    const body = JSON.parse(error.body);
    return body?.idempotentReplay === true && body.paymentSession?.id
      ? body.paymentSession
      : null;
  } catch {
    return null;
  }
}

async function refreshWltPaymentSessionStatus(paymentSessionId, operationPrefix) {
  const attempt = randomUUID();
  const operation = `${operationPrefix}-status-refresh-${attempt}`;
  const result = await requestJson(
    `wlt:${operationPrefix}:status-refresh`,
    `${WLT_API_BASE}/wlt/payment-sessions/${encodeURIComponent(paymentSessionId)}/refresh-provider-status`,
    {
      method: 'POST',
      headers: wltHeaders(operation, `mobile-dev-${operation}`),
      body: '{}',
    },
  );
  const session = result?.paymentSession;
  if (!session?.id) {
    throw new Error(`wlt:${operationPrefix}: status refresh returned no payment session`);
  }
  return session;
}

async function completeWltTopup({ operationPrefix, reference, actorId, amountMinorUnits, currency }) {
  const created = await requestJson(
    `wlt:${operationPrefix}:topup-create`,
    `${WLT_API_BASE}/wlt/topup-sessions`,
    {
      method: 'POST',
      headers: wltHeaders(`${operationPrefix}-topup-create`, `mobile-dev-${reference}`),
      body: JSON.stringify({
        actorType: 'captain',
        actorId,
        topupReference: reference,
        amountMinorUnits,
        currency,
      }),
    },
  );
  let session = created?.paymentSession;
  if (!session?.id) throw new Error(`wlt:${operationPrefix}: top-up returned no payment session`);

  if (session.status === 'provider_result_unknown') {
    session = await refreshWltPaymentSessionStatus(session.id, operationPrefix);
  }

  for (const operation of ['authorize', 'capture']) {
    if (session.status === 'captured' || (operation === 'authorize' && session.status === 'authorized')) {
      continue;
    }
    if (!['reference_created', 'pending_provider', 'authorized'].includes(session.status)) {
      throw new Error(`wlt:${operationPrefix}: top-up cannot continue from status ${session.status}`);
    }

    try {
      const result = await requestJson(
        `wlt:${operationPrefix}:topup-${operation}`,
        `${WLT_API_BASE}/wlt/topup-sessions/${encodeURIComponent(session.id)}/${operation}`,
        {
          method: 'POST',
          headers: wltHeaders(
            `${operationPrefix}-topup-${operation}`,
            `mobile-dev-${reference}-${operation}`,
          ),
          body: '{}',
        },
      );
      session = result?.paymentSession ?? session;
    } catch (error) {
      const replayed = replayedWltPaymentSession(error);
      if (!replayed) throw error;
      session = await refreshWltPaymentSessionStatus(session.id, operationPrefix);
    }

    if (session.status === 'provider_result_unknown') {
      session = await refreshWltPaymentSessionStatus(session.id, operationPrefix);
    }
    if (session.status === 'captured' || (operation === 'authorize' && session.status === 'authorized')) {
      continue;
    }
    throw new Error(`wlt:${operationPrefix}: top-up remained in status ${session.status} after provider reconciliation`);
  }

  return session;
}

async function ensureCaptainFinancialStanding(captainId) {
  const readback = await requestJson(
    'wlt:captain-collateral:read',
    `${WLT_API_BASE}/wlt/captain-collateral/${encodeURIComponent(captainId)}`,
    { headers: wltHeaders('captain-collateral-read') },
  );
  const policy = readback?.policy;
  if (
    !policy ||
    policy.enabled !== true ||
    policy.currency !== 'YER' ||
    policy.minimumCollateralMinorUnits <= 0
  ) {
    throw new Error(
      `captain WLT collateral policy is not configured for ${captainId}: ${JSON.stringify(policy)}`,
    );
  }

  const hasValidPosition = list(readback.positions).some(
    (position) =>
      position?.status === 'active' &&
      position?.currency === policy.currency &&
      position?.protectedMinimumMinorUnits >= policy.minimumCollateralMinorUnits &&
      position?.restrictedAmountMinorUnits >= policy.minimumCollateralMinorUnits,
  );
  if (!hasValidPosition) {
    const reference = `local-captain-collateral-${stableToken(captainId)}`;
    const session = await completeWltTopup({
      operationPrefix: 'captain-collateral',
      reference,
      actorId: captainId,
      amountMinorUnits: policy.minimumCollateralMinorUnits,
      currency: policy.currency,
    });

    await requestJson(
      'wlt:captain-collateral:allocate',
      `${WLT_API_BASE}/wlt/captain-collateral/allocate`,
      {
        method: 'POST',
        headers: wltHeaders('captain-collateral-allocate', `mobile-dev-${reference}-allocate`),
        body: JSON.stringify({
          captainId,
          paymentSessionId: session.id,
          allocatedByActorId: LOCAL_ACTORS.operator.actorId,
        }),
      },
    );
  }

  const verified = await requestJson(
    'wlt:captain-collateral:verify',
    `${WLT_API_BASE}/wlt/captain-collateral/${encodeURIComponent(captainId)}`,
    { headers: wltHeaders('captain-collateral-verify') },
  );
  const verifiedPosition = list(verified?.positions).find(
    (position) =>
      position?.status === 'active' &&
      position?.currency === verified?.policy?.currency &&
      position?.protectedMinimumMinorUnits >= verified?.policy?.minimumCollateralMinorUnits &&
      position?.restrictedAmountMinorUnits >= verified?.policy?.minimumCollateralMinorUnits,
  );
  if (!verifiedPosition) {
    throw new Error(`captain WLT collateral readback remained incomplete: ${JSON.stringify(verified)}`);
  }

  await ensureCaptainDispatchCapacity(captainId);
}

async function ensureCaptainDispatchCapacity(captainId) {
  const reference = `local-captain-dispatch-capacity-${stableToken(captainId)}`;
  await completeWltTopup({
    operationPrefix: 'captain-dispatch-capacity',
    reference,
    actorId: captainId,
    amountMinorUnits: LOCAL_CAPTAIN_DISPATCH_CAPACITY_MINOR_UNITS,
    currency: 'YER',
  });
}

async function ensureCaptainDispatchProfile(operatorToken, captainId) {
  await requestJson(
    'dsh:captain-dispatch-profile-upsert',
    `${DSH_API_BASE}/dsh/operator/dispatch/captains/${encodeURIComponent(captainId)}/profile`,
    {
      method: 'PUT',
      headers: {
        ...authorization(operatorToken),
        'Content-Type': 'application/json',
        'X-Operator-Context-ID': LOCAL_OPERATOR_CONTEXT_ID,
        'X-Correlation-ID': `mobile-dev-captain-dispatch-profile-${stableToken(captainId)}`,
      },
      body: JSON.stringify({
        accreditationStatus: 'approved',
        availabilityStatus: 'available',
        maxActiveAssignments: 5,
        priorityScore: 100,
        expectedVersion: 0,
      }),
    },
  );
}

async function refreshCaptainFinancialEligibility(operatorToken, captainId) {
  const result = await requestJson(
    'dsh:refresh-captain-financial-eligibility',
    `${DSH_API_BASE}/dsh/operator/dispatch/captains/${encodeURIComponent(captainId)}/financial-eligibility/refresh`,
    {
      method: 'POST',
      headers: {
        ...authorization(operatorToken),
        'Content-Type': 'application/json',
        'Idempotency-Key': `mobile-dev-captain-financial-eligibility-${stableToken(captainId)}`,
        'X-Operator-Context-ID': LOCAL_OPERATOR_CONTEXT_ID,
        'X-Correlation-ID': `mobile-dev-captain-financial-eligibility-${stableToken(captainId)}`,
      },
      body: '{}',
    },
  );
  const decision = result?.financialEligibility;
  if (
    decision?.eligible !== true ||
    !decision?.wltDecisionId ||
    !decision?.wltPolicyVersion ||
    !decision?.expiresAt
  ) {
    throw new Error(`captain WLT financial eligibility readback remained incomplete: ${JSON.stringify(decision)}`);
  }
  return decision;
}

export async function getProvider(operatorToken, kind, actorId) {
  return requestJson(
    `workforce:get-${kind}`,
    `${WORKFORCE_API_BASE}/workforce/${endpointFor(kind)}/${encodeURIComponent(actorId)}`,
    { headers: authorization(operatorToken) },
  );
}

async function getIdentityActor(actorId) {
  try {
    return await requestJson(
      `identity:get-actor:${actorId}`,
      `${IDENTITY_API_BASE}/internal/actors/${encodeURIComponent(actorId)}`,
      { headers: identityWorkforceHeaders() },
    );
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

function assertIdentityBinding(kind, actorId, actor) {
  const fixture = LOCAL_WORKFORCE_PROVIDERS[kind];
  if (actor?.actorId !== actorId) {
    throw new Error(`${kind} Identity recovery returned a divergent actorId`);
  }
  if (actor?.phoneE164 !== fixture.phoneE164) {
    throw new Error(`${kind} Identity actor phone does not match the canonical local fixture`);
  }
  if (!list(actor?.roles).includes(kind)) {
    throw new Error(`${kind} Identity actor does not hold the required role`);
  }
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
  if (kind === 'captain') {
    // Captain activation is also gated by a short-lived DSH/WLT decision.
    // Refresh it at the same boundary that issues the activation code so a
    // previously provisioned local actor cannot drift into PROFILE_INCOMPLETE.
    await refreshCaptainFinancialEligibility(operatorToken, actorId);
  }
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

async function provisionIdentityActor(kind, phoneE164, actorId = '') {
  const body = {
    username: kind === 'field' ? 'local-field-001' : 'local-captain-001',
    phoneE164,
    role: kind,
    operatorContextId: LOCAL_OPERATOR_CONTEXT_ID,
  };
  if (actorId) body.actorId = actorId;

  const result = await requestJson(
    `identity:provision-actor:${kind}`,
    `${IDENTITY_API_BASE}/internal/actors/provision`,
    {
      method: 'POST',
      headers: {
        ...identityWorkforceHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
  if (!result?.actorId) throw new Error(`identity:provision-actor:${kind} returned no actorId`);
  return result;
}

async function provisionOne(operatorToken, kind, zone, { deferFinancialStanding = false } = {}) {
  const existing = await findExistingProvider(operatorToken, kind);
  const phoneE164 = LOCAL_WORKFORCE_PROVIDERS[kind].phoneE164;
  let actorId;
  let person;

  if (existing) {
    actorId = existing.actorId;
    person = existing;
    if (!actorId) throw new Error(`workforce:${kind} existing profile has no actorId`);

    let identityActor = await getIdentityActor(actorId);
    if (!identityActor) {
      console.log(
        `[local-workforce] restoring missing Identity actor ${actorId} for existing ${kind} Workforce profile`,
      );
      try {
        identityActor = await provisionIdentityActor(kind, phoneE164, actorId);
      } catch (error) {
        if (error instanceof HttpError && error.status === 409) {
          throw new Error(
            `Cannot restore ${kind} actor ${actorId}: the canonical phone/username is already owned by a different Identity actor.`,
          );
        }
        throw error;
      }
    }
    assertIdentityBinding(kind, actorId, identityActor);
  } else {
    if (kind === 'field') {
      // Workforce owns the complete Field create saga: it provisions the
      // Identity actor from business identity inputs and returns the canonical
      // actor id. The local helper must not pre-create or adopt an actor.
      const payload = fieldCreatePayload(zone.id);
      person = await createProvider(operatorToken, kind, payload);
      actorId = person?.actorId;
      if (!actorId) throw new Error('workforce:field provisioning returned no actorId');
      const identityActor = await getIdentityActor(actorId);
      assertIdentityBinding(kind, actorId, identityActor);
    } else {
      let identityActor;
      try {
        identityActor = await provisionIdentityActor(kind, phoneE164);
      } catch (error) {
        if (error instanceof HttpError && error.status === 409) {
          throw new Error(
            `Identity actor with phone ${phoneE164} already exists but no Workforce profile was found. ` +
              'The local databases are inconsistent and must not mint a second sovereign provider.',
          );
        }
        throw error;
      }
      actorId = identityActor.actorId;
      assertIdentityBinding(kind, actorId, identityActor);
      person = await createProvider(operatorToken, kind, captainCreatePayload(zone.id));
    }
    if (!person?.actorId) throw new Error(`workforce:${kind} provisioning returned no actorId`);
    if (person.actorId !== actorId) {
      throw new Error(`workforce:${kind} provisioning returned a divergent actorId`);
    }
  }

  const profile = kind === 'field' ? person?.fieldProfile : person?.captainProfile;
  if (profile?.supervisorActorId !== LOCAL_WORKFORCE_SUPERVISOR_ACTOR_ID) {
    person = await requestJson(
      `workforce:update-${kind}-supervisor`,
      `${WORKFORCE_API_BASE}/workforce/${endpointFor(kind)}/${encodeURIComponent(actorId)}`,
      {
        method: 'PATCH',
        headers: {
          ...authorization(operatorToken),
          'Content-Type': 'application/json',
          'X-Correlation-ID': `mobile-dev-${kind}-supervisor-${stableToken(actorId)}`,
        },
        body: JSON.stringify({
          expectedVersion: person.version,
          supervisorActorId: LOCAL_WORKFORCE_SUPERVISOR_ACTOR_ID,
        }),
      },
    );
  }

  const operationalCore = {
    ...commonOperationalCore(kind),
    ...(kind === 'field'
      ? { partnershipsApproved: true }
      : {
          captain: {
            classification: 'joker',
            deliveryBagCustodyStatus: 'issued',
            deliveryBagCustodyReference: 'local-dev/assets/delivery-bag-001',
            mandatoryPurchasesStatus: 'paid_and_delivered',
            mandatoryPurchasesReference: 'local-dev/wlt/captain-purchases-001',
            trainingStatus: 'passed',
            operationsAccreditationStatus: 'approved',
          },
        }),
  };
  if (kind === 'captain' && !deferFinancialStanding) {
    await ensureCaptainFinancialStanding(actorId);
    await refreshCaptainFinancialEligibility(operatorToken, actorId);
  }
  if (kind === 'captain') {
    await ensureCaptainDispatchProfile(operatorToken, actorId);
  }
  const operational = await patchOperationalCore(operatorToken, kind, actorId, operationalCore);
  if (operational?.activationReadiness?.ready !== true) {
    throw new Error(
      `${kind} operational core remained incomplete: ${JSON.stringify(operational?.activationReadiness)}`,
    );
  }

  return {
    actorId,
    workforceCode: person.workforceCode,
    phoneE164,
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
export async function provisionLocalWorkforceActors(
  operatorToken,
  { deferFinancialStanding = false } = {},
) {
  const zone = await ensureActiveZone(operatorToken);
  const field = await provisionOne(operatorToken, 'field', zone, { deferFinancialStanding });
  const captain = await provisionOne(operatorToken, 'captain', zone, { deferFinancialStanding });
  const actors = { field, captain };
  writeGeneratedRegistry(actors);
  return { zone, actors };
}

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'production') {
    throw new Error('local workforce provisioning is forbidden in production');
  }
  const operatorToken = await getPasswordToken(LOCAL_ACTORS.operator.username);
  const deferFinancialStanding = process.argv.includes('--defer-financial-standing');
  const { actors } = await provisionLocalWorkforceActors(operatorToken, { deferFinancialStanding });
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
