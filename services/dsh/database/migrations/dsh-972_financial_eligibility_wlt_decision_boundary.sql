-- DSH-972: replace local financial truth with an opaque WLT decision projection.
-- This migration intentionally discards all legacy balance, wallet, currency,
-- threshold, and policy snapshots. They are not safe to preserve because DSH
-- cannot prove that they still match WLT.

DROP TRIGGER IF EXISTS trg_dsh_assignment_captain_financial_eligibility
  ON dsh_assignments;
DROP TRIGGER IF EXISTS trg_dsh_governed_acceptance_financial_eligibility
  ON dsh_assignments;
DROP TRIGGER IF EXISTS trg_dsh_governed_offer_financial_eligibility
  ON dsh_assignments;
DROP FUNCTION IF EXISTS dsh_assert_governed_assignment_financial_eligibility();
DROP FUNCTION IF EXISTS dsh_financial_snapshot_is_eligible(text, text);

DROP TABLE IF EXISTS dsh_platform_dispatch_balance_policy;
DROP TABLE IF EXISTS dsh_captain_financial_eligibility;

CREATE TABLE dsh_captain_financial_eligibility (
  operator_context_id       text NOT NULL CHECK (btrim(operator_context_id) <> ''),
  captain_id                text NOT NULL CHECK (btrim(captain_id) <> ''),
  wlt_decision_id           text NOT NULL CHECK (btrim(wlt_decision_id) <> ''),
  eligible                  boolean NOT NULL,
  reason_code               text NOT NULL CHECK (btrim(reason_code) <> ''),
  policy_version            text NOT NULL CHECK (btrim(policy_version) <> ''),
  evaluated_at              timestamptz NOT NULL,
  expires_at                timestamptz NOT NULL,
  last_financial_sync_at    timestamptz NOT NULL,
  PRIMARY KEY (operator_context_id, captain_id),
  UNIQUE (wlt_decision_id),
  CHECK (expires_at > evaluated_at),
  CHECK (last_financial_sync_at >= evaluated_at),
  CHECK (last_financial_sync_at < expires_at)
);

CREATE INDEX dsh_captain_financial_eligibility_expiry_idx
  ON dsh_captain_financial_eligibility(expires_at, eligible);

CREATE OR REPLACE FUNCTION dsh_wlt_financial_decision_is_usable(
  requested_operator_context_id text,
  requested_captain_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((
    SELECT eligible
      AND btrim(wlt_decision_id) <> ''
      AND btrim(reason_code) <> ''
      AND btrim(policy_version) <> ''
      AND policy_version <> 'unconfigured'
      AND evaluated_at <= now()
      AND last_financial_sync_at >= evaluated_at
      AND last_financial_sync_at < expires_at
      AND expires_at > now()
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

  IF dsh_wlt_financial_decision_is_usable(NEW.operator_context_id, NEW.captain_id) = false THEN
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
  'Short-lived WLT dispatch eligibility projection. DSH stores no wallet state, balance, currency, threshold, COD rule, or financial policy.';

COMMENT ON COLUMN dsh_captain_financial_eligibility.wlt_decision_id IS
  'Opaque unique WLT decision identifier. Reuse across captains or operator contexts is forbidden.';

COMMENT ON FUNCTION dsh_wlt_financial_decision_is_usable(text, text) IS
  'Validates only WLT decision metadata, scope, synchronization, and expiry. It performs no financial calculation.';
