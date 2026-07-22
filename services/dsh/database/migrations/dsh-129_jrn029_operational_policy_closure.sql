-- JRN-029: zones, SLA, capacity and fulfillment-mode closure.
-- Service-area geofences remain the spatial truth. This migration only adds
-- operational decision data and append-only rollback-compatible audit support.

BEGIN;

ALTER TABLE dsh_platform_sla_rules
  ADD COLUMN IF NOT EXISTS max_assignment_mins INTEGER NOT NULL DEFAULT 10;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dsh_platform_sla_rules'::regclass
      AND conname = 'dsh_platform_sla_assignment_bounds'
  ) THEN
    ALTER TABLE dsh_platform_sla_rules
      ADD CONSTRAINT dsh_platform_sla_assignment_bounds
      CHECK (max_assignment_mins BETWEEN 1 AND 1440) NOT VALID;
  END IF;
END $$;
ALTER TABLE dsh_platform_sla_rules
  VALIDATE CONSTRAINT dsh_platform_sla_assignment_bounds;

ALTER TABLE dsh_platform_capacity_configs
  ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pause_reason TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dsh_platform_capacity_configs'::regclass
      AND conname = 'dsh_platform_capacity_pause_reason_length'
  ) THEN
    ALTER TABLE dsh_platform_capacity_configs
      ADD CONSTRAINT dsh_platform_capacity_pause_reason_length
      CHECK (char_length(pause_reason) <= 500) NOT VALID;
  END IF;
END $$;
ALTER TABLE dsh_platform_capacity_configs
  VALIDATE CONSTRAINT dsh_platform_capacity_pause_reason_length;

CREATE TABLE IF NOT EXISTS dsh_platform_delivery_mode_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES dsh_platform_zones(id) ON DELETE RESTRICT,
  fulfillment_mode TEXT NOT NULL CHECK (
    fulfillment_mode IN ('bthwani_delivery', 'partner_delivery', 'client_pickup')
  ),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sla_category TEXT NOT NULL DEFAULT 'default'
    CHECK (char_length(btrim(sla_category)) BETWEEN 1 AND 120),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  updated_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (zone_id, fulfillment_mode)
);

CREATE INDEX IF NOT EXISTS idx_dsh_platform_delivery_modes_zone_enabled
  ON dsh_platform_delivery_mode_policies(zone_id, is_enabled, fulfillment_mode);

INSERT INTO dsh_platform_delivery_mode_policies
  (zone_id, fulfillment_mode, is_enabled, sla_category, updated_by)
SELECT z.id, mode.fulfillment_mode, TRUE, 'default', 'migration:dsh-129'
FROM dsh_platform_zones z
CROSS JOIN (
  VALUES ('bthwani_delivery'), ('partner_delivery'), ('client_pickup')
) AS mode(fulfillment_mode)
ON CONFLICT (zone_id, fulfillment_mode) DO NOTHING;

ALTER TABLE dsh_platform_policy_events
  DROP CONSTRAINT IF EXISTS dsh_platform_policy_events_aggregate_type_check,
  DROP CONSTRAINT IF EXISTS dsh_platform_policy_events_action_check,
  DROP CONSTRAINT IF EXISTS dsh_platform_policy_events_aggregate_type_allowed,
  DROP CONSTRAINT IF EXISTS dsh_platform_policy_events_action_allowed;

ALTER TABLE dsh_platform_policy_events
  ADD CONSTRAINT dsh_platform_policy_events_aggregate_type_allowed CHECK (
    aggregate_type IN (
      'zone',
      'sla_rule',
      'capacity_config',
      'delivery_mode',
      'store_onboarding_fee'
    )
  ),
  ADD CONSTRAINT dsh_platform_policy_events_action_allowed CHECK (
    action IN ('created', 'updated', 'activated', 'deactivated', 'rolled_back')
  );

CREATE INDEX IF NOT EXISTS idx_dsh_platform_policy_events_correlation
  ON dsh_platform_policy_events(correlation_id, created_at DESC)
  WHERE correlation_id IS NOT NULL;

COMMIT;
