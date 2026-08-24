// Verifies that the explicit one-shot local-development Identity bootstrap has
// converged before downstream development data flows depend on authenticated actors.
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
        'Identity local development bootstrap has not converged.',
        '  authority: one-shot identity-local-bootstrap service',
        `  probe:     POST ${IDENTITY_API_BASE}/auth/login as "${OPERATOR}" -> ${status}`,
        '',
        'The production-capable identity-api never creates or repairs these fixtures.',
        'Run the canonical local-development bootstrap path and inspect the one-shot',
        'identity-local-bootstrap logs plus identity_actors if convergence fails.',
        '',
        `  detail: ${error?.message ?? error}`,
      ].join('\n'),
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `Identity local development bootstrap: PASS actor=${OPERATOR} subject=${session.identity.subject}`,
  );
}

await main();
