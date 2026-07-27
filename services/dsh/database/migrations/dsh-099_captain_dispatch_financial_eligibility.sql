-- DSH-099: fail-closed captain financial eligibility for platform dispatch.
-- WLT remains the balance and ledger owner. DSH stores only a short-lived,
-- tenant-scoped readback used to guard new offers and acceptance.

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
  tenant_id                               text NOT NULL CHECK (btrim(tenant_id) <> ''),
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
  PRIMARY KEY (tenant_id, captain_id),
  CHECK (expires_at > checked_at)
);

CREATE INDEX IF NOT EXISTS dsh_captain_financial_eligibility_expiry_idx
  ON dsh_captain_financial_eligibility(expires_at, eligible);

CREATE OR REPLACE FUNCTION dsh_assert_captain_financial_eligibility()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  snapshot_eligible boolean;
BEGIN
  IF NEW.status NOT IN ('offered','accepted') THEN
    RETURN NEW;
  END IF;

  SELECT eligible AND expires_at > now()
  INTO snapshot_eligible
  FROM dsh_captain_financial_eligibility
  WHERE tenant_id = NEW.tenant_id
    AND captain_id = NEW.captain_id;

  IF COALESCE(snapshot_eligible, false) = false THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'CAPTAIN_FINANCIAL_ELIGIBILITY_REQUIRED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_assignment_captain_financial_eligibility ON dsh_assignments;
CREATE TRIGGER trg_dsh_assignment_captain_financial_eligibility
BEFORE INSERT OR UPDATE OF status, captain_id, tenant_id
ON dsh_assignments
FOR EACH ROW EXECUTE FUNCTION dsh_assert_captain_financial_eligibility();

COMMENT ON TABLE dsh_captain_financial_eligibility IS
  'Short-lived WLT wallet readback used only for dispatch gating; it is not a financial ledger or balance owner.';
