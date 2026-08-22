-- DSH-1020: durable first-store identity for the field onboarding journey.
-- Partner-to-store remains one-to-many. This table names only the store that
-- owns the first-store onboarding contract; no consumer may infer it by order.

CREATE TABLE IF NOT EXISTS dsh_partner_first_stores (
  partner_id TEXT PRIMARY KEY REFERENCES dsh_partners(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL UNIQUE REFERENCES dsh_stores(id) ON DELETE CASCADE,
  operator_context_id TEXT NOT NULL CHECK (btrim(operator_context_id) <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_first_stores_context
  ON dsh_partner_first_stores(operator_context_id, partner_id);

-- Historical backfill is deliberately limited to an unambiguous one-store
-- relationship. Multi-store partners receive no guessed identity and remain
-- fail-closed until an explicit first-store reference is governed.
INSERT INTO dsh_partner_first_stores(partner_id, store_id, operator_context_id)
SELECT p.id, min(s.id), p.operator_context_id
FROM dsh_partners p
JOIN dsh_stores s
  ON s.partner_id = p.id
 AND s.operator_context_id = p.operator_context_id
GROUP BY p.id, p.operator_context_id
HAVING COUNT(*) = 1
ON CONFLICT (partner_id) DO NOTHING;
