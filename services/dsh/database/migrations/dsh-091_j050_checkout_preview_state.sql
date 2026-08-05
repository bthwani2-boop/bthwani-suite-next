-- DSH-091: J050 Checkout Preview, Hash and Expiry.
-- Introduces strict state machine for checkout preview orchestration.
-- Replaces old state check with a new unified set of states.

ALTER TABLE dsh_checkout_intents
    DROP CONSTRAINT IF EXISTS dsh_checkout_intents_state_check;

-- Note: We map old pending/wlt_outcome_unknown to new values in code, but the database allows the new set.
-- Data migration for existing rows (if any in non-prod)
UPDATE dsh_checkout_intents SET state = 'draft' WHERE state = 'pending';
UPDATE dsh_checkout_intents SET state = 'confirming' WHERE state IN ('payment_pending', 'wlt_outcome_unknown');
UPDATE dsh_checkout_intents SET state = 'blocked' WHERE state = 'wlt_handoff_failed';
UPDATE dsh_checkout_intents SET state = 'confirmed' WHERE state IN ('payment_confirmed', 'payment_failed');

ALTER TABLE dsh_checkout_intents
    ADD CONSTRAINT dsh_checkout_intents_state_check
    CHECK (state IN (
        'draft',
        'validating',
        'ready',
        'blocked',
        'confirming',
        'confirmed',
        'cancelled',
        'expired'
    ));

ALTER TABLE dsh_checkout_intents
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS preview_hash TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS validation_issues JSONB NOT NULL DEFAULT '[]'::jsonb;

-- We need a partial index to quickly expire stale intents
CREATE INDEX IF NOT EXISTS idx_dsh_checkout_intents_expiry
    ON dsh_checkout_intents(expires_at)
    WHERE state IN ('draft', 'validating', 'ready', 'blocked');
