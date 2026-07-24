-- DSH-953: dsh_partner_offers.store_id was declared UUID (dsh-020) but
-- dsh_stores.id is TEXT (e.g. "store-test-grocery"); the column could never
-- hold a real store id, and any join between the two tables fails to plan
-- ("operator does not exist: text = uuid"), taking down marketing/home
-- discovery projections that read dsh_partner_offers at all.

DROP TRIGGER IF EXISTS trg_dsh_validate_published_coupon_offer ON dsh_partner_offers;

ALTER TABLE dsh_partner_offers
  ALTER COLUMN store_id TYPE TEXT USING store_id::TEXT;

CREATE TRIGGER trg_dsh_validate_published_coupon_offer
BEFORE INSERT OR UPDATE OF offer_type, status, coupon_id, store_id, archived_at ON dsh_partner_offers
FOR EACH ROW EXECUTE FUNCTION dsh_validate_published_coupon_offer();
