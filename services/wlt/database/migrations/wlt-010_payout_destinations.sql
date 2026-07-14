-- WLT-010: Payout Destinations
-- Sovereign store for partner bank / mobile-money payout details.
-- DSH holds only the reference ID and masked display values.
-- DSH sends bank data here; WLT is the single source of truth.

CREATE TABLE IF NOT EXISTS wlt_payout_destinations (
  id                              text PRIMARY KEY DEFAULT ('wpd_' || gen_random_uuid()::text),
  partner_id                      text NOT NULL,
  beneficiary_name                text NOT NULL DEFAULT '',
  bank_name                       text NOT NULL DEFAULT '',
  bank_branch                     text NOT NULL DEFAULT '',
  account_number                  text NOT NULL DEFAULT '',
  iban                            text NOT NULL DEFAULT '',
  payout_mobile_number            text NOT NULL DEFAULT '',
  settlement_preference           text NOT NULL DEFAULT 'bank'
                                    CHECK (settlement_preference IN ('bank', 'mobile_money', 'manual')),
  bank_account_holder_matches_owner boolean NOT NULL DEFAULT false,
  bank_notes                      text NOT NULL DEFAULT '',
  masked_account_number           text NOT NULL DEFAULT '',
  masked_iban                     text NOT NULL DEFAULT '',
  masked_mobile_number            text NOT NULL DEFAULT '',
  active                          boolean NOT NULL DEFAULT true,
  created_by_actor_id             text NOT NULL DEFAULT '',
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wlt_payout_destinations_partner_idx
  ON wlt_payout_destinations(partner_id, created_at DESC)
  WHERE active = true;
