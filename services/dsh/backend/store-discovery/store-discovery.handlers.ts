import type { IncomingMessage, ServerResponse } from "node:http";
import type { Pool } from "pg";
import type { DshStoreListQuery } from "../../domain/store-discovery/store-discovery.types.js";
import {
  validateListQuery,
  rowToDetail,
} from "../../domain/store-discovery/store-discovery.policy.js";
import {
  DshInvalidParameterError,
  DshNotFoundError,
} from "../../domain/store-discovery/store-discovery.errors.js";
import { listStores, getStoreById } from "./store-discovery.repository.js";
import { sendJson, sendError, parseQuery } from "../runtime/http-helpers.js";

export async function handleListStores(
  req: IncomingMessage,
  res: ServerResponse,
  pool: Pool,
): Promise<void> {
  const qs = parseQuery(req.url ?? "");

  const rawLimit = qs.limit !== undefined ? parseInt(qs.limit, 10) : 20;
  const rawOffset = qs.offset !== undefined ? parseInt(qs.offset, 10) : 0;

  if (Number.isNaN(rawLimit) || Number.isNaN(rawOffset)) {
    throw new DshInvalidParameterError("limit and offset must be integers");
  }

  const isVisible =
    qs.isVisible === "true"
      ? true
      : qs.isVisible === "false"
        ? false
        : undefined;

  const query: DshStoreListQuery = {
    cityCode: qs.cityCode,
    serviceAreaCode: qs.serviceAreaCode,
    status: qs.status as DshStoreListQuery["status"],
    isVisible,
    limit: rawLimit,
    offset: rawOffset,
  };

  const validationError = validateListQuery(query);
  if (validationError !== null) {
    throw new DshInvalidParameterError(validationError);
  }

  const result = await listStores(pool, query);
  sendJson(res, 200, result);
}

export async function handleGetStore(
  req: IncomingMessage,
  res: ServerResponse,
  pool: Pool,
  storeId: string,
): Promise<void> {
  void req;
  if (!storeId || storeId.trim() === "") {
    throw new DshInvalidParameterError("storeId is required");
  }

  const row = await getStoreById(pool, storeId);
  if (row === null) {
    throw new DshNotFoundError("store", storeId);
  }

  sendJson(res, 200, { store: rowToDetail(row) });
}

export function wrapHandler(
  handler: (
    req: IncomingMessage,
    res: ServerResponse,
    pool: Pool,
    ...args: string[]
  ) => Promise<void>,
  pool: Pool,
  ...args: string[]
) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      await handler(req, res, pool, ...args);
    } catch (err) {
      sendError(res, err);
    }
  };
}
