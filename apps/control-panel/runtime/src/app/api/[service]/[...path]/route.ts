import type { NextRequest } from "next/server";
import {
  proxyControlPanelRequest,
  type ControlPanelBffService,
} from "../../../../server/bff-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedServices = new Set<ControlPanelBffService>([
  "dsh",
  "identity",
  "wlt",
  "workforce",
  "providers",
  "platform-control",
]);

type RouteContext = {
  params: Promise<{
    service: string;
    path: string[];
  }>;
};

async function handle(request: NextRequest, context: RouteContext) {
  const { service, path } = await context.params;
  if (!allowedServices.has(service as ControlPanelBffService)) {
    return Response.json(
      { code: "BFF_SERVICE_NOT_ALLOWED", message: "Unknown BFF service." },
      { status: 404 },
    );
  }
  return proxyControlPanelRequest(
    request,
    service as ControlPanelBffService,
    path,
  );
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
