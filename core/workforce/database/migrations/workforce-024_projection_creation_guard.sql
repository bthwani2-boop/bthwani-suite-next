-- Workforce-024: enforce projection creation authority at the database boundary.
-- Projection rows are created only by the creation-time triggers installed by
-- workforce-023. Runtime reads and update paths may not self-heal a missing
-- projection; a missing row is an invariant failure that must remain visible.

CREATE OR REPLACE FUNCTION workforce_guard_provider_operational_core_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM workforce_provider_operational_core
    WHERE operator_context_id = NEW.operator_context_id
      AND actor_id = NEW.actor_id
  ) THEN
    RETURN NULL;
  END IF;

  IF pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'provider operational core must be created with its workforce person';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workforce_guard_provider_operational_core_insert
  ON workforce_provider_operational_core;
CREATE TRIGGER trg_workforce_guard_provider_operational_core_insert
BEFORE INSERT ON workforce_provider_operational_core
FOR EACH ROW
EXECUTE FUNCTION workforce_guard_provider_operational_core_insert();

CREATE OR REPLACE FUNCTION workforce_guard_captain_activation_core_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM workforce_captain_activation_core
    WHERE operator_context_id = NEW.operator_context_id
      AND actor_id = NEW.actor_id
  ) THEN
    RETURN NULL;
  END IF;

  IF pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'captain activation core must be created with its workforce person';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workforce_guard_captain_activation_core_insert
  ON workforce_captain_activation_core;
CREATE TRIGGER trg_workforce_guard_captain_activation_core_insert
BEFORE INSERT ON workforce_captain_activation_core
FOR EACH ROW
EXECUTE FUNCTION workforce_guard_captain_activation_core_insert();

CREATE OR REPLACE FUNCTION workforce_guard_employee_governance_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM workforce_employee_governance
    WHERE operator_context_id = NEW.operator_context_id
      AND actor_id = NEW.actor_id
  ) THEN
    RETURN NULL;
  END IF;

  IF pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'employee governance must be created with its workforce employee profile';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workforce_guard_employee_governance_insert
  ON workforce_employee_governance;
CREATE TRIGGER trg_workforce_guard_employee_governance_insert
BEFORE INSERT ON workforce_employee_governance
FOR EACH ROW
EXECUTE FUNCTION workforce_guard_employee_governance_insert();
