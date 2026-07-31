-- WLT-104: field commission policy by partner category.
-- WLT owns policy versions and calculated amounts. DSH sends only immutable
-- visit, partner and category evidence captured at visit completion.

CREATE TABLE IF NOT EXISTS wlt_field_commission_category_policy_versions (
  policy_id                 text NOT NULL CHECK (btrim(policy_id) <> ''),
  partner_category          text NOT NULL CHECK (btrim(partner_category) <> ''),
  version                   bigint NOT NULL CHECK (version > 0),
  fixed_amount_minor_units  bigint NOT NULL CHECK (fixed_amount_minor_units > 0),
  currency                  text NOT NULL DEFAULT 'YER' CHECK (char_length(currency) = 3),
  status                    text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  change_reason             text NOT NULL CHECK (btrim(change_reason) <> ''),
  updated_by_actor_id       text NOT NULL CHECK (btrim(updated_by_actor_id) <> ''),
  created_at                timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (policy_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS wlt_field_commission_category_policy_active_uidx
  ON wlt_field_commission_category_policy_versions(partner_category)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS wlt_field_commission_category_policy_history_idx
  ON wlt_field_commission_category_policy_versions(partner_category, version DESC);

ALTER TABLE wlt_commissions
  ADD COLUMN IF NOT EXISTS partner_category text NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS wlt_commissions_partner_category_idx
  ON wlt_commissions(operator_context_id, partner_category, created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wlt_field_commission_category_policy_versions' AND column_name = 'operator_context_id') THEN
    EXECUTE '
      INSERT INTO wlt_field_commission_category_policy_versions(
        operator_context_id,policy_id,partner_category,version,fixed_amount_minor_units,currency,status,
        change_reason,updated_by_actor_id
      )
      SELECT
        ''legacy-unscoped'', ''field-category-default'', ''default'', 1,
        fixed_amount_minor_units, currency, ''active'',
        ''default category policy migrated from active field policy'',
        updated_by_actor_id
      FROM wlt_commission_policy_versions
      WHERE commission_type=''field_visit_fee''
        AND source_type=''field_visit''
        AND beneficiary_actor_type=''field''
        AND status=''active''
      ORDER BY version DESC
      LIMIT 1
      ON CONFLICT DO NOTHING;
    ';
  ELSE
    EXECUTE '
      INSERT INTO wlt_field_commission_category_policy_versions(
        policy_id,partner_category,version,fixed_amount_minor_units,currency,status,
        change_reason,updated_by_actor_id
      )
      SELECT
        ''field-category-default'', ''default'', 1,
        fixed_amount_minor_units, currency, ''active'',
        ''default category policy migrated from active field policy'',
        updated_by_actor_id
      FROM wlt_commission_policy_versions
      WHERE commission_type=''field_visit_fee''
        AND source_type=''field_visit''
        AND beneficiary_actor_type=''field''
        AND status=''active''
      ORDER BY version DESC
      LIMIT 1
      ON CONFLICT DO NOTHING;
    ';
  END IF;
END $$;

COMMENT ON TABLE wlt_field_commission_category_policy_versions IS
  'Versioned WLT-owned fixed commission policy selected by DSH partner category evidence.';
