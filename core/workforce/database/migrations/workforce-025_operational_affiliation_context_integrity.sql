-- Workforce-025: close historical affiliation integrity and operator-context drift.
-- workforce-014 introduced operational affiliation constraints as NOT VALID and
-- temporarily tolerated legacy-unknown context while the canonical Identity-owned
-- OperatorContext cutover was still pending. workforce-020 completed that cutover
-- for Workforce durable state, so operational affiliations must now be reconciled
-- to the canonical Workforce person and their declared kind before closure.

UPDATE workforce_operational_assignments AS assignment
SET operator_context_id = person.operator_context_id
FROM workforce_people AS person
WHERE assignment.actor_id = person.actor_id
  AND (
    NULLIF(BTRIM(assignment.operator_context_id), '') IS NULL
    OR assignment.operator_context_id = 'legacy-unknown'
  );

UPDATE workforce_operational_assignment_audit AS audit
SET operator_context_id = person.operator_context_id
FROM workforce_people AS person
WHERE audit.actor_id = person.actor_id
  AND (
    NULLIF(BTRIM(audit.operator_context_id), '') IS NULL
    OR audit.operator_context_id = 'legacy-unknown'
  );

DO $$
DECLARE
  invalid_assignments bigint;
  invalid_audit bigint;
BEGIN
  SELECT count(*)
  INTO invalid_assignments
  FROM workforce_operational_assignments AS assignment
  LEFT JOIN workforce_people AS person
    ON person.actor_id = assignment.actor_id
   AND person.operator_context_id = assignment.operator_context_id
   AND person.workforce_kind = assignment.role
  WHERE person.actor_id IS NULL;

  IF invalid_assignments > 0 THEN
    RAISE EXCEPTION
      'workforce-025: % operational affiliation rows cannot be proven against canonical actor + OperatorContext + workforce kind',
      invalid_assignments;
  END IF;

  SELECT count(*)
  INTO invalid_audit
  FROM workforce_operational_assignment_audit AS audit
  LEFT JOIN workforce_people AS person
    ON person.actor_id = audit.actor_id
   AND person.operator_context_id = audit.operator_context_id
   AND person.workforce_kind = audit.role
  WHERE person.actor_id IS NULL;

  IF invalid_audit > 0 THEN
    RAISE EXCEPTION
      'workforce-025: % operational affiliation audit rows cannot be proven against canonical actor + OperatorContext + workforce kind',
      invalid_audit;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION workforce_enforce_operational_affiliation_actor_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM workforce_people AS person
    WHERE person.actor_id = NEW.actor_id
      AND person.operator_context_id = NEW.operator_context_id
      AND person.workforce_kind = NEW.role
  ) THEN
    RAISE EXCEPTION
      'operational affiliation actor/context/kind mismatch: actor=%, context=%, role=%',
      NEW.actor_id, NEW.operator_context_id, NEW.role
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workforce_operational_assignment_actor_context
  ON workforce_operational_assignments;
CREATE TRIGGER trg_workforce_operational_assignment_actor_context
BEFORE INSERT OR UPDATE OF actor_id, operator_context_id, role
ON workforce_operational_assignments
FOR EACH ROW
EXECUTE FUNCTION workforce_enforce_operational_affiliation_actor_context();

DROP TRIGGER IF EXISTS trg_workforce_operational_assignment_audit_actor_context
  ON workforce_operational_assignment_audit;
CREATE TRIGGER trg_workforce_operational_assignment_audit_actor_context
BEFORE INSERT OR UPDATE OF actor_id, operator_context_id, role
ON workforce_operational_assignment_audit
FOR EACH ROW
EXECUTE FUNCTION workforce_enforce_operational_affiliation_actor_context();

ALTER TABLE workforce_operational_assignments
  VALIDATE CONSTRAINT workforce_operational_assignment_scope_type_chk;
ALTER TABLE workforce_operational_assignments
  VALIDATE CONSTRAINT workforce_operational_assignment_nonblank_chk;
ALTER TABLE workforce_operational_assignments
  VALIDATE CONSTRAINT workforce_operational_assignment_period_chk;
ALTER TABLE workforce_operational_assignment_audit
  VALIDATE CONSTRAINT workforce_operational_assignment_audit_integrity_chk;
