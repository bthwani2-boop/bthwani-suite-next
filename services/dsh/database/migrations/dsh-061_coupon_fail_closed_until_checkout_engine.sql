-- DSH-061: fail closed coupon presentation until checkout redemption exists.
--
-- A marketing offer labelled as a coupon is not operational unless checkout
-- pricing validates the code, applies the discount to the authoritative amount,
-- records an idempotent redemption, enforces limits/eligibility, and carries the
-- result into the payment/order snapshot. None of those properties may be
-- inferred from a published marketing card. Until that engine is introduced,
-- coupon offers and store coupon badges are blocked from client publication.

UPDATE dsh_partner_offers
SET status = 'paused',
    margin_risk_note = CASE
        WHEN COALESCE(margin_risk_note, '') = ''
            THEN 'Paused by DSH-061: checkout coupon redemption engine is not operational.'
        ELSE margin_risk_note
    END,
    version = version + 1,
    updated_at = NOW()
WHERE offer_type = 'coupon'
  AND status = 'published'
  AND archived_at IS NULL;

ALTER TABLE dsh_partner_offers
    DROP CONSTRAINT IF EXISTS dsh_partner_offers_coupon_publish_requires_engine_chk;
ALTER TABLE dsh_partner_offers
    ADD CONSTRAINT dsh_partner_offers_coupon_publish_requires_engine_chk
    CHECK (NOT (offer_type = 'coupon' AND status = 'published'));

UPDATE dsh_stores
SET has_coupon_badge = FALSE,
    updated_at = NOW()
WHERE has_coupon_badge = TRUE;

ALTER TABLE dsh_stores
    DROP CONSTRAINT IF EXISTS dsh_stores_coupon_badge_requires_engine_chk;
ALTER TABLE dsh_stores
    ADD CONSTRAINT dsh_stores_coupon_badge_requires_engine_chk
    CHECK (has_coupon_badge = FALSE);

COMMENT ON CONSTRAINT dsh_partner_offers_coupon_publish_requires_engine_chk ON dsh_partner_offers IS
    'Temporary fail-closed gate. Replace only when authoritative checkout coupon validation, pricing snapshot, redemption ledger, eligibility and idempotency are implemented.';
COMMENT ON CONSTRAINT dsh_stores_coupon_badge_requires_engine_chk ON dsh_stores IS
    'Prevents client-visible coupon claims before the checkout redemption engine is operational.';
