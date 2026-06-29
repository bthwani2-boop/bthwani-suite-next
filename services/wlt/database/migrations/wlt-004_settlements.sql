-- WLT-003: Settlement
CREATE TABLE IF NOT EXISTS wlt_settlements (
  id                  text PRIMARY KEY DEFAULT ('wset_' || gen_random_uuid()::text),
  partner_id          text NOT NULL,
  period_start        date NOT NULL,
  period_end          date NOT NULL,
  gross_amount        bigint NOT NULL DEFAULT 0,
  platform_fee        bigint NOT NULL DEFAULT 0,
  net_amount          bigint NOT NULL DEFAULT 0,
  currency            text NOT NULL DEFAULT 'YER',
  order_count         int NOT NULL DEFAULT 0,
  status              text NOT NULL DEFAULT 'pending',
  settled_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_settlements_status_chk CHECK (status IN ('pending','processing','settled','failed','reversed'))
);

CREATE INDEX IF NOT EXISTS wlt_settlements_partner_idx ON wlt_settlements(partner_id, period_start DESC);
