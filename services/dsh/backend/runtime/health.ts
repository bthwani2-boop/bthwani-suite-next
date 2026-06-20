import type { ServerResponse } from "node:http";
import { sendJson } from "./http-helpers.js";

export function handleHealth(res: ServerResponse): void {
  sendJson(res, 200, {
    service: "dsh",
    status: "healthy",
    checkedAt: new Date().toISOString(),
  });
}
