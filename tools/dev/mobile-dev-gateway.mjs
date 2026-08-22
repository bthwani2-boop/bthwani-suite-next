import crypto from 'node:crypto';
import http from 'node:http';
import { pathToFileURL } from 'node:url';

export const MOBILE_DEV_GATEWAY_CONTRACT_VERSION = 1;
export const MOBILE_DEV_GATEWAY_DEFAULT_PORT = 58110;
export const MOBILE_DEV_GATEWAY_SERVICE = 'bthwani-mobile-dev-gateway';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);
const REQUIRED_PRESIGN_QUERY_KEYS = [
  'x-amz-algorithm',
  'x-amz-credential',
  'x-amz-date',
  'x-amz-expires',
  'x-amz-signedheaders',
  'x-amz-signature',
];

const SERVICE_ROUTES = Object.freeze([
  { prefix: '/dsh/', host: '127.0.0.1', port: 58080 },
  { prefix: '/identity/', host: '127.0.0.1', port: 58082 },
  { prefix: '/workforce/', host: '127.0.0.1', port: 58086 },
]);

export function isPrivateIpv4(value) {
  const parts = String(value ?? '').trim().split('.');
  if (parts.length !== 4) return false;
  const octets = parts.map((part) => Number(part));
  if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (octets[0] === 10) return true;
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  return octets[0] === 192 && octets[1] === 168;
}

export function isPresignedMediaUrl(value) {
  let parsed;
  try {
    parsed = value instanceof URL ? value : new URL(String(value));
  } catch {
    return false;
  }
  const keys = new Set([...parsed.searchParams.keys()].map((key) => key.toLowerCase()));
  return REQUIRED_PRESIGN_QUERY_KEYS.every((key) => keys.has(key));
}

function stripPrefix(pathname, prefix) {
  const stripped = pathname.slice(prefix.length);
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

export function resolveGatewayRoute(rawUrl) {
  const parsed = new URL(rawUrl || '/', 'http://gateway.invalid');

  for (const route of SERVICE_ROUTES) {
    if (parsed.pathname.startsWith(route.prefix)) {
      return {
        kind: 'service',
        host: route.host,
        port: route.port,
        path: `${parsed.pathname}${parsed.search}`,
        requiresCapability: false,
      };
    }
  }

  if (parsed.pathname === '/__dev-session' || parsed.pathname.startsWith('/__dev-session/')) {
    return {
      kind: 'dev-session',
      host: '127.0.0.1',
      port: 58100,
      path: `${stripPrefix(parsed.pathname, '/__dev-session')}${parsed.search}`,
      requiresCapability: true,
    };
  }

  if (parsed.pathname === '/__media' || parsed.pathname.startsWith('/__media/')) {
    return {
      kind: 'media',
      host: '127.0.0.1',
      port: 59000,
      path: `${stripPrefix(parsed.pathname, '/__media')}${parsed.search}`,
      requiresCapability: false,
      presigned: isPresignedMediaUrl(parsed),
    };
  }

  return null;
}

function normalizeGatewayBaseUrl(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== 'http:') throw new Error('MOBILE_DEV_GATEWAY_BASE_MUST_USE_HTTP');
  if (!isPrivateIpv4(parsed.hostname)) throw new Error('MOBILE_DEV_GATEWAY_BASE_MUST_USE_PRIVATE_IPV4');
  return parsed.origin;
}

function parseSignedMediaHost(value) {
  const normalized = String(value || 'localhost:59000').trim();
  const parsed = new URL(`http://${normalized}`);
  if (!LOOPBACK_HOSTS.has(parsed.hostname) || parsed.port !== '59000') {
    throw new Error('MOBILE_DEV_GATEWAY_SIGNED_MEDIA_HOST_MUST_BE_LOOPBACK_59000');
  }
  return parsed.host;
}

export function rewritePresignedMediaLocation(location, gatewayBaseUrl, signedMediaHost = 'localhost:59000') {
  if (!location) return location;
  let parsed;
  try {
    parsed = new URL(location);
  } catch {
    return location;
  }
  const signedHost = parseSignedMediaHost(signedMediaHost);
  if (parsed.host !== signedHost || !isPresignedMediaUrl(parsed)) return location;
  const gateway = normalizeGatewayBaseUrl(gatewayBaseUrl);
  return `${gateway}/__media${parsed.pathname}${parsed.search}`;
}

function timingSafeTokenEqual(expected, provided) {
  const expectedBuffer = Buffer.from(String(expected ?? ''), 'utf8');
  const providedBuffer = Buffer.from(String(provided ?? ''), 'utf8');
  return expectedBuffer.length > 0
    && expectedBuffer.length === providedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

function copyRequestHeaders(headers, route, signedMediaHost) {
  const forwarded = {};
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower) || lower === 'host' || lower === 'x-bthwani-dev-capability') continue;
    if (value !== undefined) forwarded[name] = value;
  }
  if (route.kind === 'media') forwarded.host = signedMediaHost;
  return forwarded;
}

