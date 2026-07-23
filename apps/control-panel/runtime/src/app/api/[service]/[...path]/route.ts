import type { NextRequest } from "next/server";
import {
  proxyControlPanelRequest,
  type ControlPanelBffService,
} from "../../../../server/bff-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DSH, Workforce, Providers and Platform Control have explicit static BFF
// routes that share one authenticated refresh/reauthorization proxy. The
// dynamic route is deliberately limited to Identity and read-only WLT
// reference projections so a missing static route cannot degrade into a broad
// browser-to-service proxy.
const allowedPathPrefixes = {
  identity: new Set(["auth", "identity"]),
  wlt: new Set(["wlt"]),
} satisfies Partial<Record<ControlPanelBffService, ReadonlySet<string>>>;

type DynamicBffService = keyof typeof allowedPathPrefixes;

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
  if (!Object.hasOwn(allowedPathPrefixes, service)) {
    return jsonNotFound("BFF_SERVICE_NOT_ALLOWED", "Unknown BFF service.");
  }

  const typedService = service as DynamicBffService;
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

  return proxyControlPanelRequest(
    request,
    typedService as ControlPanelBffService,
    path,
  );
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
