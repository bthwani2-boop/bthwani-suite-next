-- DSH-952: dsh_partners is missing the archived_at soft-archive column that
-- clientEligibleStorePredicate (homediscovery/repository.go) has queried
-- since it was introduced; every home-discovery query joining dsh_partners
-- has been failing with "column p.archived_at does not exist".

ALTER TABLE dsh_partners
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dsh_partners_archived_at
  ON dsh_partners (archived_at)
  WHERE archived_at IS NOT NULL;
