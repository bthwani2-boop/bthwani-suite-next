-- PLATFORM-009: remove partner commercial truth from Platform Control storage.
--
-- PLATFORM-008 created an isolated variable that declared DSH ownership while
-- Platform Control remained the physical writer. This forward recovery removes
-- that parallel source and blocks generic change-set writes from recreating it.
-- DSH owns the operational agreement/reference; WLT owns every financial policy,
-- effective date, calculation, fee, debt effect and ledger consequence.

BEGIN;

DROP TRIGGER IF EXISTS trg_platform_partner_commercial_model ON platform_variables;
DROP FUNCTION IF EXISTS platform_validate_partner_commercial_model();

DELETE FROM platform_variables
WHERE variable_key = 'VAR_PARTNER_COMMERCIAL_MODEL';

CREATE OR REPLACE FUNCTION platform_reject_partner_commercial_model_storage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.variable_key = 'VAR_PARTNER_COMMERCIAL_MODEL' THEN
    RAISE EXCEPTION
      'VAR_PARTNER_COMMERCIAL_MODEL is domain-owned and cannot be stored in Platform Control'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_reject_partner_commercial_model_storage
  ON platform_variables;
CREATE TRIGGER trg_platform_reject_partner_commercial_model_storage
BEFORE INSERT OR UPDATE OF variable_key
ON platform_variables
FOR EACH ROW
EXECUTE FUNCTION platform_reject_partner_commercial_model_storage();

COMMENT ON FUNCTION platform_reject_partner_commercial_model_storage() IS
  'Prevents Platform Control from becoming a parallel writer for DSH/WLT partner commercial truth.';

COMMIT;
