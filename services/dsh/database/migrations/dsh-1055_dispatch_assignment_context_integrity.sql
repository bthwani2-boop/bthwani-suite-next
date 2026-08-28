-- DSH-1055: make dispatch assignment ownership follow its canonical source.
-- Existing assignments are classified through their order or special request;
-- ambiguous rows abort the migration instead of inheriting the old `default`
-- column value.

BEGIN;

UPDATE dsh_assignments a
SET operator_context_id = NULLIF(BTRIM(o.operator_context_id), '')
FROM dsh_orders o
WHERE o.id = a.order_id
  AND (
      NULLIF(BTRIM(a.operator_context_id), '') IS NULL
      OR BTRIM(a.operator_context_id) = 'default'
);

UPDATE dsh_assignments a
SET operator_context_id = NULLIF(BTRIM(sr.operator_context_id), '')
FROM dsh_special_requests sr
WHERE sr.id = a.special_request_id
  AND (
      NULLIF(BTRIM(a.operator_context_id), '') IS NULL
      OR BTRIM(a.operator_context_id) = 'default'
  );

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM dsh_assignments a
        LEFT JOIN dsh_orders o ON o.id = a.order_id
        LEFT JOIN dsh_special_requests sr ON sr.id = a.special_request_id
        WHERE NULLIF(BTRIM(a.operator_context_id), '') IS NULL
           OR NULLIF(BTRIM(COALESCE(o.operator_context_id, sr.operator_context_id)), '') IS NULL
           OR BTRIM(a.operator_context_id) IS DISTINCT FROM
              COALESCE(NULLIF(BTRIM(o.operator_context_id), ''), NULLIF(BTRIM(sr.operator_context_id), ''))
    ) THEN
        RAISE EXCEPTION 'cannot enforce dispatch assignment operator context: existing rows are unresolved';
    END IF;
END;
$$;

ALTER TABLE dsh_assignments
    DROP CONSTRAINT IF EXISTS dsh_assignments_operator_context_nonempty_check;
ALTER TABLE dsh_assignments
    ADD CONSTRAINT dsh_assignments_operator_context_nonempty_check
    CHECK (NULLIF(BTRIM(operator_context_id), '') IS NOT NULL);

CREATE OR REPLACE FUNCTION trg_fn_dsh_assignments_operator_context()
RETURNS trigger AS $$
DECLARE
    v_source_context TEXT;
BEGIN
    IF NEW.order_id IS NOT NULL THEN
        SELECT NULLIF(BTRIM(operator_context_id), '')
        INTO v_source_context
        FROM dsh_orders
        WHERE id = NEW.order_id;
    ELSIF NEW.special_request_id IS NOT NULL THEN
        SELECT NULLIF(BTRIM(operator_context_id), '')
        INTO v_source_context
        FROM dsh_special_requests
        WHERE id = NEW.special_request_id;
    END IF;

    IF v_source_context IS NULL THEN
        RAISE EXCEPTION 'dispatch assignment source context is missing';
    END IF;
    IF NULLIF(BTRIM(NEW.operator_context_id), '') IS NULL THEN
        NEW.operator_context_id := v_source_context;
    ELSIF BTRIM(NEW.operator_context_id) <> v_source_context THEN
        RAISE EXCEPTION 'dispatch assignment operator context does not match its source';
    ELSE
        NEW.operator_context_id := BTRIM(NEW.operator_context_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dsh_assignments_operator_context ON dsh_assignments;
CREATE TRIGGER trg_dsh_assignments_operator_context
BEFORE INSERT OR UPDATE OF operator_context_id, order_id, special_request_id
ON dsh_assignments
FOR EACH ROW
EXECUTE FUNCTION trg_fn_dsh_assignments_operator_context();

CREATE INDEX IF NOT EXISTS idx_dsh_assignments_operator_context_status_created
    ON dsh_assignments(operator_context_id, status, created_at DESC);

COMMIT;
