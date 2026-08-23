import http from 'node:http';

import { LOCAL_ACTORS, LOCAL_WORKFORCE_PROVIDERS } from './local-actors.mjs';
import {
  IDENTITY_API_BASE,
  WORKFORCE_API_BASE,
  getPasswordSession,
  getPasswordToken,
  issueProviderSession,
  readGeneratedRegistry,
  provisionLocalWorkforceActors,
  HttpError,
} from './local-workforce-provisioning.mjs';

const PORT = Number(process.env.BTHWANI_DEV_SESSION_BROKER_PORT || 18100);
const HOST = '127.0.0.1';
const BROKER_CONTRACT_VERSION = 2;
const MAX_BODY_BYTES = 16 * 1024;
const ROLE_SURFACE = Object.freeze({
  operator: 'control-panel',
  client: 'app-client',
  partner: 'app-partner',
  field: 'app-field',
  captain: 'app-captain',
});

function assertLoopbackUrl(name, value) {
  const parsed = new URL(value);
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
    throw new Error(`${name}_MUST_BE_LOOPBACK_FOR_DEV_SESSION_BROKER`);
  }
}

function assertLocalOnlyRuntime() {
  const mode = String(
    process.env.BTHWANI_RUNTIME_MODE
      || process.env.ENVIRONMENT
      || process.env.NODE_ENV
      || 'development',
  ).trim().toLowerCase();

  if (mode === 'production' || mode === 'prod') {
    throw new Error('LOCAL_DEV_SESSION_BROKER_FORBIDDEN_IN_PRODUCTION');
  }

  assertLoopbackUrl('IDENTITY_API_BASE', IDENTITY_API_BASE);
  assertLoopbackUrl('WORKFORCE_API_BASE', WORKFORCE_API_BASE);
}

function isLoopbackPeer(address) {
  return address === '127.0.0.1'
    || address === '::1'
    || address === '::ffff:127.0.0.1';
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(`${JSON.stringify(body)}\n`);
}

async function readJson(req) {
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error('REQUEST_TOO_LARGE');
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

async function createSessionForRole(role, surface, deviceFingerprint) {
  const expectedSurface = ROLE_SURFACE[role];
  if (!expectedSurface || surface !== expectedSurface) {
    throw new Error('DEV_SESSION_ROLE_SURFACE_MISMATCH');
  }
  if (typeof deviceFingerprint !== 'string' || !deviceFingerprint.trim()) {
    throw new Error('DEV_SESSION_DEVICE_FINGERPRINT_REQUIRED');
  }

  let pair;
  if (role === 'operator' || role === 'client' || role === 'partner') {
    pair = await getPasswordSession(
      LOCAL_ACTORS[role].username,
      deviceFingerprint.trim(),
    );
  } else {
    let registry = readGeneratedRegistry();
    let provisioned = registry?.actors?.[role];
    const operatorToken = await getPasswordToken(LOCAL_ACTORS.operator.username);

    if (provisioned?.actorId) {
      try {
        pair = await issueProviderSession(
          operatorToken,
          role,
          provisioned.actorId,
          LOCAL_WORKFORCE_PROVIDERS[role].phoneE164,
          deviceFingerprint.trim(),
        );
      } catch (error) {
        if (error instanceof HttpError && error.status === 404 && error.message.includes('ACTOR_NOT_FOUND')) {
          provisioned = null;
        } else {
          throw error;
        }
      }
    }

    if (!provisioned?.actorId) {
      console.log(`[local-dev-session-broker] Auto-provisioning workforce actors for wiped database...`);
      const { actors } = await provisionLocalWorkforceActors(operatorToken);
      provisioned = actors[role];
      if (!provisioned?.actorId) {
        throw new Error(`DEV_SESSION_${role.toUpperCase()}_NOT_PROVISIONED`);
      }
      pair = await issueProviderSession(
        operatorToken,
        role,
        provisioned.actorId,
        LOCAL_WORKFORCE_PROVIDERS[role].phoneE164,
        deviceFingerprint.trim(),
      );
    }
  }

  if (!pair?.identity?.roles?.includes(role)) {
    throw new Error('DEV_SESSION_ROLE_BINDING_INVALID');
  }
  if (pair.identity.surfaceAccess?.[surface] !== true) {
    throw new Error('DEV_SESSION_SURFACE_ACCESS_INVALID');
  }
  if (pair.identity.sessionSurface !== surface) {
    throw new Error('DEV_SESSION_SURFACE_BINDING_INVALID');
  }

  return pair;
}

assertLocalOnlyRuntime();

const server = http.createServer(async (req, res) => {
  if (!isLoopbackPeer(req.socket.remoteAddress)) {
    sendJson(res, 403, { code: 'DEV_SESSION_LOOPBACK_REQUIRED' });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, {
      status: 'healthy',
      service: 'local-dev-session-broker',
      contractVersion: BROKER_CONTRACT_VERSION,
      pid: process.pid,
    });
    return;
  }

  if (req.method !== 'POST' || req.url !== '/session') {
    sendJson(res, 404, { code: 'NOT_FOUND' });
    return;
  }

  try {
    const body = await readJson(req);
    const pair = await createSessionForRole(
      body.role,
      body.surface,
      body.deviceFingerprint,
    );
    sendJson(res, 200, pair);
  } catch (error) {
    sendJson(res, 422, {
      code: error instanceof Error ? error.message : 'DEV_SESSION_FAILED',
      message: 'local development session could not be created',
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Local development session broker v${BROKER_CONTRACT_VERSION} listening on http://${HOST}:${PORT}`);
});