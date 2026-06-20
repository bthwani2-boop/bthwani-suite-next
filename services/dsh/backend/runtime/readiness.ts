import type { ServerResponse } from "node:http";
import type { Pool } from "pg";
import { sendJson } from "./http-helpers.js";

export async function handleReadiness(
  res: ServerResponse,
  pool: Pool,
): Promise<void> {
  let dbStatus: "ready" | "down" = "down";

  try {
    await pool.query("SELECT 1");
    dbStatus = "ready";
  } catch {
    dbStatus = "down";
  }

  const overallStatus = dbStatus === "ready" ? "ready" : "not_ready";
  const httpStatus = overallStatus === "ready" ? 200 : 503;

  sendJson(res, httpStatus, {
    service: "dsh",
    status: overallStatus,
    dependencies: { postgres: dbStatus },
    checkedAt: new Date().toISOString(),
  });
}
