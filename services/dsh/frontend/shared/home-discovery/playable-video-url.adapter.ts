function isPrivateDevelopmentHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;
  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname)) return true;
  const match = /^172\.(\d+)\./.exec(hostname);
  if (!match) return false;
  const secondOctet = Number.parseInt(match[1] ?? "0", 10);
  return secondOctet >= 16 && secondOctet <= 31;
}

/**
 * Validates a reel URL at the shared transport boundary. Production media must
 * use HTTPS; plain HTTP is accepted only for loopback and RFC1918 development
 * hosts so surfaces never own URL parsing or environment exceptions.
 */
export function isPlayableVideoUrl(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) return false;
  try {
    const url = new URL(normalized);
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && isPrivateDevelopmentHost(url.hostname);
  } catch {
    return false;
  }
}
