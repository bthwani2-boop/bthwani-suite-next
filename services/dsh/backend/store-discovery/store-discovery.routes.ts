import type { IncomingMessage, ServerResponse } from "node:http";
import type { Pool } from "pg";
import {
  handleListStores,
  handleGetStore,
  wrapHandler,
} from "./store-discovery.handlers.js";

const STORE_ID_PATTERN = /^\/dsh\/stores\/([^/]+)$/;

export function registerStoreDiscoveryRoutes(
  pool: Pool,
): (
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
) => boolean {
  const listHandler = wrapHandler(handleListStores, pool);
  const getHandler = (storeId: string) =>
    wrapHandler(handleGetStore, pool, storeId);

  return (req, res, pathname) => {
    if (pathname === "/dsh/stores" && req.method === "GET") {
      void listHandler(req, res);
      return true;
    }

    const match = STORE_ID_PATTERN.exec(pathname);
    if (match !== null && req.method === "GET") {
      const storeId = decodeURIComponent(match[1] ?? "");
      void getHandler(storeId)(req, res);
      return true;
    }

    return false;
  };
}