function copyResponseHeaders(headers, gatewayBaseUrl, signedMediaHost) {
  const forwarded = {};
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower) || value === undefined) continue;
    if (lower === 'location' && typeof value === 'string') {
      forwarded[name] = rewritePresignedMediaLocation(value, gatewayBaseUrl, signedMediaHost);
    } else {
      forwarded[name] = value;
    }
  }
  return forwarded;
}

function sendJson(res, statusCode, body) {
  const payload = `${JSON.stringify(body)}\n`;
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(payload);
}

function assertDevelopmentRuntime() {
  const mode = String(
    process.env.BTHWANI_RUNTIME_MODE
      || process.env.ENVIRONMENT
      || process.env.NODE_ENV
      || 'development',
  ).trim().toLowerCase();
  if (mode === 'production' || mode === 'prod') {
    throw new Error('MOBILE_DEV_GATEWAY_FORBIDDEN_IN_PRODUCTION');
  }
}

export function createMobileDevGateway(options = {}) {
  assertDevelopmentRuntime();

  const host = String(options.host ?? process.env.BTHWANI_MOBILE_DEV_GATEWAY_HOST ?? '').trim();
  const port = Number(options.port ?? process.env.BTHWANI_MOBILE_DEV_GATEWAY_PORT ?? MOBILE_DEV_GATEWAY_DEFAULT_PORT);
  const capability = String(options.capability ?? process.env.BTHWANI_MOBILE_DEV_GATEWAY_TOKEN ?? '').trim();
  const signedMediaHost = parseSignedMediaHost(
    options.signedMediaHost ?? process.env.BTHWANI_MOBILE_SIGNED_MEDIA_HOST ?? 'localhost:59000',
  );

  if (!isPrivateIpv4(host)) throw new Error('MOBILE_DEV_GATEWAY_HOST_MUST_BE_PRIVATE_IPV4');
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('MOBILE_DEV_GATEWAY_PORT_INVALID');
  if (capability.length < 32) throw new Error('MOBILE_DEV_GATEWAY_CAPABILITY_REQUIRED');

  const gatewayBaseUrl = `http://${host}:${port}`;

  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/__bthwani/health') {
      sendJson(res, 200, {
        status: 'healthy',
        service: MOBILE_DEV_GATEWAY_SERVICE,
        contractVersion: MOBILE_DEV_GATEWAY_CONTRACT_VERSION,
        pid: process.pid,
        host,
        port,
      });
      return;
    }

    const route = resolveGatewayRoute(req.url);
    if (!route) {
      sendJson(res, 404, { code: 'MOBILE_DEV_GATEWAY_ROUTE_NOT_ALLOWED' });
      return;
    }

    if (route.requiresCapability) {
      const provided = Array.isArray(req.headers['x-bthwani-dev-capability'])
        ? req.headers['x-bthwani-dev-capability'][0]
        : req.headers['x-bthwani-dev-capability'];
      if (!timingSafeTokenEqual(capability, provided)) {
        sendJson(res, 403, { code: 'MOBILE_DEV_GATEWAY_CAPABILITY_REQUIRED' });
        return;
      }
    }

    if (route.kind === 'media') {
      if (!['GET', 'HEAD', 'PUT'].includes(req.method || '')) {
        sendJson(res, 405, { code: 'MOBILE_DEV_GATEWAY_MEDIA_METHOD_NOT_ALLOWED' });
        return;
      }
      if (!route.presigned) {
        sendJson(res, 403, { code: 'MOBILE_DEV_GATEWAY_MEDIA_SIGNATURE_REQUIRED' });
        return;
      }
    }

    const upstream = http.request({
      hostname: route.host,
      port: route.port,
      method: req.method,
      path: route.path,
      headers: copyRequestHeaders(req.headers, route, signedMediaHost),
    }, (upstreamResponse) => {
      const headers = copyResponseHeaders(upstreamResponse.headers, gatewayBaseUrl, signedMediaHost);
      res.writeHead(upstreamResponse.statusCode || 502, headers);
      upstreamResponse.pipe(res);
    });

    upstream.setTimeout(120_000, () => {
      upstream.destroy(new Error('MOBILE_DEV_GATEWAY_UPSTREAM_TIMEOUT'));
    });
    upstream.on('error', () => {
      if (!res.headersSent) sendJson(res, 502, { code: 'MOBILE_DEV_GATEWAY_UPSTREAM_UNAVAILABLE' });
      else res.destroy();
    });
    req.pipe(upstream);
  });

  server.requestTimeout = 120_000;
  server.headersTimeout = 125_000;
  return { server, host, port, gatewayBaseUrl };
}

async function main() {
  const { server, host, port } = createMobileDevGateway();
  server.listen(port, host, () => {
    console.log(
      `${MOBILE_DEV_GATEWAY_SERVICE} v${MOBILE_DEV_GATEWAY_CONTRACT_VERSION} listening on http://${host}:${port}`,
    );
  });
}

const executedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (executedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
