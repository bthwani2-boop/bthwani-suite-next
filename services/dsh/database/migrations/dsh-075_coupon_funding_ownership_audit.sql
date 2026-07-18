-- DSH-075: enforce coupon funding ownership and append-only policy audit.
--
-- Go validates the request before mutation; these database rules provide the
-- final tenant-independent integrity boundary for every writer.

CREATE TABLE IF NOT EXISTS dsh_coupon_funding_policy_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES dsh_coupons(id) ON DELETE RESTRICT,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('funding_policy_created','funding_policy_updated')),
    from_funding_source TEXT,
    to_funding_source TEXT NOT NULL,
    from_platform_share_bps INTEGER,
    to_platform_share_bps INTEGER NOT NULL CHECK (to_platform_share_bps BETWEEN 0 AND 10000),
    from_funding_partner_id TEXT,
    to_funding_partner_id TEXT,
    coupon_version INTEGER NOT NULL CHECK (coupon_version > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_coupon_funding_policy_audit_coupon
    ON dsh_coupon_funding_policy_audit(coupon_id,created_at DESC);

CREATE OR REPLACE FUNCTION dsh_validate_coupon_funding_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    partner_is_active BOOLEAN;
    partner_owns_store BOOLEAN;
BEGIN
    IF NEW.funding_source='platform' THEN
        IF NEW.platform_share_bps<>10000 OR NEW.funding_partner_id IS NOT NULL THEN
            RAISE EXCEPTION 'platform-funded coupon requires full platform share and no partner';
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.store_id IS NULL OR NEW.funding_partner_id IS NULL THEN
        RAISE EXCEPTION 'partner/shared-funded coupon requires store and funding partner';
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM dsh_partners
        WHERE id=NEW.funding_partner_id AND status='active'
    ) INTO partner_is_active;
    IF NOT partner_is_active THEN
        RAISE EXCEPTION 'funding partner must be active';
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM dsh_stores
        WHERE id=NEW.store_id AND partner_id=NEW.funding_partner_id
    ) INTO partner_owns_store;
    IF NOT partner_owns_store THEN
        RAISE EXCEPTION 'funding partner must own coupon store';
    END IF;

    IF NEW.funding_source='partner' AND NEW.platform_share_bps<>0 THEN
        RAISE EXCEPTION 'partner-funded coupon requires zero platform share';
    END IF;
    IF NEW.funding_source='shared'
       AND (NEW.platform_share_bps<=0 OR NEW.platform_share_bps>=10000) THEN
        RAISE EXCEPTION 'shared-funded coupon requires platform share between 1 and 9999';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_validate_coupon_funding_ownership ON dsh_coupons;
CREATE TRIGGER trg_dsh_validate_coupon_funding_ownership
BEFORE INSERT OR UPDATE OF store_id,funding_source,platform_share_bps,funding_partner_id
ON dsh_coupons
FOR EACH ROW
EXECUTE FUNCTION dsh_validate_coupon_funding_ownership();
