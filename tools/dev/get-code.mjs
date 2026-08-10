import { randomUUID } from 'node:crypto';

import { LOCAL_ACTORS } from './local-actors.mjs';
import {
  WORKFORCE_API_BASE,
  authorization,
  getPasswordToken,
  getProvider,
  readGeneratedRegistry,
  requestJson,
} from './local-workforce-provisioning.mjs';

const VALID_ROLES = new Set(['field', 'captain']);

function usage() {
  return [
    'Usage: node tools/dev/get-code.mjs --role <field|captain> [--actor-id <id>] [--reveal-code]',
    '',
    'By default the activation code is not printed. Pass --reveal-code only in an interactive',
    'local development terminal when the plaintext code is explicitly required.',
    '',
    'When --actor-id is omitted, the actor is resolved from the generated local workforce registry.',
  ].join('\n');
}

function parseArgs(argv) {
  const result = {
    role: '',
    actorId: '',
    revealCode: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--reveal-code') {
      result.revealCode = true;
      continue;
    }
    if (arg === '--role' || arg === '--actor-id') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`${arg} requires a value`);
      }
      if (arg === '--role') result.role = value.trim().toLowerCase();
      if (arg === '--actor-id') result.actorId = value.trim();
      index += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    }
    throw new Error(`unknown argument: ${arg}`);
  }

  if (!VALID_ROLES.has(result.role)) {
    throw new Error('--role must be either field or captain');
  }
  return result;
}

function endpointFor(role) {
  return role === 'field' ? 'field-agents' : 'captains';
}

function registryActorId(role) {
  const registry = readGeneratedRegistry();
  if (!registry) return '';
  if (role === 'field') return String(registry.FIELD_ACTOR_ID || registry.actors?.field?.actorId || '').trim();
  return String(registry.CAPTAIN_ACTOR_ID || registry.actors?.captain?.actorId || '').trim();
}

async function issueCode({ role, actorId, revealCode }) {
  const resolvedActorId = actorId || registryActorId(role);
  if (!resolvedActorId) {
    throw new Error(
      `no ${role} actor id was supplied and the generated local workforce registry has no ${role} actor; ` +
        'run the governed local workforce provisioning flow first or pass --actor-id explicitly',
    );
  }

  const operatorToken = await getPasswordToken(LOCAL_ACTORS.operator.username);
  const detail = await getProvider(operatorToken, role, resolvedActorId);
  if (!Number.isInteger(detail?.version) || detail.version < 0) {
    throw new Error(`workforce:get-${role} returned an invalid version for actor ${resolvedActorId}`);
  }

  const attempt = randomUUID();
  const issued = await requestJson(
    `workforce:${role}:issue-activation`,
    `${WORKFORCE_API_BASE}/workforce/${endpointFor(role)}/${encodeURIComponent(resolvedActorId)}/activation-codes`,
    {
      method: 'POST',
      headers: {
        ...authorization(operatorToken),
        'Content-Type': 'application/json',
        'Idempotency-Key': `mobile-dev-${role}-activation-${attempt}`,
        'X-Correlation-ID': `mobile-dev-${role}-activation-${attempt}`,
      },
      body: JSON.stringify({ expectedVersion: detail.version }),
    },
  );

  if (!issued?.code) {
    throw new Error(`workforce:${role}:issue-activation returned no code`);
  }

  process.stdout.write(`Activation code issued for ${role} actor ${resolvedActorId}.\n`);
  if (revealCode) {
    process.stdout.write(`ACTIVATION_CODE=${issued.code}\n`);
  } else {
    process.stdout.write('Plaintext code suppressed. Re-run with --reveal-code only when explicit local disclosure is required.\n');
  }
}

try {
  await issueCode(parseArgs(process.argv.slice(2)));
} catch (error) {
  process.stderr.write(`get-code failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.stderr.write(`${usage()}\n`);
  process.exitCode = 1;
}
