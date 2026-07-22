-- DSH-097: extend the existing delivery-exception truth for package shortage
-- and mismatch discovered during the store-to-captain custody handshake.
-- Reporter identity is separated from the assigned captain identity so either
-- the partner or the captain can open the same governed operations exception.

BEGIN;

ALTER TABLE dsh_delivery_exceptions
    DROP CONSTRAINT IF EXISTS dsh_delivery_exceptions_reason_code_check;
ALTER TABLE dsh_delivery_exceptions
    ADD CONSTRAINT dsh_delivery_exceptions_reason_code_check CHECK (reason_code IN (
        'customer_unreachable',
        'recipient_refused',
        'wrong_address',
        'unsafe_location',
        'vehicle_breakdown',
        'accident',
        'damaged_order',
        'cash_collection_issue',
        'weather_or_road_block',
        'proof_unavailable',
        'handoff_shortage',
        'handoff_mismatch',
        'other'
    ));

CREATE TABLE IF NOT EXISTS dsh_delivery_exception_reporters (
    exception_id UUID PRIMARY KEY REFERENCES dsh_delivery_exceptions(id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL CHECK (NULLIF(BTRIM(actor_id), '') IS NOT NULL),
    actor_role TEXT NOT NULL CHECK (actor_role IN ('captain', 'partner')),
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO dsh_delivery_exception_reporters (
    exception_id,
    actor_id,
    actor_role,
    reported_at
)
SELECT id, captain_id, 'captain', reported_at
FROM dsh_delivery_exceptions
ON CONFLICT (exception_id) DO NOTHING;

CREATE OR REPLACE FUNCTION dsh_record_default_delivery_exception_reporter()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO dsh_delivery_exception_reporters (
        exception_id,
        actor_id,
        actor_role,
        reported_at
    ) VALUES (
        NEW.id,
        NEW.captain_id,
        'captain',
        NEW.reported_at
    )
    ON CONFLICT (exception_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_record_default_delivery_exception_reporter
    ON dsh_delivery_exceptions;

CREATE TRIGGER trg_dsh_record_default_delivery_exception_reporter
AFTER INSERT ON dsh_delivery_exceptions
FOR EACH ROW
EXECUTE FUNCTION dsh_record_default_delivery_exception_reporter();

CREATE INDEX IF NOT EXISTS idx_dsh_delivery_exception_reporters_actor
    ON dsh_delivery_exception_reporters(actor_role, actor_id, reported_at DESC);

COMMIT;
