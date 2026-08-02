-- PLATFORM-008: governed DSH-owned partner commercial-model variable.
-- DSH owns only the operational model selection. WLT remains the exclusive
-- owner of commission policy, subscription billing, invoices, ledger entries,
-- settlement and every final monetary amount.

BEGIN;

CREATE OR REPLACE FUNCTION platform_validate_partner_commercial_model()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  selected_model TEXT;
BEGIN
  IF NEW.variable_key <> 'VAR_PARTNER_COMMERCIAL_MODEL' THEN
    RETURN NEW;
  END IF;

  IF NEW.owner_service <> 'dsh'
     OR NEW.value_type <> 'string'
     OR NEW.classification <> 'sensitive' THEN
    RAISE EXCEPTION 'VAR_PARTNER_COMMERCIAL_MODEL must be DSH-owned sensitive string policy'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.scope_type NOT IN ('global', 'partner')
     OR (NEW.scope_type = 'global' AND NEW.scope_id <> '')
     OR (NEW.scope_type = 'partner' AND btrim(NEW.scope_id) = '') THEN
    RAISE EXCEPTION 'partner commercial model scope must be global or a concrete partner'
      USING ERRCODE = '23514';
  END IF;

  IF jsonb_typeof(NEW.value_json) <> 'string' THEN
    RAISE EXCEPTION 'partner commercial model must be a JSON string'
      USING ERRCODE = '23514';
  END IF;

  selected_model := NEW.value_json #>> '{}';
  IF selected_model NOT IN ('COMMISSION', 'SUBSCRIPTION', 'HYBRID', 'OPERATOR_MANAGED') THEN
    RAISE EXCEPTION 'unsupported partner commercial model: %', selected_model
      USING ERRCODE = '23514';
  END IF;

  IF NEW.effective_from IS NOT NULL
     AND NEW.expires_at IS NOT NULL
     AND NEW.expires_at <= NEW.effective_from THEN
    RAISE EXCEPTION 'partner commercial model expiry must follow its effective time'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_partner_commercial_model ON platform_variables;
CREATE TRIGGER trg_platform_partner_commercial_model
BEFORE INSERT OR UPDATE OF variable_key, owner_service, value_type,
  classification, scope_type, scope_id, value_json, effective_from, expires_at
ON platform_variables
FOR EACH ROW
EXECUTE FUNCTION platform_validate_partner_commercial_model();

INSERT INTO platform_variables (
  variable_key,
  owner_service,
  value_type,
  classification,
  scope_type,
  scope_id,
  value_json,
  revision,
  status,
  effective_from
) VALUES (
  'VAR_PARTNER_COMMERCIAL_MODEL',
  'dsh',
  'string',
  'sensitive',
  'global',
  '',
  '"HYBRID"'::jsonb,
  1,
  'active',
  NOW()
)
ON CONFLICT (variable_key, scope_type, scope_id) DO NOTHING;

COMMENT ON FUNCTION platform_validate_partner_commercial_model() IS
  'Enforces the non-SaaS DSH operational partner model enum and scope. Financial terms remain WLT-owned.';
COMMENT ON COLUMN platform_variables.value_json IS
  'Governed value. VAR_PARTNER_COMMERCIAL_MODEL stores only the operational enum; it never stores or calculates money.';

COMMIT;
