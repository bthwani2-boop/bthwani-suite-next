-- WLT-002: Refund
CREATE TABLE IF NOT EXISTS wlt_refunds (
  id                  text PRIMARY KEY DEFAULT ('wref_' || gen_random_uuid()::text),
  payment_session_id  text NOT NULL REFERENCES wlt_payment_sessions(id),
  order_id            text NOT NULL,
  client_id           text NOT NULL,
  amount_minor_units  bigint NOT NULL DEFAULT 0,
  currency            text NOT NULL DEFAULT 'SAR',
  reason              text NOT NULL DEFAULT '',
  status              text NOT NULL DEFAULT 'requested',
  resolved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_refunds_status_chk CHECK (status IN ('requested','approved','processing','completed','rejected','reversed'))
);

CREATE INDEX IF NOT EXISTS wlt_refunds_payment_session_idx ON wlt_refunds(payment_session_id);
CREATE INDEX IF NOT EXISTS wlt_refunds_order_idx ON wlt_refunds(order_id);
CREATE INDEX IF NOT EXISTS wlt_refunds_client_idx ON wlt_refunds(client_id, created_at DESC);
