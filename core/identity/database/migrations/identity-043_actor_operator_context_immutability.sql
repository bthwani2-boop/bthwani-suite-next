-- IDENTITY-043: make identity_actors.operator_context_id immutable after assignment
BEGIN;

CREATE OR REPLACE FUNCTION trg_fn_identity_actors_prevent_operator_context_mutation()
RETURNS trigger AS $$
BEGIN
    IF OLD.operator_context_id IS NOT NULL AND OLD.operator_context_id <> '' AND NEW.operator_context_id IS DISTINCT FROM OLD.operator_context_id THEN
        RAISE EXCEPTION 'identity_actors.operator_context_id is immutable once assigned (attempted change from % to %)',
            OLD.operator_context_id, NEW.operator_context_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_identity_actors_operator_context_immutable ON identity_actors;

CREATE TRIGGER trg_identity_actors_operator_context_immutable
BEFORE UPDATE OF operator_context_id ON identity_actors
FOR EACH ROW
EXECUTE FUNCTION trg_fn_identity_actors_prevent_operator_context_mutation();

COMMIT;
