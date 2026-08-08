-- WLT-911: wallet top-up as a fourth payment-session source identity.
--
-- Every payment session created so far has been tied to an order, a special
-- request or a subscription purchase (wlt-023, wlt-030). A Cash-In wallet
-- top-up (U002-T002) is none of those: it funds an actor's own wallet
-- directly and has no order/subscription behind it. Rather than smuggle a
-- top-up through one of the existing source columns (which would make its
-- financial_purpose lie about what actually happened), this adds a fourth,
-- explicit source identity following the exact pattern wlt-030 used for
-- subscription_purchase_id.

ALTER TABLE wlt_payment_sessions
    ADD COLUMN IF NOT EXISTS topup_reference TEXT;

-- customer|captain: which actor type is being credited. Paired 1:1 with
-- topup_reference by the CHECK below, the same way commercial_product_reference
-- is paired with subscription_purchase_id in wlt-030.
ALTER TABLE wlt_payment_sessions
    ADD COLUMN IF NOT EXISTS topup_actor_type TEXT;

DROP INDEX IF EXISTS wlt_payment_sessions_topup_reference_idx;
CREATE UNIQUE INDEX wlt_payment_sessions_topup_reference_idx
    ON wlt_payment_sessions(topup_reference)
    WHERE topup_reference IS NOT NULL;

ALTER TABLE wlt_payment_sessions
    DROP CONSTRAINT IF EXISTS wlt_payment_sessions_topup_actor_type_chk;

ALTER TABLE wlt_payment_sessions
    ADD CONSTRAINT wlt_payment_sessions_topup_actor_type_chk CHECK (
        topup_actor_type IS NULL OR topup_actor_type IN ('customer', 'captain')
    );

ALTER TABLE wlt_payment_sessions
    DROP CONSTRAINT IF EXISTS wlt_payment_sessions_topup_pair_chk;

ALTER TABLE wlt_payment_sessions
    ADD CONSTRAINT wlt_payment_sessions_topup_pair_chk CHECK (
        (topup_reference IS NOT NULL AND topup_actor_type IS NOT NULL)
        OR
        (topup_reference IS NULL AND topup_actor_type IS NULL)
    );

-- Extend the source-of-truth XOR (wlt-023, re-stated wlt-030) to include the
-- new column. No existing row has topup_reference set, so this cannot change
-- the classification of any historical session.
ALTER TABLE wlt_payment_sessions
    DROP CONSTRAINT IF EXISTS wlt_payment_sessions_source_xor_chk;

ALTER TABLE wlt_payment_sessions
    ADD CONSTRAINT wlt_payment_sessions_source_xor_chk CHECK (
        num_nonnulls(checkout_intent_id, special_request_id, subscription_purchase_id, topup_reference) = 1
    );

-- Extend the closed financial_purpose vocabulary (wlt-908) with the two new
-- purposes a topup_reference-sourced session can carry.
ALTER TABLE wlt_payment_sessions
    DROP CONSTRAINT IF EXISTS wlt_payment_sessions_financial_purpose_chk;

ALTER TABLE wlt_payment_sessions
    ADD CONSTRAINT wlt_payment_sessions_financial_purpose_chk CHECK (
        financial_purpose IN (
            'order_payment',
            'special_request_payment',
            'subscription_purchase',
            'customer_topup',
            'captain_topup'
        )
    );

COMMENT ON COLUMN wlt_payment_sessions.topup_reference IS
  'Fourth source identity: set only for a Cash-In wallet top-up session, mutually exclusive with the order/special-request/subscription identities.';

COMMENT ON COLUMN wlt_payment_sessions.topup_actor_type IS
  'customer|captain: which actor type wlt_payment_sessions.client_id refers to for a top-up session. NULL for every other source identity.';
