-- DSH-065: coupon funding policy and WLT funding projection.
--
-- DSH owns the commercial policy and discount calculation. WLT owns the
-- monetary reservation lifecycle. The columns below persist the approved split
-- and opaque WLT reservation reference; they are not a financial ledger.

ALTER TABLE dsh_coupons
    ADD COLUMN IF NOT EXISTS funding_source TEXT NOT NULL DEFAULT 'platform'
        CHECK (funding_source IN ('platform', 'partner', 'shared')),
    ADD COLUMN IF NOT EXISTS platform_share_bps INTEGER NOT NULL DEFAULT 10000
        CHECK (platform_share_bps >= 0 AND platform_share_bps <= 10000),
    ADD COLUMN IF NOT EXISTS funding_partner_id TEXT
        REFERENCES dsh_partners(id) ON DELETE RESTRICT;

ALTER TABLE dsh_coupons
    DROP CONSTRAINT IF EXISTS dsh_coupons_funding_policy_chk;
ALTER TABLE dsh_coupons
    ADD CONSTRAINT dsh_coupons_funding_policy_chk CHECK (
        (funding_source = 'platform' AND platform_share_bps = 10000 AND funding_partner_id IS NULL)
        OR
        (funding_source = 'partner' AND platform_share_bps = 0 AND funding_partner_id IS NOT NULL)
        OR
        (funding_source = 'shared' AND platform_share_bps > 0 AND platform_share_bps < 10000 AND funding_partner_id IS NOT NULL)
    );

ALTER TABLE dsh_coupon_redemptions
    ADD COLUMN IF NOT EXISTS platform_funded_minor_units BIGINT NOT NULL DEFAULT 0
        CHECK (platform_funded_minor_units >= 0),
    ADD COLUMN IF NOT EXISTS partner_funded_minor_units BIGINT NOT NULL DEFAULT 0
        CHECK (partner_funded_minor_units >= 0),
    ADD COLUMN IF NOT EXISTS funding_partner_id TEXT
        REFERENCES dsh_partners(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS funding_status TEXT NOT NULL DEFAULT 'not_required'
        CHECK (funding_status IN (
            'not_required', 'pending', 'reserved', 'committed',
            'released', 'reversed', 'failed'
        )),
    ADD COLUMN IF NOT EXISTS wlt_funding_reservation_id TEXT,
    ADD COLUMN IF NOT EXISTS funding_failure_code TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS funding_updated_at TIMESTAMPTZ;

ALTER TABLE dsh_coupon_redemptions
    DROP CONSTRAINT IF EXISTS dsh_coupon_redemptions_funding_split_chk;
ALTER TABLE dsh_coupon_redemptions
    ADD CONSTRAINT dsh_coupon_redemptions_funding_split_chk CHECK (
        funding_status = 'not_required'
        OR platform_funded_minor_units + partner_funded_minor_units = discount_minor_units
    );

ALTER TABLE dsh_coupon_redemptions
    DROP CONSTRAINT IF EXISTS dsh_coupon_redemptions_partner_funding_chk;
ALTER TABLE dsh_coupon_redemptions
    ADD CONSTRAINT dsh_coupon_redemptions_partner_funding_chk CHECK (
        (partner_funded_minor_units = 0 AND funding_partner_id IS NULL)
        OR
        (partner_funded_minor_units > 0 AND funding_partner_id IS NOT NULL)
    );

ALTER TABLE dsh_coupon_redemptions
    DROP CONSTRAINT IF EXISTS dsh_coupon_redemptions_wlt_reference_chk;
ALTER TABLE dsh_coupon_redemptions
    ADD CONSTRAINT dsh_coupon_redemptions_wlt_reference_chk CHECK (
        funding_status NOT IN ('reserved', 'committed', 'released', 'reversed')
        OR (wlt_funding_reservation_id IS NOT NULL AND btrim(wlt_funding_reservation_id) <> '')
    );

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_coupon_redemption_wlt_funding
    ON dsh_coupon_redemptions(wlt_funding_reservation_id)
    WHERE wlt_funding_reservation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_coupon_redemption_funding_status
    ON dsh_coupon_redemptions(funding_status, funding_updated_at DESC);

CREATE OR REPLACE FUNCTION dsh_guard_coupon_funding_projection()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.funding_status IN ('committed', 'released', 'reversed')
       AND NEW.funding_status <> OLD.funding_status THEN
        RAISE EXCEPTION 'terminal coupon funding projection cannot transition'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.wlt_funding_reservation_id IS NOT NULL
       AND NEW.wlt_funding_reservation_id IS DISTINCT FROM OLD.wlt_funding_reservation_id THEN
        RAISE EXCEPTION 'WLT funding reservation reference is immutable'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.funding_status <> 'not_required'
       AND ROW(
            NEW.platform_funded_minor_units,
            NEW.partner_funded_minor_units,
            NEW.funding_partner_id
       ) IS DISTINCT FROM ROW(
            OLD.platform_funded_minor_units,
            OLD.partner_funded_minor_units,
            OLD.funding_partner_id
       ) THEN
        RAISE EXCEPTION 'coupon funding split is immutable after reservation begins'
            USING ERRCODE = '23514';
    END IF;

    NEW.funding_updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_guard_coupon_funding_projection
    ON dsh_coupon_redemptions;
CREATE TRIGGER trg_dsh_guard_coupon_funding_projection
BEFORE UPDATE OF platform_funded_minor_units, partner_funded_minor_units,
    funding_partner_id, funding_status, wlt_funding_reservation_id
ON dsh_coupon_redemptions
FOR EACH ROW EXECUTE FUNCTION dsh_guard_coupon_funding_projection();
