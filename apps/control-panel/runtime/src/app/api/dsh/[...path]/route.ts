import { proxyAuthenticatedUpstream } from "../../adapters/upstream-proxy.adapter";
import { resolveDshServerBaseUrl } from "../../auth/_lib/env";

export const runtime = "nodejs";

async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await context.params;
  return proxyAuthenticatedUpstream(request, path, resolveDshServerBaseUrl());
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
