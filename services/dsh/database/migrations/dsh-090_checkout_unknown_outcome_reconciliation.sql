-- DSH-090: JRN-010 unknown WLT outcome and reconciliation state.
-- DSH stores only an operational projection. WLT remains the financial authority.

ALTER TABLE dsh_checkout_intents
    DROP CONSTRAINT IF EXISTS dsh_checkout_intents_state_check;

ALTER TABLE dsh_checkout_intents
    ADD CONSTRAINT dsh_checkout_intents_state_check
    CHECK (state IN (
        'pending',
        'wlt_handoff_failed',
        'wlt_outcome_unknown',
        'payment_pending',
        'payment_confirmed',
        'payment_failed',
        'confirmed',
        'cancelled',
        'expired'
    ));

CREATE INDEX IF NOT EXISTS idx_dsh_checkout_intents_reconciliation
    ON dsh_checkout_intents(updated_at)
    WHERE state = 'wlt_outcome_unknown';
