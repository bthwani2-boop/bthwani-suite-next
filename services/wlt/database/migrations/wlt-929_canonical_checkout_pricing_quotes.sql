-- WLT-929: persist the canonical checkout quote before a payment session can
-- reference it. A session may therefore never turn a DSH-derived hash into a
-- financial fact without a WLT-owned immutable record behind it.

BEGIN;

CREATE TABLE IF NOT EXISTS wlt_checkout_pricing_quotes (
  id text PRIMARY KEY DEFAULT ('wlpq_' || gen_random_uuid()::text),
  operator_context_id text NOT NULL,
  checkout_intent_id text NOT NULL,
  client_id text NOT NULL,
  store_id text NOT NULL,
  cart_snapshot_hash text NOT NULL,
  quote_hash text NOT NULL,
  quote_version integer NOT NULL CHECK (quote_version > 0),
  expires_at timestamptz NOT NULL,
  subtotal_minor_units bigint NOT NULL CHECK (subtotal_minor_units >= 0),
  delivery_fee_minor_units bigint NOT NULL CHECK (delivery_fee_minor_units >= 0),
  service_fee_minor_units bigint NOT NULL CHECK (service_fee_minor_units >= 0),
  tax_minor_units bigint NOT NULL CHECK (tax_minor_units >= 0),
  discount_minor_units bigint NOT NULL CHECK (discount_minor_units >= 0),
  rounding_minor_units bigint NOT NULL,
  total_minor_units bigint NOT NULL CHECK (total_minor_units > 0),
  currency text NOT NULL,
  lines jsonb NOT NULL,
  allocation jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT wlt_checkout_pricing_quotes_identity_uniq
    UNIQUE (operator_context_id, checkout_intent_id),
  CONSTRAINT wlt_checkout_pricing_quotes_scope_chk CHECK (
    btrim(operator_context_id) <> '' AND btrim(checkout_intent_id) <> ''
    AND btrim(client_id) <> '' AND btrim(store_id) <> ''
    AND btrim(cart_snapshot_hash) <> '' AND btrim(quote_hash) <> ''
    AND char_length(currency) = 3
  )
);

CREATE OR REPLACE FUNCTION wlt_reject_checkout_pricing_quote_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'canonical checkout pricing quotes are immutable';
END;
$$;

DROP TRIGGER IF EXISTS wlt_checkout_pricing_quotes_immutable
  ON wlt_checkout_pricing_quotes;
CREATE TRIGGER wlt_checkout_pricing_quotes_immutable
BEFORE UPDATE OR DELETE ON wlt_checkout_pricing_quotes
FOR EACH ROW EXECUTE FUNCTION wlt_reject_checkout_pricing_quote_mutation();

COMMENT ON TABLE wlt_checkout_pricing_quotes IS
  'Immutable WLT-owned checkout money facts; payment sessions must verify this record before creation.';

COMMIT;
