-- Local-only DSH seed contract.
-- Runs only after the canonical seed runner has completed.

DO $$
BEGIN
  IF to_regclass('public.runtime_seed_runs') IS NULL THEN
    RAISE EXCEPTION 'runtime_seed_runs ledger is missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM runtime_seed_runs) THEN
    RAISE EXCEPTION 'runtime_seed_runs contains no executed local seeds';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM runtime_seed_runs
    WHERE checksum !~ '^[0-9a-f]{64}$'
       OR run_count < 1
  ) THEN
    RAISE EXCEPTION 'runtime_seed_runs contains an invalid checksum or run count';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM dsh_stores
    WHERE id = 'store-test-grocery'
      AND tenant_id = 'local-dsh'
  ) THEN
    RAISE EXCEPTION 'canonical local grocery store seed is missing or tenant ownership drifted';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM dsh_partners
    WHERE id = 'prt_partner_local_001'
      AND tenant_id = 'local-dsh'
  ) THEN
    RAISE EXCEPTION 'canonical local partner seed is missing or tenant ownership drifted';
  END IF;

  IF EXISTS (
    SELECT 1 FROM dsh_stores
    WHERE tenant_id IS NULL OR btrim(tenant_id) = ''
  ) THEN
    RAISE EXCEPTION 'local store seeds created unowned tenant rows';
  END IF;

  IF EXISTS (
    SELECT 1 FROM dsh_partners
    WHERE tenant_id IS NULL OR btrim(tenant_id) = ''
  ) THEN
    RAISE EXCEPTION 'local partner seeds created unowned tenant rows';
  END IF;
END
$$;
