-- DSH-100: cart sync diagnostics.
-- Operations Diagnostics correlates a cart idempotency record with the device
-- and session that produced it (services/dsh/backend/internal/http/cart.go and
-- operations_cart_sync.go).
--
-- Governed order note: dsh_cart_idempotency is created later in the manifest, by
-- dsh-136_cart_options_idempotency.sql. Execution order is derived from the
-- filename sort, so this file cannot be moved after its producer. It therefore
-- widens the table only where it already exists, and
-- dsh-999_cart_idempotency_sync_diagnostics.sql guarantees the same columns on a
-- database that reaches dsh-136 first. Both paths converge on one shape.
--
-- The governed runner executes the whole file: it has no "+migrate Up/Down"
-- parser. The original version of this migration used that foreign convention,
-- so its Down block dropped the columns its Up block had just added, and it
-- referenced a table that did not exist yet.
DO $$
BEGIN
  IF to_regclass('public.dsh_cart_idempotency') IS NOT NULL THEN
    ALTER TABLE dsh_cart_idempotency
      ADD COLUMN IF NOT EXISTS device_id  TEXT,
      ADD COLUMN IF NOT EXISTS session_id TEXT;
  END IF;
END
$$;
