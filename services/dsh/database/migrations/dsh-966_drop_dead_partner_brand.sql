-- DSH-966 corrected pre-release migration: preserve governed partner-brand truth.
--
-- The original destructive migration assumed dsh_stores.brand_id was never
-- populated. Runtime verification disproved that assumption: valid stores are
-- linked to valid, operator-context-scoped partner brands. Deleting those rows
-- or their ownership relation would destroy commercial data. This corrected
-- migration therefore verifies the existing invariant and performs no drop.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM dsh_partner_brands b
      LEFT JOIN dsh_partners p ON p.id = b.partner_id
     WHERE p.id IS NULL
        OR p.operator_context_id <> b.operator_context_id
  ) THEN
    RAISE EXCEPTION 'dsh-966: partner-brand ownership invariant failed';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM dsh_stores s
      JOIN dsh_partner_brands b ON b.id = s.brand_id
     WHERE s.brand_id IS NOT NULL
       AND (
         s.partner_id IS NULL
         OR b.partner_id <> s.partner_id
         OR b.operator_context_id <> s.operator_context_id
       )
  ) THEN
    RAISE EXCEPTION 'dsh-966: store-brand ownership invariant failed';
  END IF;
END $$;

COMMENT ON TABLE dsh_partner_brands IS
  'Governed optional commercial identity owned by a partner within one trusted operator context.';
