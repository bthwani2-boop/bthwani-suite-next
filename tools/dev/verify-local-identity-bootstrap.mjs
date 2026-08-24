// Asserts that the explicit development identity seed has completed, immediately
// after the runtime's APIs report ready and before anything downstream depends
// on an authenticated operator.
//
// Without this gate the real failure — Identity serving against a database with
// no canonical actors — surfaced three layers later as a bare
// `INVALID_CREDENTIALS` from mobile-dev-data, which names neither the authority
// that failed nor the state that caused it.
import { getPasswordSession, IDENTITY_API_BASE } from './local-workforce-provisioning.mjs';
import { LOCAL_ACTORS } from './local-actors.mjs';

const OPERATOR = LOCAL_ACTORS.operator.username;

async function main() {
  let session;
  try {
    session = await getPasswordSession(OPERATOR, 'runtime-bootstrap-verification');
  } catch (error) {
    const status = error?.status ?? 'unreachable';
    console.error(
      [
        'Identity development seed has not converged.',
        '  authority: explicit identity-local-bootstrap development executable',
        `  probe:     POST ${IDENTITY_API_BASE}/auth/login as "${OPERATOR}" -> ${status}`,
        '',
        'The canonical local actors are missing or hold credentials this runtime',
        'does not recognise. The production identity-api never creates or repairs',
        'these actors. Run the explicit development seed phase and inspect its',
        'logs and identity_actors before',
        'running any data repair downstream.',
        '',
        `  detail: ${error?.message ?? error}`,
      ].join('\n'),
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `Identity development seed: PASS actor=${OPERATOR} subject=${session.identity.subject}`,
  );
}

await main();
