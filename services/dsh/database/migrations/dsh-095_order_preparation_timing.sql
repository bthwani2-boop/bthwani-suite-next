-- DSH-095: governed order preparation timing and SLA snapshots.
-- Store policy is centrally persisted; every accepted order snapshots the
-- policy so later policy changes never rewrite historical customer promises.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_store_order_preparation_policies (
    store_id                     TEXT        PRIMARY KEY REFERENCES dsh_stores(id) ON DELETE CASCADE,
    default_preparation_minutes  INTEGER     NOT NULL DEFAULT 25
                                            CHECK (default_preparation_minutes BETWEEN 5 AND 180),
    warning_before_minutes       INTEGER     NOT NULL DEFAULT 5
                                            CHECK (warning_before_minutes BETWEEN 1 AND 60),
    version                      INTEGER     NOT NULL DEFAULT 1 CHECK (version > 0),
    updated_by_actor_id          TEXT,
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (warning_before_minutes < default_preparation_minutes)
);

ALTER TABLE dsh_orders
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS preparation_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS estimated_ready_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS estimated_preparation_minutes INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS preparation_warning_minutes INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS preparation_delay_reason TEXT,
    ADD COLUMN IF NOT EXISTS preparation_estimate_revision_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE dsh_orders
    DROP CONSTRAINT IF EXISTS dsh_orders_preparation_timing_check;
ALTER TABLE dsh_orders
    ADD CONSTRAINT dsh_orders_preparation_timing_check CHECK (
        estimated_preparation_minutes BETWEEN 0 AND 180
        AND preparation_warning_minutes BETWEEN 0 AND 60
        AND preparation_estimate_revision_count >= 0
        AND (accepted_at IS NULL OR estimated_ready_at IS NOT NULL)
        AND (estimated_ready_at IS NULL OR accepted_at IS NOT NULL)
        AND (preparation_started_at IS NULL OR accepted_at IS NOT NULL)
        AND (ready_at IS NULL OR preparation_started_at IS NOT NULL)
        AND (preparation_started_at IS NULL OR preparation_started_at >= accepted_at)
        AND (ready_at IS NULL OR ready_at >= preparation_started_at)
        AND (accepted_at IS NULL OR estimated_preparation_minutes BETWEEN 5 AND 180)
        AND (accepted_at IS NULL OR preparation_warning_minutes BETWEEN 1 AND 60)
        AND (accepted_at IS NULL OR preparation_warning_minutes < estimated_preparation_minutes)
    );

CREATE OR REPLACE FUNCTION dsh_capture_order_preparation_timing()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    policy_default_minutes INTEGER := 25;
    policy_warning_minutes INTEGER := 5;
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'pending' AND NEW.status = 'store_accepted' THEN
        SELECT
            COALESCE(policy.default_preparation_minutes, 25),
            COALESCE(policy.warning_before_minutes, 5)
        INTO policy_default_minutes, policy_warning_minutes
        FROM (SELECT NEW.store_id AS store_id) requested
        LEFT JOIN dsh_store_order_preparation_policies policy USING (store_id);

        NEW.accepted_at := COALESCE(NEW.accepted_at, NOW());
        NEW.estimated_preparation_minutes := CASE
            WHEN NEW.estimated_preparation_minutes BETWEEN 5 AND 180
                THEN NEW.estimated_preparation_minutes
            ELSE policy_default_minutes
        END;
        NEW.preparation_warning_minutes := CASE
            WHEN NEW.preparation_warning_minutes BETWEEN 1 AND NEW.estimated_preparation_minutes - 1
                THEN NEW.preparation_warning_minutes
            ELSE LEAST(policy_warning_minutes, NEW.estimated_preparation_minutes - 1)
        END;
        NEW.estimated_ready_at := COALESCE(
            NEW.estimated_ready_at,
            NEW.accepted_at + make_interval(mins => NEW.estimated_preparation_minutes)
        );
        NEW.preparation_delay_reason := NULL;
    ELSIF OLD.status = 'store_accepted' AND NEW.status = 'preparing' THEN
        NEW.preparation_started_at := COALESCE(NEW.preparation_started_at, NOW());
    ELSIF OLD.status = 'preparing' AND NEW.status = 'ready_for_pickup' THEN
        NEW.ready_at := COALESCE(NEW.ready_at, NOW());
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_capture_order_preparation_timing ON dsh_orders;
CREATE TRIGGER trg_dsh_capture_order_preparation_timing
BEFORE UPDATE OF status ON dsh_orders
FOR EACH ROW
EXECUTE FUNCTION dsh_capture_order_preparation_timing();

CREATE TABLE IF NOT EXISTS dsh_order_preparation_estimate_events (
    id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                   UUID        NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,
    store_id                   TEXT        NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
    actor_id                   TEXT        NOT NULL,
    from_estimated_ready_at    TIMESTAMPTZ NOT NULL,
    to_estimated_ready_at      TIMESTAMPTZ NOT NULL,
    remaining_minutes          INTEGER     NOT NULL CHECK (remaining_minutes BETWEEN 5 AND 180),
    reason                     TEXT        NOT NULL CHECK (length(btrim(reason)) BETWEEN 3 AND 500),
    correlation_id             TEXT        NOT NULL,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (order_id, correlation_id)
);

CREATE TABLE IF NOT EXISTS dsh_store_order_preparation_policy_events (
    id                           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id                     TEXT        NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
    actor_id                     TEXT        NOT NULL,
    from_default_minutes         INTEGER     NOT NULL,
    to_default_minutes           INTEGER     NOT NULL,
    from_warning_minutes         INTEGER     NOT NULL,
    to_warning_minutes           INTEGER     NOT NULL,
    from_version                 INTEGER     NOT NULL,
    to_version                   INTEGER     NOT NULL,
    reason                       TEXT        NOT NULL CHECK (length(btrim(reason)) BETWEEN 3 AND 500),
    correlation_id               TEXT        NOT NULL,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (store_id, correlation_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_orders_preparation_due
    ON dsh_orders (estimated_ready_at, store_id)
    WHERE status IN ('store_accepted', 'preparing') AND ready_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_order_preparation_estimate_events_order
    ON dsh_order_preparation_estimate_events (order_id, created_at DESC);

COMMIT;
