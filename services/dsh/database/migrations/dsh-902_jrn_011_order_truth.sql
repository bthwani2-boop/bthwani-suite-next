-- JRN-011 / FS-05: immutable order truth, creation idempotency and event outbox.
BEGIN;

ALTER TABLE dsh_orders
  ADD COLUMN IF NOT EXISTS order_number TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address_id TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_status_projection TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS payment_projection_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0);

UPDATE dsh_orders o
SET order_number = COALESCE(NULLIF(o.order_number, ''), 'ORD-' || UPPER(SUBSTRING(REPLACE(o.id::text, '-', '') FROM 1 FOR 12))),
    correlation_id = COALESCE(NULLIF(o.correlation_id, ''), 'order:' || o.id::text),
    delivery_address_id = COALESCE(o.delivery_address_id, ci.delivery_address_id),
    delivery_address_snapshot = CASE
      WHEN o.delivery_address_snapshot = '{}'::jsonb THEN jsonb_strip_nulls(jsonb_build_object(
        'addressId', ci.delivery_address_id,
        'formattedAddress', NULLIF(ci.delivery_address, '')
      ))
      ELSE o.delivery_address_snapshot
    END,
    payment_status_projection = CASE
      WHEN o.payment_status_projection <> 'unknown' THEN o.payment_status_projection
      WHEN ci.state = 'payment_confirmed' THEN 'confirmed'
      WHEN ci.payment_method = 'cod' AND ci.state IN ('payment_pending', 'confirmed') THEN 'cash_due'
      ELSE 'unknown'
    END,
    payment_projection_updated_at = COALESCE(o.payment_projection_updated_at, ci.updated_at)
FROM dsh_checkout_intents ci
WHERE ci.id = o.checkout_intent_id;

ALTER TABLE dsh_orders
  ALTER COLUMN order_number SET NOT NULL,
  ALTER COLUMN correlation_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_orders_tenant_order_number
  ON dsh_orders(tenant_id, order_number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_orders_tenant_correlation
  ON dsh_orders(tenant_id, correlation_id);
CREATE INDEX IF NOT EXISTS idx_dsh_orders_tenant_client_created
  ON dsh_orders(tenant_id, client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_orders_tenant_store_created
  ON dsh_orders(tenant_id, store_id, created_at DESC);

ALTER TABLE dsh_order_items
  ADD COLUMN IF NOT EXISTS item_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS line_total_minor_units BIGINT NOT NULL DEFAULT 0 CHECK (line_total_minor_units >= 0);

UPDATE dsh_order_items
SET item_snapshot = CASE WHEN item_snapshot = '{}'::jsonb THEN jsonb_build_object(
      'productId', product_id,
      'productName', product_name,
      'quantity', quantity,
      'unitPrice', unit_price
    ) ELSE item_snapshot END,
    line_total_minor_units = CASE WHEN line_total_minor_units = 0
      THEN ROUND(unit_price * 100)::BIGINT * quantity
      ELSE line_total_minor_units END;

ALTER TABLE dsh_order_status_events
  ADD COLUMN IF NOT EXISTS tenant_id TEXT,
  ADD COLUMN IF NOT EXISTS actor_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'order.status_changed',
  ADD COLUMN IF NOT EXISTS correlation_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS causation_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS order_version INTEGER NOT NULL DEFAULT 1 CHECK (order_version > 0),
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE dsh_order_status_events e
SET tenant_id = o.tenant_id,
    correlation_id = CASE WHEN e.correlation_id = '' THEN o.correlation_id ELSE e.correlation_id END,
    event_type = CASE WHEN e.from_status = '' AND e.to_status = 'pending' THEN 'order.created' ELSE e.event_type END
FROM dsh_orders o
WHERE o.id = e.order_id AND e.tenant_id IS NULL;

ALTER TABLE dsh_order_status_events ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dsh_order_events_tenant_order_created
  ON dsh_order_status_events(tenant_id, order_id, created_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_order_events_order_version_type
  ON dsh_order_status_events(order_id, order_version, event_type);

CREATE TABLE IF NOT EXISTS dsh_order_create_idempotency (
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  checkout_intent_id UUID NOT NULL REFERENCES dsh_checkout_intents(id) ON DELETE RESTRICT,
  request_fingerprint TEXT NOT NULL CHECK (char_length(request_fingerprint) = 64),
  order_id UUID REFERENCES dsh_orders(id) ON DELETE RESTRICT,
  correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, client_id, idempotency_key),
  UNIQUE (tenant_id, checkout_intent_id)
);

CREATE TABLE IF NOT EXISTS dsh_order_event_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  order_id UUID NOT NULL REFERENCES dsh_orders(id) ON DELETE RESTRICT,
  event_id UUID NOT NULL REFERENCES dsh_order_status_events(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  causation_id TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','published','retry','dead_letter')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_dsh_order_outbox_dispatch
  ON dsh_order_event_outbox(status, next_attempt_at, created_at)
  WHERE status IN ('pending','retry');

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
    'ORD-' || TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYMMDD') || '-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', '') FROM 1 FOR 8)));
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
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dsh_jrn011_apply_order_truth ON dsh_orders;
CREATE TRIGGER trg_dsh_jrn011_apply_order_truth
BEFORE INSERT ON dsh_orders
FOR EACH ROW EXECUTE FUNCTION dsh_jrn011_apply_order_truth();

CREATE OR REPLACE FUNCTION dsh_jrn011_protect_order_snapshot()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.checkout_intent_id, NEW.tenant_id, NEW.store_id, NEW.client_id,
         NEW.fulfillment_mode, NEW.order_number, NEW.correlation_id,
         NEW.delivery_address_id, NEW.delivery_address_snapshot,
         NEW.subtotal_minor_units, NEW.discount_minor_units, NEW.total_minor_units,
         NEW.currency, NEW.pricing_snapshot_hash, NEW.coupon_id,
         NEW.coupon_redemption_id, NEW.coupon_code_last4)
     IS DISTINCT FROM
     ROW(OLD.checkout_intent_id, OLD.tenant_id, OLD.store_id, OLD.client_id,
         OLD.fulfillment_mode, OLD.order_number, OLD.correlation_id,
         OLD.delivery_address_id, OLD.delivery_address_snapshot,
         OLD.subtotal_minor_units, OLD.discount_minor_units, OLD.total_minor_units,
         OLD.currency, OLD.pricing_snapshot_hash, OLD.coupon_id,
         OLD.coupon_redemption_id, OLD.coupon_code_last4) THEN
    RAISE EXCEPTION 'JRN-011 order truth snapshot is immutable';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dsh_jrn011_protect_order_snapshot ON dsh_orders;
CREATE TRIGGER trg_dsh_jrn011_protect_order_snapshot
BEFORE UPDATE ON dsh_orders
FOR EACH ROW EXECUTE FUNCTION dsh_jrn011_protect_order_snapshot();

COMMIT;
