-- DSH-096: invalidate an unfinished store-captain custody attempt as soon as
-- another assignment is created for the same order. The replacement captain
-- receives a fresh attempt only after arriving at the store.

BEGIN;

CREATE OR REPLACE FUNCTION dsh_supersede_store_captain_handoff_on_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.order_id IS NOT NULL THEN
        UPDATE dsh_store_captain_handoffs
        SET status = 'superseded',
            version = version + 1,
            updated_at = NOW()
        WHERE order_id = NEW.order_id
          AND assignment_id <> NEW.id
          AND status IN ('awaiting_partner', 'partner_confirmed');
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_supersede_store_captain_handoff_on_assignment
    ON dsh_assignments;

CREATE TRIGGER trg_dsh_supersede_store_captain_handoff_on_assignment
AFTER INSERT ON dsh_assignments
FOR EACH ROW
EXECUTE FUNCTION dsh_supersede_store_captain_handoff_on_assignment();

COMMIT;
