declare const process:
  | { readonly env?: Readonly<Record<string, string | undefined>> }
  | undefined;

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const REQUIRED_PRESIGN_QUERY_KEYS = [
  "x-amz-algorithm",
  "x-amz-credential",
  "x-amz-date",
  "x-amz-expires",
  "x-amz-signedheaders",
  "x-amz-signature",
];
const DEFAULT_MINIO_API_PORT = "59000";

function readEnv(name: string): string {
  if (typeof process === "undefined" || !process.env) return "";
  return process.env[name]?.trim() ?? "";
}

function resolveMinioApiPort(): string {
  const configured = readEnv("EXPO_PUBLIC_BTHWANI_MINIO_API_PORT") || readEnv("BTHWANI_MINIO_API_PORT");
  const port = Number(configured || DEFAULT_MINIO_API_PORT);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("MOBILE_DEV_MINIO_API_PORT_INVALID");
  }
  return String(port);
}

function isPrivateIpv4(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  const octets = parts.map((part) => Number(part));
  if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const first = octets[0] ?? -1;
  const second = octets[1] ?? -1;
  if (first === 10) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  return first === 192 && second === 168;
}

function hasPresignedQuery(url: URL): boolean {
  const keys = new Set([...url.searchParams.keys()].map((key) => key.toLowerCase()));
  return REQUIRED_PRESIGN_QUERY_KEYS.every((key) => keys.has(key));
}

export function resolveMobileDevGatewayBaseUrl(): string | null {
  const configured = readEnv("EXPO_PUBLIC_BTHWANI_DEV_GATEWAY_BASE_URL");
  if (!configured) return null;

  const parsed = new URL(configured);
  if (parsed.protocol !== "http:" || !isPrivateIpv4(parsed.hostname)) {
    throw new Error("MOBILE_DEV_GATEWAY_BASE_URL_INVALID");
  }
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("MOBILE_DEV_GATEWAY_BASE_URL_MUST_BE_ORIGIN");
  }
  return parsed.origin;
}

export function resolveMobileDevGatewayCapability(): string | null {
  const gateway = resolveMobileDevGatewayBaseUrl();
  if (!gateway) return null;
  const capability = readEnv("EXPO_PUBLIC_BTHWANI_DEV_GATEWAY_TOKEN");
  if (capability.length < 32) throw new Error("MOBILE_DEV_GATEWAY_CAPABILITY_MISSING");
  return capability;
}

export function rewriteMobileDevPresignedMediaUrl(value: string): string {
  const gateway = resolveMobileDevGatewayBaseUrl();
  if (!gateway) return value;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return value;
  }

  const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
  if (
    parsed.protocol !== "http:"
    || !LOOPBACK_HOSTS.has(parsed.hostname)
    || port !== resolveMinioApiPort()
    || !hasPresignedQuery(parsed)
  ) {
    return value;
  }

  return `${gateway}/__media${parsed.pathname}${parsed.search}`;
}
