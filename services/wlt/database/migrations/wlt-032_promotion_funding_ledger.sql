-- WLT-032: sovereign promotion/coupon funding ledger.
--
-- DSH owns eligibility and discount calculation. WLT owns the financial split
-- between platform and partner, plus the reserve/commit/release lifecycle.
-- DSH identifiers remain opaque external references; no cross-service foreign
-- keys are created.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS wlt_promotion_funding_reservations (
    id TEXT PRIMARY KEY DEFAULT ('pfr_' || replace(gen_random_uuid()::text, '-', '')),
    tenant_id TEXT NOT NULL,
    external_reference TEXT NOT NULL,
    checkout_intent_id TEXT NOT NULL,
    coupon_redemption_id TEXT NOT NULL,
    coupon_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    partner_id TEXT,
    platform_funded_minor_units BIGINT NOT NULL DEFAULT 0
        CHECK (platform_funded_minor_units >= 0),
    partner_funded_minor_units BIGINT NOT NULL DEFAULT 0
        CHECK (partner_funded_minor_units >= 0),
    total_discount_minor_units BIGINT NOT NULL
        CHECK (total_discount_minor_units > 0),
    currency TEXT NOT NULL DEFAULT 'YER' CHECK (btrim(currency) <> ''),
    status TEXT NOT NULL DEFAULT 'reserved'
        CHECK (status IN ('reserved', 'committed', 'released', 'reversed')),
    order_id TEXT,
    idempotency_key TEXT NOT NULL,
    correlation_id TEXT NOT NULL,
    committed_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    reversed_at TIMESTAMPTZ,
    release_reason TEXT NOT NULL DEFAULT '',
    reversal_reason TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT wlt_promotion_funding_split_chk CHECK (
        platform_funded_minor_units + partner_funded_minor_units = total_discount_minor_units
    ),
    CONSTRAINT wlt_promotion_partner_source_chk CHECK (
        (partner_funded_minor_units = 0 AND partner_id IS NULL)
        OR
        (partner_funded_minor_units > 0 AND partner_id IS NOT NULL AND btrim(partner_id) <> '')
    ),
    CONSTRAINT wlt_promotion_commit_order_chk CHECK (
        status <> 'committed' OR (order_id IS NOT NULL AND btrim(order_id) <> '' AND committed_at IS NOT NULL)
    ),
    CONSTRAINT wlt_promotion_release_chk CHECK (
        status <> 'released' OR released_at IS NOT NULL
    ),
    CONSTRAINT wlt_promotion_reverse_chk CHECK (
        status <> 'reversed' OR (order_id IS NOT NULL AND reversed_at IS NOT NULL)
    ),
    UNIQUE (tenant_id, external_reference),
    UNIQUE (tenant_id, checkout_intent_id),
    UNIQUE (tenant_id, coupon_redemption_id),
    UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_wlt_promotion_funding_status
    ON wlt_promotion_funding_reservations(tenant_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_wlt_promotion_funding_partner
    ON wlt_promotion_funding_reservations(tenant_id, partner_id, status)
    WHERE partner_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS wlt_promotion_funding_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id TEXT NOT NULL
        REFERENCES wlt_promotion_funding_reservations(id) ON DELETE RESTRICT,
    event_type TEXT NOT NULL
        CHECK (event_type IN ('reserved', 'committed', 'released', 'reversed')),
    from_status TEXT,
    to_status TEXT NOT NULL,
    order_id TEXT,
    actor_service TEXT NOT NULL DEFAULT 'dsh' CHECK (actor_service = 'dsh'),
    idempotency_key TEXT NOT NULL UNIQUE,
    correlation_id TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wlt_promotion_funding_events_reservation
    ON wlt_promotion_funding_events(reservation_id, created_at DESC);

CREATE OR REPLACE FUNCTION wlt_guard_promotion_funding_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF ROW(
        NEW.tenant_id,
        NEW.external_reference,
        NEW.checkout_intent_id,
        NEW.coupon_redemption_id,
        NEW.coupon_id,
        NEW.client_id,
        NEW.partner_id,
        NEW.platform_funded_minor_units,
        NEW.partner_funded_minor_units,
        NEW.total_discount_minor_units,
        NEW.currency,
        NEW.idempotency_key
    ) IS DISTINCT FROM ROW(
        OLD.tenant_id,
        OLD.external_reference,
        OLD.checkout_intent_id,
        OLD.coupon_redemption_id,
        OLD.coupon_id,
        OLD.client_id,
        OLD.partner_id,
        OLD.platform_funded_minor_units,
        OLD.partner_funded_minor_units,
        OLD.total_discount_minor_units,
        OLD.currency,
        OLD.idempotency_key
    ) THEN
        RAISE EXCEPTION 'promotion funding identity and split are immutable'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.status = NEW.status THEN
        NEW.updated_at := NOW();
        RETURN NEW;
    END IF;

    IF OLD.status = 'reserved' AND NEW.status NOT IN ('committed', 'released') THEN
        RAISE EXCEPTION 'invalid promotion funding transition from reserved'
            USING ERRCODE = '23514';
    ELSIF OLD.status = 'committed' AND NEW.status <> 'reversed' THEN
        RAISE EXCEPTION 'invalid promotion funding transition from committed'
            USING ERRCODE = '23514';
    ELSIF OLD.status IN ('released', 'reversed') THEN
        RAISE EXCEPTION 'terminal promotion funding reservation cannot transition'
            USING ERRCODE = '23514';
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wlt_guard_promotion_funding_update
    ON wlt_promotion_funding_reservations;
CREATE TRIGGER trg_wlt_guard_promotion_funding_update
BEFORE UPDATE ON wlt_promotion_funding_reservations
FOR EACH ROW EXECUTE FUNCTION wlt_guard_promotion_funding_update();

CREATE OR REPLACE FUNCTION wlt_reject_promotion_funding_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'wlt_promotion_funding_events is append-only'
        USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS trg_wlt_promotion_funding_events_no_update
    ON wlt_promotion_funding_events;
CREATE TRIGGER trg_wlt_promotion_funding_events_no_update
BEFORE UPDATE ON wlt_promotion_funding_events
FOR EACH ROW EXECUTE FUNCTION wlt_reject_promotion_funding_event_mutation();

DROP TRIGGER IF EXISTS trg_wlt_promotion_funding_events_no_delete
    ON wlt_promotion_funding_events;
CREATE TRIGGER trg_wlt_promotion_funding_events_no_delete
BEFORE DELETE ON wlt_promotion_funding_events
FOR EACH ROW EXECUTE FUNCTION wlt_reject_promotion_funding_event_mutation();
