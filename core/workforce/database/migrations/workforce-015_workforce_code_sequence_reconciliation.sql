-- Reconcile server-generated Workforce codes with persisted data.
--
-- Earlier schema history created the unique constraint as
-- workforce_people_provider_code_key and later renamed provider_code to
-- workforce_code without renaming that constraint. The per-kind sequences were
-- also introduced without being advanced past existing FLD/CAP/EMP codes.
-- On a persisted local database this can make the next create operation reuse an
-- existing code and surface as an opaque HTTP 500.
--
-- This migration keeps the server-generated code authority in Workforce,
-- normalizes the constraint name used by error classification, and advances each
-- sequence to the highest persisted canonical code for its workforce kind.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'workforce_people'::regclass
      AND conname = 'workforce_people_provider_code_key'
      AND contype = 'u'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'workforce_people'::regclass
      AND conname = 'workforce_people_workforce_code_key'
      AND contype = 'u'
  ) THEN
    ALTER TABLE workforce_people
      RENAME CONSTRAINT workforce_people_provider_code_key
      TO workforce_people_workforce_code_key;
  END IF;
END $$;

DO $$
DECLARE
  highest bigint;
BEGIN
  SELECT COALESCE(MAX(substring(workforce_code FROM '^FLD-([0-9]+)$')::bigint), 0)
  INTO highest
  FROM workforce_people
  WHERE workforce_kind = 'field'
    AND workforce_code ~ '^FLD-[0-9]+$';

  PERFORM setval(
    'workforce_field_code_seq',
    GREATEST(highest, 1),
    highest > 0
  );

  SELECT COALESCE(MAX(substring(workforce_code FROM '^CAP-([0-9]+)$')::bigint), 0)
  INTO highest
  FROM workforce_people
  WHERE workforce_kind = 'captain'
    AND workforce_code ~ '^CAP-[0-9]+$';

  PERFORM setval(
    'workforce_captain_code_seq',
    GREATEST(highest, 1),
    highest > 0
  );

  SELECT COALESCE(MAX(substring(workforce_code FROM '^EMP-([0-9]+)$')::bigint), 0)
  INTO highest
  FROM workforce_people
  WHERE workforce_kind = 'employee'
    AND workforce_code ~ '^EMP-[0-9]+$';

  PERFORM setval(
    'workforce_employee_code_seq',
    GREATEST(highest, 1),
    highest > 0
  );
END $$;

COMMENT ON COLUMN workforce_people.workforce_code IS
  'Workforce-owned server-generated identifier; per-kind sequences are reconciled to persisted canonical codes by workforce-015.';
