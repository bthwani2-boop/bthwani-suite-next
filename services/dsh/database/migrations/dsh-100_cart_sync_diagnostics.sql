-- +migrate Up
-- Add device and session tracking to idempotency for Operations Diagnostics
ALTER TABLE dsh_cart_idempotency
  ADD COLUMN device_id text,
  ADD COLUMN session_id text;

-- +migrate Down
ALTER TABLE dsh_cart_idempotency
  DROP COLUMN device_id,
  DROP COLUMN session_id;
