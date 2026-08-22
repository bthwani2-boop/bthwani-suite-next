-- Workforce-023: make Workforce projections creation-time invariants.
-- Historical migrations backfilled these rows, but runtime reads later retained
-- lazy INSERT-on-read compatibility. Backfill any current gap once, then create
-- future projections in the same transaction as the owning profile/person.

INSERT INTO workforce_provider_operational_core (operator_context_id, actor_id)
SELECT operator_context_id, actor_id
FROM workforce_people
WHERE workforce_kind IN ('field', 'captain')
ON CONFLICT (actor_id) DO NOTHING;

INSERT INTO workforce_captain_activation_core (operator_context_id, actor_id)
SELECT operator_context_id, actor_id
FROM workforce_people
WHERE workforce_kind = 'captain'
ON CONFLICT (actor_id) DO NOTHING;

INSERT INTO workforce_employee_governance (
  operator_context_id,
  actor_id,
  position_title,
  updated_by_actor_id
)
SELECT
  operator_context_id,
  actor_id,
  COALESCE(role, ''),
  'migration:workforce-023'
FROM workforce_employee_profiles
ON CONFLICT (actor_id) DO NOTHING;

CREATE OR REPLACE FUNCTION workforce_create_provider_projection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.workforce_kind IN ('field', 'captain') THEN
    INSERT INTO workforce_provider_operational_core (operator_context_id, actor_id)
    VALUES (NEW.operator_context_id, NEW.actor_id)
    ON CONFLICT (actor_id) DO NOTHING;
  END IF;

  IF NEW.workforce_kind = 'captain' THEN
    INSERT INTO workforce_captain_activation_core (operator_context_id, actor_id)
    VALUES (NEW.operator_context_id, NEW.actor_id)
    ON CONFLICT (actor_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workforce_create_provider_projection ON workforce_people;
CREATE TRIGGER trg_workforce_create_provider_projection
AFTER INSERT ON workforce_people
FOR EACH ROW
EXECUTE FUNCTION workforce_create_provider_projection();

CREATE OR REPLACE FUNCTION workforce_create_employee_governance_projection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO workforce_employee_governance (
    operator_context_id,
    actor_id,
    position_title,
    updated_by_actor_id
  )
  VALUES (
    NEW.operator_context_id,
    NEW.actor_id,
    COALESCE(NEW.role, ''),
    'system:create'
  )
  ON CONFLICT (actor_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workforce_create_employee_governance_projection
  ON workforce_employee_profiles;
CREATE TRIGGER trg_workforce_create_employee_governance_projection
AFTER INSERT ON workforce_employee_profiles
FOR EACH ROW
EXECUTE FUNCTION workforce_create_employee_governance_projection();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM workforce_people p
    WHERE p.workforce_kind IN ('field', 'captain')
      AND NOT EXISTS (
        SELECT 1
        FROM workforce_provider_operational_core c
        WHERE c.operator_context_id = p.operator_context_id
          AND c.actor_id = p.actor_id
      )
  ) THEN
    RAISE EXCEPTION 'provider operational core invariant is incomplete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM workforce_people p
    WHERE p.workforce_kind = 'captain'
      AND NOT EXISTS (
        SELECT 1
        FROM workforce_captain_activation_core c
        WHERE c.operator_context_id = p.operator_context_id
          AND c.actor_id = p.actor_id
      )
  ) THEN
    RAISE EXCEPTION 'captain activation core invariant is incomplete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM workforce_employee_profiles e
    WHERE NOT EXISTS (
      SELECT 1
      FROM workforce_employee_governance g
      WHERE g.operator_context_id = e.operator_context_id
        AND g.actor_id = e.actor_id
    )
  ) THEN
    RAISE EXCEPTION 'employee governance invariant is incomplete';
  END IF;
END
$$;
