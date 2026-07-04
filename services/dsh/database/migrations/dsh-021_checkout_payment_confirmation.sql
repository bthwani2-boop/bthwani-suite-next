-- DSH-021: Checkout payment confirmation states
-- Adds terminal payment_confirmed / payment_failed states so non-COD
-- checkout intents (wallet, mixed, official_wallet) can advance past
-- payment_pending once WLT (the sole owner of payment capture truth)
-- reports a terminal outcome via the WLT->DSH payment-session-event webhook.
-- DSH still never computes or stores the financial amount itself.

ALTER TABLE dsh_checkout_intents DROP CONSTRAINT IF EXISTS dsh_checkout_intents_state_check;

ALTER TABLE dsh_checkout_intents
    ADD CONSTRAINT dsh_checkout_intents_state_check
    CHECK (state IN (
        'pending',
        'wlt_handoff_failed',
        'payment_pending',
        'payment_confirmed',
        'payment_failed',
        'confirmed',
        'cancelled',
        'expired'
    ));
