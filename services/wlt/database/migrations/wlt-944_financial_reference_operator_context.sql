-- WLT-944: bind financial reference projections to authoritative OperatorContext.
--
-- Historical reference rows predate OperatorContext isolation and cannot be
-- assigned to a real context without evidence. Preserve them as legacy-unscoped,
-- but make every new projection write context-bound and make current readers
-- require the authenticated OperatorContext.
BEGIN;

ALTER TABLE wlt_payment_status_refs
  ADD COLUMN IF NOT EXISTS operator_context_id text;
ALTER TABLE wlt_settlement_status_refs
  ADD COLUMN IF NOT EXISTS operator_context_id text;
ALTER TABLE wlt_refund_status_refs
  ADD COLUMN IF NOT EXISTS operator_context_id text;
ALTER TABLE wlt_field_commission_refs
  ADD COLUMN IF NOT EXISTS operator_context_id text;

UPDATE wlt_payment_status_refs
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';
UPDATE wlt_settlement_status_refs
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';
UPDATE wlt_refund_status_refs
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';
UPDATE wlt_field_commission_refs
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';

ALTER TABLE wlt_payment_status_refs
  ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE wlt_settlement_status_refs
  ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE wlt_refund_status_refs
  ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE wlt_field_commission_refs
  ALTER COLUMN operator_context_id SET NOT NULL;

ALTER TABLE wlt_payment_status_refs
  ADD CONSTRAINT wlt_payment_status_refs_live_context_chk
  CHECK (operator_context_id <> 'legacy-unscoped') NOT VALID;
ALTER TABLE wlt_settlement_status_refs
  ADD CONSTRAINT wlt_settlement_status_refs_live_context_chk
  CHECK (operator_context_id <> 'legacy-unscoped') NOT VALID;
ALTER TABLE wlt_refund_status_refs
  ADD CONSTRAINT wlt_refund_status_refs_live_context_chk
  CHECK (operator_context_id <> 'legacy-unscoped') NOT VALID;
ALTER TABLE wlt_field_commission_refs
  ADD CONSTRAINT wlt_field_commission_refs_live_context_chk
  CHECK (operator_context_id <> 'legacy-unscoped') NOT VALID;

CREATE INDEX IF NOT EXISTS wlt_payment_status_refs_context_order_idx
  ON wlt_payment_status_refs (operator_context_id, order_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS wlt_settlement_status_refs_context_order_idx
  ON wlt_settlement_status_refs (operator_context_id, order_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS wlt_refund_status_refs_context_order_idx
  ON wlt_refund_status_refs (operator_context_id, order_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS wlt_field_commission_refs_context_partner_idx
  ON wlt_field_commission_refs (operator_context_id, partner_id, updated_at DESC);

-- Refund lifecycle code already creates/updates the canonical wlt_refunds row
-- in the same transaction before writing these derived status projections.
-- Bind legacy call sites to that canonical authority and fail closed whenever
-- an order is not owned by exactly one OperatorContext.
CREATE OR REPLACE FUNCTION wlt_bind_refund_reference_operator_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  resolved_context text;
  context_count integer;
BEGIN
  IF NEW.operator_context_id IS NOT NULL AND btrim(NEW.operator_context_id) <> '' THEN
    RETURN NEW;
  END IF;

  SELECT min(operator_context_id), count(DISTINCT operator_context_id)
    INTO resolved_context, context_count
  FROM wlt_refunds
  WHERE order_id = NEW.order_id;

  IF context_count <> 1 OR resolved_context IS NULL OR btrim(resolved_context) = '' THEN
    RAISE EXCEPTION 'financial reference operator context is ambiguous or missing for order %', NEW.order_id;
  END IF;

  NEW.operator_context_id := resolved_context;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wlt_refund_status_refs_context_bind ON wlt_refund_status_refs;
CREATE TRIGGER wlt_refund_status_refs_context_bind
BEFORE INSERT ON wlt_refund_status_refs
FOR EACH ROW EXECUTE FUNCTION wlt_bind_refund_reference_operator_context();

DROP TRIGGER IF EXISTS wlt_payment_status_refs_refund_context_bind ON wlt_payment_status_refs;
CREATE TRIGGER wlt_payment_status_refs_refund_context_bind
BEFORE INSERT ON wlt_payment_status_refs
FOR EACH ROW EXECUTE FUNCTION wlt_bind_refund_reference_operator_context();

COMMIT;
