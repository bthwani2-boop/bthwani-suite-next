import { proxyControlPanelRequest } from "../../../../server/bff-proxy";

export const runtime = "nodejs";

async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await context.params;
  return proxyControlPanelRequest(request, "workforce", path);
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
