-- dsh-955: partner-owned pickup window extension policy.
--
-- Routine pickup window extension/reschedule moves from the operator
-- surface to the partner surface (the store issuing the pickup code).
-- A bounded extension_count/max_extensions pair caps how many times a
-- partner can push a session's expiry out before an operator override
-- (still routed through /dsh/operator/pickups/{orderId}/extend-window)
-- is required.

BEGIN;

ALTER TABLE dsh_pickup_sessions
    ADD COLUMN IF NOT EXISTS extension_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_extensions INT NOT NULL DEFAULT 2;

COMMIT;
