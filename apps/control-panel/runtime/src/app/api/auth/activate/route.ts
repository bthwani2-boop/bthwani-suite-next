import { NextResponse } from "next/server";
import { isSameOriginRequest, setSessionCookies } from "../_lib/cookies";
import { resolveIdentityServerBaseUrl } from "../_lib/env";
import { activateEmployeeAccessCode } from "../_lib/identity-activation.api";

export const runtime = "nodejs";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAccessCode(value: unknown): value is string {
  return typeof value === "string" && /^\d{6}$/.test(value.trim());
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ code: "CROSS_ORIGIN_REJECTED" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "INVALID_BODY" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !isNonEmptyString((body as Record<string, unknown>).phone) ||
    !isAccessCode((body as Record<string, unknown>).code)
  ) {
    return NextResponse.json({ code: "INVALID_ACCESS_CODE_PAYLOAD" }, { status: 400 });
  }

  const { phone, code } = body as { phone: string; code: string };
  const baseUrl = resolveIdentityServerBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      { code: "IDENTITY_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const activation = await activateEmployeeAccessCode({ baseUrl, phone, code });
  if (!activation.ok) {
    return NextResponse.json(
      { code: activation.code },
      {
        status: activation.status,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const { tokens } = activation;
  if (!tokens.identity.roles.includes("operator")) {
    return NextResponse.json(
      { code: "CONTROL_PANEL_FORBIDDEN" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const response = NextResponse.json(
    { identity: tokens.identity },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
  setSessionCookies(response, tokens);
  return response;
}
