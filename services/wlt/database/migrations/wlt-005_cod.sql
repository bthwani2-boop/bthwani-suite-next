-- WLT-004: COD Commission
CREATE TABLE IF NOT EXISTS wlt_cod_records (
  id                  text PRIMARY KEY DEFAULT ('wcod_' || gen_random_uuid()::text),
  order_id            text NOT NULL UNIQUE,
  captain_id          text NOT NULL,
  partner_id          text NOT NULL,
  amount_minor_units  bigint NOT NULL DEFAULT 0,
  currency            text NOT NULL DEFAULT 'SAR',
  status              text NOT NULL DEFAULT 'pending_collection',
  collected_at        timestamptz,
  remitted_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_cod_records_status_chk CHECK (status IN ('pending_collection','collected','remitted','disputed','resolved'))
);

CREATE INDEX IF NOT EXISTS wlt_cod_records_captain_idx ON wlt_cod_records(captain_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wlt_cod_records_partner_idx ON wlt_cod_records(partner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wlt_commissions (
  id                  text PRIMARY KEY DEFAULT ('wcom_' || gen_random_uuid()::text),
  order_id            text NOT NULL,
  captain_id          text NOT NULL,
  partner_id          text NOT NULL,
  commission_type     text NOT NULL DEFAULT 'delivery_fee',
  amount_minor_units  bigint NOT NULL DEFAULT 0,
  currency            text NOT NULL DEFAULT 'SAR',
  status              text NOT NULL DEFAULT 'pending',
  settled_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_commissions_type_chk CHECK (commission_type IN ('delivery_fee','platform_fee','cod_fee','partner_discount')),
  CONSTRAINT wlt_commissions_status_chk CHECK (status IN ('pending','confirmed','settled','reversed'))
);

CREATE INDEX IF NOT EXISTS wlt_commissions_order_idx ON wlt_commissions(order_id);
CREATE INDEX IF NOT EXISTS wlt_commissions_captain_idx ON wlt_commissions(captain_id, created_at DESC);
