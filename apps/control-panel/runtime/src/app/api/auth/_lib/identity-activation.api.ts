import type { ActorIdentity } from "@bthwani/core-identity";

export type IdentityTokenResponse = {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly identity: ActorIdentity;
};

export type EmployeeAccessCodeActivationResult =
  | {
      readonly ok: true;
      readonly tokens: IdentityTokenResponse;
    }
  | {
      readonly ok: false;
      readonly status: number;
      readonly code: string;
    };

function isTokenResponse(value: unknown): value is IdentityTokenResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<IdentityTokenResponse>;
  return (
    typeof candidate.accessToken === "string" &&
    candidate.accessToken.trim().length > 0 &&
    typeof candidate.refreshToken === "string" &&
    candidate.refreshToken.trim().length > 0 &&
    typeof candidate.identity === "object" &&
    candidate.identity !== null
  );
}

export async function activateEmployeeAccessCode(input: {
  readonly baseUrl: string;
  readonly phone: string;
  readonly code: string;
}): Promise<EmployeeAccessCodeActivationResult> {
  let response: Response;
  try {
    response = await fetch(new URL("/auth/activate", input.baseUrl), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        actorType: "employee",
        phone: input.phone.trim(),
        code: input.code.trim(),
        deviceFingerprint: "control-panel-access-code",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { ok: false, status: 503, code: "IDENTITY_UNAVAILABLE" };
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as { code?: unknown };
    return {
      ok: false,
      status: response.status >= 400 ? response.status : 401,
      code: typeof errorBody.code === "string" && errorBody.code.trim()
        ? errorBody.code
        : "ACCESS_CODE_FAILED",
    };
  }

  const payload = await response.json().catch(() => null);
  if (!isTokenResponse(payload)) {
    return { ok: false, status: 502, code: "IDENTITY_INVALID_RESPONSE" };
  }
  return { ok: true, tokens: payload };
}
