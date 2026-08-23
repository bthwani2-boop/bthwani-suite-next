// Converges and verifies the governed local development data every mobile app
// surface depends on.
//
// Workforce provider provisioning lives in tools/dev/local-workforce-provisioning.mjs
// because it must also run during bootstrap-dev before the SQL fixtures are
// applied — the seeds substitute the provider actor ids this module mints.
import {
  DSH_API_BASE,
  WORKFORCE_API_BASE,
  authorization,
  getProvider,
  getPasswordToken,
  issueProviderToken,
  list,
  provisionLocalWorkforceActors,
  readGeneratedRegistry,
  requestJson,
  stableToken,
} from '../../tools/dev/local-workforce-provisioning.mjs';
import { LOCAL_ACTORS, LOCAL_WORKFORCE_PROVIDERS } from '../../tools/dev/local-actors.mjs';

const MODE = process.argv.includes('--repair') ? 'repair' : 'check';
const LOCAL_PARTNER_STORE_ID =
  process.env.BTHWANI_LOCAL_PARTNER_STORE_ID?.trim() || 'store-test-grocery';

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

/**
 * Read-only startup check. It reads the generated registry and then verifies
 * each actor against the canonical Workforce provider projection. It does not
 * issue activation codes or create provider sessions. Deep governed checks run
 * in --repair, where mutations are explicitly allowed.
 */
async function collectReadOnlyReadinessFailures() {
  const failures = await collectClientStorefrontFailures();
  const registry = readGeneratedRegistry();

  if (!registry?.actors) {
    failures.push(
      "app-field/app-captain: no provisioned Workforce providers. Run pnpm runtime:full:bootstrap-dev.",
    );
    return failures;
  }

  let operatorToken;
  try {
    // Workforce operator reads are the canonical proof that the generated
    // actor binding still points at a real provider profile. The login only
    // authenticates the read; it does not issue provider activations or mutate
    // Workforce data.
    operatorToken = await getPasswordToken(LOCAL_ACTORS.operator.username);
  } catch (error) {
    failures.push(`app-field/app-captain: Workforce operator read authorization failed: ${error.message}`);
    return failures;
  }

  for (const role of ["field", "captain"]) {
    const provisioned = registry.actors[role];
    const fixture = LOCAL_WORKFORCE_PROVIDERS[role];
    if (!provisioned?.actorId) failures.push(`app-${role}: missing actorId in generated Workforce registry`);
    if (!provisioned?.workforceCode) failures.push(`app-${role}: missing workforceCode in generated Workforce registry`);
    if (provisioned?.phoneE164 !== fixture.phoneE164) {
      failures.push(`app-${role}: generated Workforce phone does not match canonical local fixture`);
    }
    if (!provisioned?.actorId) continue;

    try {
      const detail = await getProvider(operatorToken, role, provisioned.actorId);
      if (detail?.actorId !== provisioned.actorId) {
        failures.push(`app-${role}: Workforce provider actor binding does not match the generated registry`);
      }
      if (detail?.workforceKind !== role) {
        failures.push(`app-${role}: Workforce provider kind does not match the mobile surface`);
      }
    } catch (error) {
      failures.push(`app-${role}: canonical Workforce provider read failed: ${error.message}`);
    }
  }

  return failures;
}

/**
 * Provider self-surface check. Workforce-provisioned actors have no password, so
 * the session is obtained the way the real apps obtain it: by redeeming an
 * operator-issued activation code.
 */
async function collectProviderFailures(operatorToken, providerTokens = {}) {
  const failures = [];
  const registry = readGeneratedRegistry();
  if (!registry?.actors) {
    failures.push(
      'app-field/app-captain: no provisioned Workforce providers. Run pnpm runtime:full:bootstrap-dev.',
    );
    return failures;
  }

  for (const role of ['field', 'captain']) {
    const provisioned = registry.actors[role];
    try {
      if (!provisioned?.actorId) throw new Error('missing from the generated actor registry');
      const token = providerTokens[role] ?? await issueProviderToken(
          operatorToken,
          role,
          provisioned.actorId,
          LOCAL_WORKFORCE_PROVIDERS[role].phoneE164,
        );
      const me = await requestJson(`workforce:${role}:me`, `${WORKFORCE_API_BASE}/workforce/me`, {
        headers: authorization(token),
      });
      if (me?.actorId !== provisioned.actorId) failures.push(`app-${role}: unexpected Workforce actor binding`);
      if (me?.workforceKind !== role) failures.push(`app-${role}: unexpected Workforce kind`);
      if (me?.profileComplete !== true) failures.push(`app-${role}: Workforce self profile is incomplete`);
      if (me?.engagementStatus !== 'active') failures.push(`app-${role}: Workforce engagement is not active`);
    } catch (error) {
      failures.push(`app-${role}: ${error.message}`);
    }
  }
  return failures;
}

async function collectReadinessFailures(operatorToken, providerTokens = {}) {
  const failures = await collectClientStorefrontFailures();

  try {
    const partnerToken = await getPasswordToken(LOCAL_ACTORS.partner.username);
    const scopes = await requestJson(
      'dsh:partner-scopes',
      `${DSH_API_BASE}/dsh/partner/scopes?storeId=${encodeURIComponent(LOCAL_PARTNER_STORE_ID)}`,
      {
      headers: authorization(partnerToken),
      },
    );
    if (list(scopes?.scopes).length === 0) failures.push('app-partner: no governed store scopes');
  } catch (error) {
    failures.push(`app-partner: ${error.message}`);
  }

  failures.push(...(await collectProviderFailures(operatorToken, providerTokens)));
  return failures;
}

/** Brings the field agent's own profile to complete, as the field app would. */
async function repairFieldSelfProfile(operatorToken, actorId) {
  const token = await issueProviderToken(
    operatorToken,
    'field',
    actorId,
    LOCAL_WORKFORCE_PROVIDERS.field.phoneE164,
  );
  let me = await requestJson('workforce:field:me-before-self-repair', `${WORKFORCE_API_BASE}/workforce/me`, {
    headers: authorization(token),
  });
  if (me?.profileComplete !== true) {
    me = await requestJson('workforce:field:self-update', `${WORKFORCE_API_BASE}/workforce/me`, {
      method: 'PATCH',
      headers: {
        ...authorization(token),
        'Content-Type': 'application/json',
        'X-Correlation-ID': `mobile-dev-field-self-${stableToken(actorId)}`,
      },
      body: JSON.stringify({
        photoMediaRef: 'local-dev/workforce/field-profile.jpg',
        emergencyContactName: 'جهة اتصال محلية',
        emergencyContactPhone: '+967770000010',
        preferredLanguage: 'ar',
        policyConsent: true,
      }),
    });
  }
  if (me?.profileComplete !== true) throw new Error('field Workforce profile remained incomplete after repair');
  return token;
}

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'production') {
    throw new Error('mobile development data access is forbidden in production');
  }

  let failures;
  if (MODE === 'repair') {
    const operatorToken = await getPasswordToken(LOCAL_ACTORS.operator.username);
    const { actors } = await provisionLocalWorkforceActors(operatorToken);
    const fieldToken = await repairFieldSelfProfile(operatorToken, actors.field.actorId);
    failures = await collectReadinessFailures(operatorToken, { field: fieldToken });
  } else {
    failures = await collectReadOnlyReadinessFailures();
  }
  if (failures.length > 0) {
    console.error('Mobile development data is not ready:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Mobile development data ${MODE === 'repair' ? 'repaired and verified' : 'verified'}.`);
}

main().catch((error) => {
  console.error(`Mobile development data ${MODE} failed:`, error);
  process.exitCode = 1;
});
