-- DSH-069: durable WLT promotion-funding transition outbox.
--
-- Events are written in the same DSH transaction that creates/cancels/reverses
-- the business object, then retried until WLT acknowledges the transition.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS dsh_promotion_funding_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL CHECK (event_type IN ('commit', 'release', 'reverse')),
    tenant_id TEXT NOT NULL,
    checkout_intent_id UUID NOT NULL REFERENCES dsh_checkout_intents(id) ON DELETE RESTRICT,
    coupon_redemption_id UUID NOT NULL REFERENCES dsh_coupon_redemptions(id) ON DELETE RESTRICT,
    wlt_funding_reservation_id TEXT NOT NULL CHECK (btrim(wlt_funding_reservation_id) <> ''),
    order_id UUID REFERENCES dsh_orders(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL DEFAULT '',
    idempotency_key TEXT NOT NULL UNIQUE,
    correlation_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    CONSTRAINT dsh_promotion_funding_outbox_order_chk CHECK (
        (event_type = 'release' AND order_id IS NULL AND btrim(reason) <> '')
        OR
        (event_type = 'commit' AND order_id IS NOT NULL)
        OR
        (event_type = 'reverse' AND order_id IS NOT NULL AND btrim(reason) <> '')
    )
);

CREATE INDEX IF NOT EXISTS idx_dsh_promotion_funding_outbox_pending
    ON dsh_promotion_funding_outbox(next_retry_at, created_at)
    WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_promotion_funding_outbox_transition
    ON dsh_promotion_funding_outbox(wlt_funding_reservation_id, event_type)
    WHERE event_type IN ('commit', 'release');

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_promotion_funding_outbox_reverse_order
    ON dsh_promotion_funding_outbox(wlt_funding_reservation_id, event_type, order_id)
    WHERE event_type = 'reverse';
