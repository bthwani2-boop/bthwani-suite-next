-- DSH-1078: make pickup and partner-delivery SLA stage budgets governed
-- operational-policy data. Existing runtime defaults are preserved once as
-- migration data; application code must read these values from the policy row.

BEGIN;

ALTER TABLE dsh_platform_sla_rules
  ADD COLUMN IF NOT EXISTS warning_before_mins INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS pickup_notify_mins INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS pickup_arrival_mins INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS pickup_verify_mins INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS delivery_assign_to_pickup_mins INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS delivery_pickup_to_depart_mins INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS delivery_depart_to_arrive_mins INTEGER NOT NULL DEFAULT 45,
  ADD COLUMN IF NOT EXISTS delivery_arrive_to_proof_mins INTEGER NOT NULL DEFAULT 15;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dsh_platform_sla_rules'::regclass
      AND conname = 'dsh_platform_sla_stage_bounds'
  ) THEN
    ALTER TABLE dsh_platform_sla_rules
      ADD CONSTRAINT dsh_platform_sla_stage_bounds CHECK (
        warning_before_mins BETWEEN 1 AND 1440
        AND pickup_notify_mins BETWEEN 1 AND 1440
        AND pickup_arrival_mins BETWEEN 1 AND 1440
        AND pickup_verify_mins BETWEEN 1 AND 1440
        AND delivery_assign_to_pickup_mins BETWEEN 1 AND 1440
        AND delivery_pickup_to_depart_mins BETWEEN 1 AND 1440
        AND delivery_depart_to_arrive_mins BETWEEN 1 AND 1440
        AND delivery_arrive_to_proof_mins BETWEEN 1 AND 1440
      ) NOT VALID;
  END IF;
END $$;

ALTER TABLE dsh_platform_sla_rules
  VALIDATE CONSTRAINT dsh_platform_sla_stage_bounds;

COMMIT;
