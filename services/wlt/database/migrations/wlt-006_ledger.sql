-- WLT-005: Ledger Audit
CREATE TABLE IF NOT EXISTS wlt_ledger_entries (
  id                  text PRIMARY KEY DEFAULT ('wled_' || gen_random_uuid()::text),
  entry_type          text NOT NULL,
  actor_id            text NOT NULL,
  actor_type          text NOT NULL DEFAULT 'system',
  order_id            text,
  reference_id        text NOT NULL DEFAULT '',
  reference_type      text NOT NULL DEFAULT '',
  amount_minor_units  bigint NOT NULL DEFAULT 0,
  currency            text NOT NULL DEFAULT 'SAR',
  debit_credit        text NOT NULL DEFAULT 'debit',
  balance_after       bigint NOT NULL DEFAULT 0,
  description         text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_ledger_debit_credit_chk CHECK (debit_credit IN ('debit','credit')),
  CONSTRAINT wlt_ledger_actor_type_chk CHECK (actor_type IN ('client','partner','captain','system','platform'))
);

CREATE INDEX IF NOT EXISTS wlt_ledger_actor_idx ON wlt_ledger_entries(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wlt_ledger_order_idx ON wlt_ledger_entries(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS wlt_ledger_type_idx ON wlt_ledger_entries(entry_type, created_at DESC);
