export function resolveVisualEvidenceRequestPath(input: RequestInfo | URL, origin: string): string {
  const candidate = typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

  try {
    return new URL(candidate, origin).pathname;
  } catch {
    return candidate.startsWith("/") ? candidate : `/${candidate}`;
  }
}
