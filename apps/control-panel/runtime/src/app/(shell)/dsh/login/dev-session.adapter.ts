import type { TokenResponse } from "@bthwani/core-identity";

function responseErrorCode(body: unknown): string {
  if (
    typeof body === "object"
    && body !== null
    && "code" in body
    && typeof (body as { code?: unknown }).code === "string"
  ) {
    return (body as { code: string }).code;
  }
  return "DEV_SESSION_BROKER_UNAVAILABLE";
}

function isTokenResponse(body: unknown): body is TokenResponse {
  if (typeof body !== "object" || body === null) return false;
  const candidate = body as Partial<TokenResponse>;
  return typeof candidate.accessToken === "string"
    && typeof candidate.refreshToken === "string"
    && typeof candidate.identity === "object"
    && candidate.identity !== null;
}

export async function requestControlPanelDevSession(): Promise<TokenResponse> {
  const response = await fetch("/api/auth/dev-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    signal: AbortSignal.timeout(8_000),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(responseErrorCode(body));
  if (!isTokenResponse(body)) throw new Error("DEV_SESSION_BINDING_INVALID");
  return body;
}
