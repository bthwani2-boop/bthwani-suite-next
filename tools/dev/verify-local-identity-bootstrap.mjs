// Asserts that the Identity local bootstrap has actually converged, immediately
// after the runtime's APIs report ready and before anything downstream depends
// on an authenticated operator.
//
// Without this gate the real failure — Identity serving against a database with
// no canonical actors — surfaced three layers later as a bare
// `INVALID_CREDENTIALS` from mobile-dev-data, which names neither the authority
// that failed nor the state that caused it.
import { getPasswordSession, IDENTITY_API_BASE } from './local-workforce-provisioning.mjs';

const OPERATOR = 'operator';

async function main() {
  let session;
  try {
    session = await getPasswordSession(OPERATOR, 'runtime-bootstrap-verification');
  } catch (error) {
    const status = error?.status ?? 'unreachable';
    console.error(
      [
        'Identity local bootstrap has not converged.',
        `  authority: core/identity local bootstrap (IDENTITY_LOCAL_BOOTSTRAP)`,
        `  probe:     POST ${IDENTITY_API_BASE}/auth/login as "${OPERATOR}" -> ${status}`,
        '',
        'The canonical local actors are missing or hold credentials this runtime',
        'does not recognise. Identity converges them at startup and re-converges',
        'them while it serves, so this means Identity could not reach or repair',
        'its database. Inspect the identity-api logs and identity_actors before',
        'running any data repair downstream.',
        '',
        `  detail: ${error?.message ?? error}`,
      ].join('\n'),
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `Identity local bootstrap: PASS actor=${OPERATOR} subject=${session.identity.subject}`,
  );
}

await main();
