export function resolveVisualEvidenceRequestPath(
  input: RequestInfo | URL,
  origin: string,
): string {
  const raw = typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;
  return new URL(raw, origin).pathname;
}
