-- WLT-034 / JRN-028: make every promotion-funding state transition
-- inseparable from its append-only audit event.
--
-- The application updates the reservation and appends the event in one
-- serializable transaction. The constraint trigger is deferred until commit so
-- the event may be inserted after the state update, while still rolling the
-- whole transaction back when an idempotency-key collision suppresses or
-- redirects the required event.

-- Existing historical events are marked with transaction_id=0. They remain
-- valid audit history but can never authorize a future reservation transition.
-- New inserts inherit txid_current(), allowing the deferred trigger to prove
-- that the state update and its event were committed by the same transaction.
ALTER TABLE wlt_promotion_funding_events
    ADD COLUMN IF NOT EXISTS transaction_id BIGINT;
UPDATE wlt_promotion_funding_events
SET transaction_id = 0
WHERE transaction_id IS NULL;
ALTER TABLE wlt_promotion_funding_events
    ALTER COLUMN transaction_id SET DEFAULT txid_current(),
    ALTER COLUMN transaction_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_wlt_promotion_funding_event_transition
    ON wlt_promotion_funding_events(reservation_id, to_status);

CREATE OR REPLACE FUNCTION wlt_require_promotion_funding_transition_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    matching_event_exists BOOLEAN;
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM wlt_promotion_funding_events event
        WHERE event.reservation_id = NEW.id
          AND event.transaction_id = txid_current()
          AND event.from_status = OLD.status
          AND event.to_status = NEW.status
          AND event.event_type = NEW.status
          AND COALESCE(event.order_id, '') = COALESCE(NEW.order_id, '')
          AND (
              NEW.status = 'committed'
              OR (NEW.status = 'released' AND event.reason = NEW.release_reason)
              OR (NEW.status = 'reversed' AND event.reason = NEW.reversal_reason)
          )
    ) INTO matching_event_exists;

    IF NOT matching_event_exists THEN
        RAISE EXCEPTION
            'promotion funding transition % -> % requires a same-transaction append-only event',
            OLD.status,
            NEW.status
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wlt_require_promotion_funding_transition_event
    ON wlt_promotion_funding_reservations;
CREATE CONSTRAINT TRIGGER trg_wlt_require_promotion_funding_transition_event
AFTER UPDATE ON wlt_promotion_funding_reservations
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION wlt_require_promotion_funding_transition_event();
