-- DSH-995: Allow a terminal 'failed' status on dsh_promotion_funding_outbox.
--
-- MarkFailed caps retries at 15 attempts and marks the row terminally failed
-- instead of retrying forever. The original
-- CHECK (status IN ('pending','sent')) predates that cap and would reject
-- the terminal write with a constraint violation, silently losing the
-- outbox worker's failure signal for promotion-funding commit/release/
-- reverse transitions owed to WLT.

BEGIN;

ALTER TABLE dsh_promotion_funding_outbox
    DROP CONSTRAINT IF EXISTS dsh_promotion_funding_outbox_status_check;

ALTER TABLE dsh_promotion_funding_outbox
    ADD CONSTRAINT dsh_promotion_funding_outbox_status_check CHECK (
        status IN ('pending', 'sent', 'failed')
    );

CREATE INDEX IF NOT EXISTS idx_dsh_promotion_funding_outbox_failed
    ON dsh_promotion_funding_outbox(updated_at)
    WHERE status = 'failed';

COMMENT ON COLUMN dsh_promotion_funding_outbox.status IS
  'pending: awaiting delivery to WLT. sent: delivered. failed: exhausted 15 retry attempts and requires manual/operator intervention.';

COMMIT;
