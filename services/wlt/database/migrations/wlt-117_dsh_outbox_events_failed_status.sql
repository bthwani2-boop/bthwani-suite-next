-- WLT-117: Allow a terminal 'failed' status on wlt_dsh_outbox_events.
--
-- MarkFailed caps retries at 15 attempts and marks the row terminally failed
-- instead of retrying forever with an ever-growing next_retry_at. The
-- original CHECK (status IN ('pending','sent')) predates that cap and would
-- reject the terminal write with a constraint violation, silently losing the
-- outbox worker's failure signal on every exhausted DSH payment-session
-- notification.

BEGIN;

ALTER TABLE wlt_dsh_outbox_events
    DROP CONSTRAINT IF EXISTS wlt_dsh_outbox_events_status_check;

ALTER TABLE wlt_dsh_outbox_events
    ADD CONSTRAINT wlt_dsh_outbox_events_status_check CHECK (
        status IN ('pending', 'sent', 'failed')
    );

CREATE INDEX IF NOT EXISTS idx_wlt_dsh_outbox_events_failed
    ON wlt_dsh_outbox_events(updated_at)
    WHERE status = 'failed';

COMMENT ON COLUMN wlt_dsh_outbox_events.status IS
  'pending: awaiting delivery to DSH. sent: delivered. failed: exhausted 15 retry attempts and requires manual/operator intervention.';

COMMIT;
