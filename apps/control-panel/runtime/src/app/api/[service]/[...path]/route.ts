import type { NextRequest } from "next/server";
import {
  proxyControlPanelRequest,
  type ControlPanelBffService,
} from "../../../../server/bff-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedPathPrefixes: Record<
  ControlPanelBffService,
  ReadonlySet<string>
> = {
  dsh: new Set(["dsh"]),
  identity: new Set(["auth", "identity"]),
  wlt: new Set(["wlt"]),
  workforce: new Set(["workforce"]),
  providers: new Set(["providers"]),
  "platform-control": new Set(["platform"]),
};

type RouteContext = {
  params: Promise<{
    service: string;
    path: string[];
  }>;
};

function jsonNotFound(code: string, message: string): Response {
  return Response.json({ code, message }, { status: 404 });
}

async function handle(request: NextRequest, context: RouteContext) {
  const { service, path } = await context.params;
  if (!(service in allowedPathPrefixes)) {
    return jsonNotFound("BFF_SERVICE_NOT_ALLOWED", "Unknown BFF service.");
  }

  const typedService = service as ControlPanelBffService;
  const unsafeSegment = path.some(
    (segment) => segment.length === 0 || segment === "." || segment === "..",
  );
  if (
    path.length === 0 ||
    unsafeSegment ||
    !allowedPathPrefixes[typedService].has(path[0] ?? "")
  ) {
    return jsonNotFound(
      "BFF_PATH_NOT_ALLOWED",
      "The requested path is outside the governed service namespace.",
    );
  }

  return proxyControlPanelRequest(request, typedService, path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
