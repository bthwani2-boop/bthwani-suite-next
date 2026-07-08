-- DSH-027: Partner bank account metadata (field onboarding).
-- Captured by app-field during onboarding as readiness/metadata only — this
-- is NOT a WLT financial mutation. WLT remains the sole owner of financial
-- truth (ledger/settlement/payment); these columns only record the partner's
-- declared payout details for control-panel review before activation.

ALTER TABLE dsh_partners
    ADD COLUMN IF NOT EXISTS beneficiary_name                  TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS bank_name                          TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS bank_branch                        TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS bank_account_number                TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS bank_iban                          TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS payout_mobile_number                TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS settlement_preference               TEXT NOT NULL DEFAULT ''
                                CHECK (settlement_preference IN ('', 'bank_transfer', 'mobile_wallet')),
    ADD COLUMN IF NOT EXISTS bank_account_holder_matches_owner   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS bank_notes                          TEXT NOT NULL DEFAULT '';
