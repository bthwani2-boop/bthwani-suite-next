-- DSH-972: remove DSH-owned financial eligibility truth.
-- WLT owns balances, wallet status, financial thresholds, currency, and policy.
-- DSH keeps only a short-lived WLT decision reference for dispatch gating.

DROP TRIGGER IF EXISTS trg_dsh_assignment_captain_financial_eligibility
  ON dsh_assignments;
DROP TRIGGER IF EXISTS trg_dsh_governed_acceptance_financial_eligibility
  ON dsh_assignments;
DROP TRIGGER IF EXISTS trg_dsh_governed_offer_financial_eligibility
  ON dsh_assignments;

DROP TABLE IF EXISTS dsh_platform_dispatch_balance_policy;

ALTER TABLE dsh_captain_financial_eligibility
  ADD COLUMN IF NOT EXISTS wlt_decision_id text,
  ADD COLUMN IF NOT EXISTS wlt_reason_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS wlt_policy_version text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS evaluated_at timestamptz NOT NULL DEFAULT now();

UPDATE dsh_captain_financial_eligibility
SET wlt_decision_id = COALESCE(NULLIF(wlt_decision_id, ''), NULLIF(snapshot_reference, ''), 'legacy-wlt-decision-import')
WHERE wlt_decision_id IS NULL OR btrim(wlt_decision_id) = '';

ALTER TABLE dsh_captain_financial_eligibility
  ALTER COLUMN wlt_decision_id SET NOT NULL;

ALTER TABLE dsh_captain_financial_eligibility
  DROP COLUMN IF EXISTS wallet_id,
  DROP COLUMN IF EXISTS wallet_status,
  DROP COLUMN IF EXISTS available_balance_minor_units,
  DROP COLUMN IF EXISTS minimum_dispatch_balance_minor_units,
  DROP COLUMN IF EXISTS currency;

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

CREATE OR REPLACE FUNCTION dsh_assert_governed_assignment_financial_eligibility()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.idempotency_key IS NULL OR btrim(NEW.idempotency_key) = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('offered','accepted') THEN
    RETURN NEW;
  END IF;

  IF dsh_financial_snapshot_is_eligible(NEW.operator_context_id, NEW.captain_id) = false THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'CAPTAIN_WLT_FINANCIAL_DECISION_REQUIRED';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dsh_assignment_captain_financial_eligibility
BEFORE INSERT OR UPDATE OF status, captain_id, operator_context_id, idempotency_key
ON dsh_assignments
FOR EACH ROW EXECUTE FUNCTION dsh_assert_governed_assignment_financial_eligibility();

COMMENT ON TABLE dsh_captain_financial_eligibility IS
  'Short-lived WLT dispatch eligibility decision projection. DSH stores decision metadata only; balances, wallet state, thresholds, currency, and financial policy belong exclusively to WLT.';

COMMENT ON COLUMN dsh_captain_financial_eligibility.wlt_decision_id IS
  'Opaque WLT decision identifier used for dispatch gating readback; not a wallet, balance, or ledger reference.';
