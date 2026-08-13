-- DSH-999a: bind partner onboarding to the sovereign central catalog domain.
-- Legacy category remains readable for compatibility, but new lifecycle gates
-- use business_vertical_id and never allow an unresolved draft to publish.

ALTER TABLE dsh_partners
  ADD COLUMN IF NOT EXISTS business_vertical_id TEXT
    REFERENCES dsh_catalog_domains(id);

CREATE INDEX IF NOT EXISTS idx_dsh_partners_business_vertical
  ON dsh_partners(business_vertical_id);

UPDATE dsh_partners
SET business_vertical_id = CASE category
  WHEN 'restaurant' THEN 'domain-restaurants'
  WHEN 'grocery' THEN 'domain-groceries'
  WHEN 'bakery' THEN 'domain-groceries'
  WHEN 'pharmacy' THEN 'domain-pharmacy'
  ELSE NULL
END
WHERE business_vertical_id IS NULL;
