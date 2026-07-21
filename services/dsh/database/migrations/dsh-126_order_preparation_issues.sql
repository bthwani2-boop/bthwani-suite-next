-- DSH-126: governed order preparation issues, missing items, and substitutions.
-- DSH owns the operational issue lifecycle. This migration deliberately does
-- not mutate prices, payment state, wallet balances, or any WLT-owned truth.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_order_preparation_issues (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                 UUID        NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,
    store_id                 TEXT        NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
    order_item_id            UUID        REFERENCES dsh_order_items(id) ON DELETE RESTRICT,
    issue_kind               TEXT        NOT NULL CHECK (issue_kind IN (
                                            'missing_item',
                                            'substitution_required',
                                            'quality_issue',
                                            'other'
                                        )),
    status                   TEXT        NOT NULL DEFAULT 'open'
                                        CHECK (status IN ('open', 'resolved')),
    affected_quantity        INTEGER     NOT NULL DEFAULT 1 CHECK (affected_quantity > 0),
    note                     TEXT        NOT NULL CHECK (length(btrim(note)) BETWEEN 3 AND 500),
    replacement_product_id   TEXT,
    replacement_product_name TEXT,
    opened_by_actor_id       TEXT        NOT NULL,
    opened_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_by_actor_id     TEXT,
    resolution_note          TEXT,
    resolved_at              TIMESTAMPTZ,
    version                  INTEGER     NOT NULL DEFAULT 1 CHECK (version > 0),
    correlation_id           TEXT        NOT NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (order_id, correlation_id),
    CHECK (
        (status = 'open' AND resolved_by_actor_id IS NULL AND resolution_note IS NULL AND resolved_at IS NULL)
        OR
        (status = 'resolved' AND resolved_by_actor_id IS NOT NULL
            AND length(btrim(resolution_note)) BETWEEN 3 AND 500
            AND resolved_at IS NOT NULL)
    ),
    CHECK (
        issue_kind <> 'substitution_required'
        OR replacement_product_id IS NOT NULL
        OR length(btrim(COALESCE(replacement_product_name, ''))) >= 2
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_order_preparation_open_issue
    ON dsh_order_preparation_issues (
        order_id,
        COALESCE(order_item_id, '00000000-0000-0000-0000-000000000000'::uuid),
        issue_kind
    )
    WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_dsh_order_preparation_issues_order
    ON dsh_order_preparation_issues (order_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_order_preparation_issues_store
    ON dsh_order_preparation_issues (store_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS dsh_order_preparation_issue_events (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id         UUID        NOT NULL REFERENCES dsh_order_preparation_issues(id) ON DELETE CASCADE,
    order_id         UUID        NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,
    store_id         TEXT        NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
    actor_id         TEXT        NOT NULL,
    event_type       TEXT        NOT NULL CHECK (event_type IN ('opened', 'resolved')),
    from_status      TEXT,
    to_status        TEXT        NOT NULL CHECK (to_status IN ('open', 'resolved')),
    note             TEXT        NOT NULL CHECK (length(btrim(note)) BETWEEN 3 AND 500),
    payload          JSONB       NOT NULL DEFAULT '{}'::jsonb,
    correlation_id   TEXT        NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (issue_id, correlation_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_order_preparation_issue_events_order
    ON dsh_order_preparation_issue_events (order_id, created_at DESC);

COMMIT;
