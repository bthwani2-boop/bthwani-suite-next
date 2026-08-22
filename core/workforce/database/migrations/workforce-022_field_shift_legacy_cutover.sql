-- Workforce-022: remove the field-provider shift compatibility residue.
-- Field providers do not own shifts. Workforce shift reference data remains
-- available for employee workflows and operational shift scopes where valid.
-- Fail closed if the historical sentinel escaped into operational assignments.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM workforce_operational_assignments
    WHERE scope_type = 'shift'
      AND scope_target_id = 'not_applicable'
  ) THEN
    RAISE EXCEPTION 'field no-shift compatibility sentinel leaked into operational assignments';
  END IF;
END
$$;

DROP TRIGGER IF EXISTS trg_workforce_field_no_shift_compat ON workforce_field_profiles;
DROP FUNCTION IF EXISTS workforce_force_independent_no_shift();

ALTER TABLE workforce_field_profiles
  DROP COLUMN IF EXISTS shift_code;

DELETE FROM workforce_shifts
WHERE code = 'not_applicable';
