-- DSH-999: forward recovery for the cart sync diagnostics columns.
--
-- dsh-100_cart_sync_diagnostics.sql adds device_id and session_id to
-- dsh_cart_idempotency, but the governed order derives from the filename sort, so
-- it runs at ordinal 140 while the table itself is created at ordinal 165 by
-- dsh-136_cart_options_idempotency.sql. On a clean installation dsh-100 finds no
-- table and correctly does nothing, which would leave the columns missing.
--
-- The DSH cart writer inserts both columns on every cart mutation, so their
-- absence is not cosmetic: it fails the request. This migration closes that gap
-- once the producer has certainly run, and is idempotent for any database where
-- dsh-100 already applied them.
ALTER TABLE dsh_cart_idempotency
  ADD COLUMN IF NOT EXISTS device_id  TEXT,
  ADD COLUMN IF NOT EXISTS session_id TEXT;
