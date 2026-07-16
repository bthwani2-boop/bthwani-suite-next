-- WLT-018: Encrypt payout destination bank/IBAN/mobile-money data at rest.
--
-- account_number, iban, and payout_mobile_number were previously stored as
-- plain text. This adds bytea columns holding pgp_sym_encrypt(...) ciphertext
-- instead. The encryption key is supplied by application code from
-- WLT_PAYOUT_ENCRYPTION_KEY at query time (bound as a parameter, never
-- embedded in SQL text or committed to a migration file).
--
-- The old plaintext columns are kept (additive, per docs/MIGRATION_SAFETY.md)
-- rather than dropped -- application code stops writing new plaintext into
-- them (see internal/payout/payout.go) but they are not deleted here so any
-- existing data is not destroyed. A follow-up migration can drop them once a
-- verified backfill of every existing row is confirmed.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE wlt_payout_destinations
  ADD COLUMN IF NOT EXISTS account_number_encrypted bytea,
  ADD COLUMN IF NOT EXISTS iban_encrypted bytea,
  ADD COLUMN IF NOT EXISTS payout_mobile_number_encrypted bytea;
