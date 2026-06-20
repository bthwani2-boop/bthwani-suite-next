import type { ServerResponse } from "node:http";
import {
  DshDomainError,
  DshNotFoundError,
  DshInvalidParameterError,
} from "../../domain/store-discovery/store-discovery.errors.js";

export function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

export function sendError(res: ServerResponse, err: unknown): void {
  if (err instanceof DshNotFoundError) {
    sendJson(res, 404, { code: err.code, message: err.message });
    return;
  }
  if (err instanceof DshInvalidParameterError) {
    sendJson(res, 400, { code: err.code, message: err.message });
    return;
  }
  if (err instanceof DshDomainError) {
    sendJson(res, 500, { code: err.code, message: err.message });
    return;
  }
  console.error("[dsh-api] unhandled error:", err);
  sendJson(res, 500, { code: "INTERNAL_ERROR", message: "Internal error" });
}

export function parseQuery(url: string): Record<string, string> {
  const idx = url.indexOf("?");
  if (idx === -1) return {};
  const search = url.slice(idx + 1);
  const result: Record<string, string> = {};
  for (const part of search.split("&")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = decodeURIComponent(part.slice(0, eqIdx));
    const value = decodeURIComponent(part.slice(eqIdx + 1));
    result[key] = value;
  }
  return result;
}
