-- DSH-099: fail-closed captain financial eligibility for governed platform dispatch.
-- WLT remains the balance and ledger owner. DSH stores only a short-lived,
-- OperatorContext-scoped readback used to guard new governed offers and acceptance.

CREATE TABLE IF NOT EXISTS dsh_platform_dispatch_balance_policy (
  id                                      smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled                                 boolean NOT NULL DEFAULT true,
  require_positive_balance                boolean NOT NULL DEFAULT true,
  minimum_dispatch_balance_minor_units    bigint NOT NULL DEFAULT 0 CHECK (minimum_dispatch_balance_minor_units >= 0),
  minimum_cod_balance_minor_units         bigint NOT NULL DEFAULT 0 CHECK (minimum_cod_balance_minor_units >= minimum_dispatch_balance_minor_units),
  currency                                text NOT NULL DEFAULT 'YER' CHECK (char_length(currency) = 3),
  snapshot_ttl_seconds                    integer NOT NULL DEFAULT 120 CHECK (snapshot_ttl_seconds BETWEEN 30 AND 600),
  notes                                   text NOT NULL DEFAULT '',
  updated_by                              text NOT NULL DEFAULT 'system',
  version                                 integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at                              timestamptz NOT NULL DEFAULT now()
);

INSERT INTO dsh_platform_dispatch_balance_policy(id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS dsh_captain_financial_eligibility (
  operator_context_id                               text NOT NULL CHECK (btrim(operator_context_id) <> ''),
  captain_id                              text NOT NULL CHECK (btrim(captain_id) <> ''),
  wallet_id                               text NOT NULL CHECK (btrim(wallet_id) <> ''),
  wallet_status                           text NOT NULL CHECK (btrim(wallet_status) <> ''),
  available_balance_minor_units           bigint NOT NULL,
  minimum_dispatch_balance_minor_units    bigint NOT NULL CHECK (minimum_dispatch_balance_minor_units >= 0),
  currency                                text NOT NULL CHECK (char_length(currency) = 3),
  eligible                                boolean NOT NULL,
  ineligibility_reason                    text NOT NULL DEFAULT '',
  snapshot_reference                      text NOT NULL CHECK (btrim(snapshot_reference) <> ''),
  checked_at                              timestamptz NOT NULL DEFAULT now(),
  expires_at                              timestamptz NOT NULL,
  PRIMARY KEY (operator_context_id, captain_id),
  CHECK (expires_at > checked_at)
);

CREATE INDEX IF NOT EXISTS dsh_captain_financial_eligibility_expiry_idx
  ON dsh_captain_financial_eligibility(expires_at, eligible);

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

-- Governed platform offers always carry a non-empty idempotency key. Legacy
-- fixtures and compatibility assignments without that key remain outside this
-- gate, while every live governed offer and acceptance fails closed.
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
      MESSAGE = 'CAPTAIN_FINANCIAL_ELIGIBILITY_REQUIRED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_assignment_captain_financial_eligibility
  ON dsh_assignments;
DROP TRIGGER IF EXISTS trg_dsh_governed_acceptance_financial_eligibility
  ON dsh_assignments;
DROP TRIGGER IF EXISTS trg_dsh_governed_offer_financial_eligibility
  ON dsh_assignments;
CREATE TRIGGER trg_dsh_assignment_captain_financial_eligibility
BEFORE INSERT OR UPDATE OF status, captain_id, operator_context_id, idempotency_key
ON dsh_assignments
FOR EACH ROW EXECUTE FUNCTION dsh_assert_governed_assignment_financial_eligibility();

COMMENT ON TABLE dsh_captain_financial_eligibility IS
  'Short-lived WLT wallet readback used only for governed dispatch gating; it is not a financial ledger or balance owner.';
