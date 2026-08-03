-- DSH-972: retire local financial truth and retain only WLT decision projection.
-- This forward-only migration removes wallet, balance, currency, and threshold
-- authority introduced by DSH-099 without rewriting immutable history.

ALTER TABLE dsh_captain_financial_eligibility
  ADD COLUMN IF NOT EXISTS wlt_decision_id text,
  ADD COLUMN IF NOT EXISTS reason_code text,
  ADD COLUMN IF NOT EXISTS policy_version text,
  ADD COLUMN IF NOT EXISTS evaluated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_financial_sync_at timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dsh_captain_financial_eligibility'
      AND column_name = 'snapshot_reference'
  ) THEN
    EXECUTE $sql$
      UPDATE dsh_captain_financial_eligibility
      SET
        wlt_decision_id = COALESCE(NULLIF(btrim(wlt_decision_id), ''), 'legacy-dsh-099:' || snapshot_reference),
        reason_code = COALESCE(
          NULLIF(btrim(reason_code), ''),
          NULLIF(btrim(ineligibility_reason), ''),
          CASE WHEN eligible THEN 'LEGACY_WLT_DECISION_ELIGIBLE' ELSE 'LEGACY_WLT_DECISION_INELIGIBLE' END
        ),
        policy_version = COALESCE(NULLIF(btrim(policy_version), ''), 'legacy-dsh-099-retired'),
        evaluated_at = COALESCE(evaluated_at, checked_at),
        last_financial_sync_at = COALESCE(last_financial_sync_at, checked_at)
    $sql$;
  END IF;
END
$$;

UPDATE dsh_captain_financial_eligibility
SET
  wlt_decision_id = COALESCE(NULLIF(btrim(wlt_decision_id), ''), 'legacy-dsh-projection:' || captain_id),
  reason_code = COALESCE(
    NULLIF(btrim(reason_code), ''),
    CASE WHEN eligible THEN 'WLT_DECISION_ELIGIBLE' ELSE 'WLT_DECISION_INELIGIBLE' END
  ),
  policy_version = COALESCE(NULLIF(btrim(policy_version), ''), 'unknown'),
  evaluated_at = COALESCE(evaluated_at, now()),
  last_financial_sync_at = COALESCE(last_financial_sync_at, now());

ALTER TABLE dsh_captain_financial_eligibility
  ALTER COLUMN wlt_decision_id SET NOT NULL,
  ALTER COLUMN reason_code SET NOT NULL,
  ALTER COLUMN policy_version SET NOT NULL,
  ALTER COLUMN evaluated_at SET NOT NULL,
  ALTER COLUMN last_financial_sync_at SET NOT NULL;

ALTER TABLE dsh_captain_financial_eligibility
  DROP COLUMN IF EXISTS wallet_id,
  DROP COLUMN IF EXISTS wallet_status,
  DROP COLUMN IF EXISTS available_balance_minor_units,
  DROP COLUMN IF EXISTS minimum_dispatch_balance_minor_units,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS ineligibility_reason,
  DROP COLUMN IF EXISTS snapshot_reference,
  DROP COLUMN IF EXISTS checked_at;

DROP TABLE IF EXISTS dsh_platform_dispatch_balance_policy;

CREATE OR REPLACE FUNCTION dsh_financial_snapshot_is_eligible(
  requested_operator_context_id text,
  requested_captain_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((
    SELECT eligible AND expires_at > now()
    FROM dsh_captain_financial_eligibility
    WHERE operator_context_id = requested_operator_context_id
      AND captain_id = requested_captain_id
  ), false);
$$;

COMMENT ON TABLE dsh_captain_financial_eligibility IS
  'Short-lived operational projection of an opaque WLT dispatch financial decision; contains no balance, currency, threshold, wallet status, or financial policy inputs.';
