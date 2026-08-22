-- DSH-1011: durable reconciliation for an ambiguous WLT promotion-funding reserve.
-- The reserve request is retried with its original idempotency key and any
-- confirmed reservation is immediately released. No local DSH amount becomes
-- authoritative; WLT remains the financial owner.

ALTER TABLE dsh_promotion_funding_outbox
  ALTER COLUMN wlt_funding_reservation_id DROP NOT NULL;

ALTER TABLE dsh_promotion_funding_outbox
  DROP CONSTRAINT IF EXISTS dsh_promotion_funding_outbox_event_type_check;

ALTER TABLE dsh_promotion_funding_outbox
  ADD CONSTRAINT dsh_promotion_funding_outbox_event_type_check
  CHECK (event_type IN ('commit', 'release', 'reverse', 'reserve_then_release'));

ALTER TABLE dsh_promotion_funding_outbox
  DROP CONSTRAINT IF EXISTS dsh_promotion_funding_outbox_order_chk;

ALTER TABLE dsh_promotion_funding_outbox
  ADD CONSTRAINT dsh_promotion_funding_outbox_order_chk CHECK (
    (event_type = 'release' AND order_id IS NULL AND btrim(reason) <> '' AND btrim(wlt_funding_reservation_id) <> '')
    OR
    (event_type = 'commit' AND order_id IS NOT NULL AND btrim(wlt_funding_reservation_id) <> '')
    OR
    (event_type = 'reverse' AND order_id IS NOT NULL AND btrim(reason) <> '' AND btrim(wlt_funding_reservation_id) <> '')
    OR
    (event_type = 'reserve_then_release' AND order_id IS NULL AND btrim(reason) <> '' AND wlt_funding_reservation_id IS NULL)
  );
