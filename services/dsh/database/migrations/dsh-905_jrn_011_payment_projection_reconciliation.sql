-- JRN-011 / FS-18: strengthen business order numbers and make the WLT
-- payment projection continuously reconcilable without financial execution.
BEGIN;

ALTER TABLE dsh_orders
  ADD COLUMN IF NOT EXISTS payment_projection_source_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_projection_reconciled_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS dsh_order_payment_projection_reconciliation (
  order_id UUID PRIMARY KEY REFERENCES dsh_orders(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  wlt_payment_session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','retry','scheduled','paused')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_expires_at TIMESTAMPTZ,
  last_source_status TEXT NOT NULL DEFAULT '',
  last_source_updated_at TIMESTAMPTZ,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, wlt_payment_session_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_order_payment_reconciliation_due
  ON dsh_order_payment_projection_reconciliation(status, next_attempt_at, updated_at)
  WHERE status IN ('pending','retry','scheduled','processing');

INSERT INTO dsh_order_payment_projection_reconciliation
  (order_id, tenant_id, wlt_payment_session_id, status, next_attempt_at)
SELECT id, tenant_id, wlt_payment_ref_id, 'pending', NOW()
FROM dsh_orders
WHERE wlt_payment_ref_id <> ''
ON CONFLICT (order_id) DO NOTHING;

CREATE OR REPLACE FUNCTION dsh_jrn011_schedule_payment_projection()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.wlt_payment_ref_id <> '' THEN
    INSERT INTO dsh_order_payment_projection_reconciliation
      (order_id, tenant_id, wlt_payment_session_id, status, next_attempt_at)
    VALUES
      (NEW.id, NEW.tenant_id, NEW.wlt_payment_ref_id, 'pending', NOW())
    ON CONFLICT (order_id) DO UPDATE
      SET tenant_id=EXCLUDED.tenant_id,
          wlt_payment_session_id=EXCLUDED.wlt_payment_session_id,
          status='pending',
          next_attempt_at=NOW(),
          updated_at=NOW();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dsh_jrn011_schedule_payment_projection ON dsh_orders;
CREATE TRIGGER trg_dsh_jrn011_schedule_payment_projection
AFTER INSERT ON dsh_orders
FOR EACH ROW EXECUTE FUNCTION dsh_jrn011_schedule_payment_projection();

-- Replace the prior eight-character suffix for future orders. Existing numbers
-- remain immutable. Twelve UUID hexadecimal characters provide a materially
-- larger collision space while the tenant unique index remains authoritative.
CREATE OR REPLACE FUNCTION dsh_jrn011_apply_order_truth()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  checkout_row RECORD;
BEGIN
  SELECT ci.delivery_address_id, ci.delivery_address, ci.state, ci.payment_method,
         ci.wlt_payment_session_id, ci.updated_at
  INTO checkout_row
  FROM dsh_checkout_intents ci
  WHERE ci.id = NEW.checkout_intent_id AND ci.tenant_id = NEW.tenant_id
  FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'checkout intent is outside order tenant'; END IF;

  NEW.order_number := COALESCE(NULLIF(NEW.order_number, ''),
    'ORD-' || TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYMMDD') || '-' ||
    UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', '') FROM 1 FOR 12)));
  NEW.correlation_id := COALESCE(NULLIF(NEW.correlation_id, ''), 'order:' || NEW.id::text);
  NEW.delivery_address_id := checkout_row.delivery_address_id;
  NEW.delivery_address_snapshot := jsonb_strip_nulls(jsonb_build_object(
    'addressId', checkout_row.delivery_address_id,
    'formattedAddress', NULLIF(checkout_row.delivery_address, '')
  ));
  NEW.payment_status_projection := CASE
    WHEN checkout_row.state = 'payment_confirmed' THEN 'confirmed'
    WHEN checkout_row.payment_method = 'cod' AND checkout_row.state IN ('payment_pending','confirmed') THEN 'cash_due'
    ELSE 'unknown'
  END;
  NEW.payment_projection_updated_at := checkout_row.updated_at;
  NEW.payment_projection_source_updated_at := checkout_row.updated_at;
  NEW.payment_projection_reconciled_at := NOW();
  RETURN NEW;
END $$;

COMMIT;
