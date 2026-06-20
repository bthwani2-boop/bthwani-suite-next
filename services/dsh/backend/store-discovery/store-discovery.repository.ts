import type { Pool } from "pg";
import type {
  DshStoreRow,
  DshStoreListQuery,
  DshStoreListResult,
} from "../../domain/store-discovery/store-discovery.types.js";
import { rowToSummary } from "../../domain/store-discovery/store-discovery.policy.js";

export async function listStores(
  pool: Pool,
  query: DshStoreListQuery,
): Promise<DshStoreListResult> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (query.cityCode !== undefined) {
    conditions.push(`city_code = $${idx++}`);
    params.push(query.cityCode);
  }
  if (query.serviceAreaCode !== undefined) {
    conditions.push(`service_area_code = $${idx++}`);
    params.push(query.serviceAreaCode);
  }
  if (query.status !== undefined) {
    conditions.push(`status = $${idx++}`);
    params.push(query.status);
  }
  if (query.isVisible !== undefined) {
    conditions.push(`is_visible = $${idx++}`);
    params.push(query.isVisible);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM dsh_stores ${where}`,
    params,
  );
  const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

  const rows = await pool.query<DshStoreRow>(
    `SELECT * FROM dsh_stores ${where}
     ORDER BY rating_average DESC NULLS LAST, display_name ASC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, query.limit, query.offset],
  );

  return {
    stores: rows.rows.map(rowToSummary),
    pagination: { limit: query.limit, offset: query.offset, total },
  };
}

export async function getStoreById(
  pool: Pool,
  storeId: string,
): Promise<DshStoreRow | null> {
  const result = await pool.query<DshStoreRow>(
    "SELECT * FROM dsh_stores WHERE id = $1",
    [storeId],
  );
  return result.rows[0] ?? null;
}
