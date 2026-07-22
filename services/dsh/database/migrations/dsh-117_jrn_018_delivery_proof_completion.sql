-- JRN-018: governed proof of delivery and exactly-once order completion.
-- DSH owns operational proof state. WLT owns every financial consequence.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS dsh_delivery_verification_challenges (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id   UUID        NOT NULL UNIQUE REFERENCES dsh_assignments(id) ON DELETE CASCADE,
    order_id        UUID        NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,
    client_id       TEXT        NOT NULL,
    pin_hash        TEXT        NOT NULL CHECK (length(pin_hash) = 64),
    pin_expires_at  TIMESTAMPTZ NOT NULL,
    failed_attempts INT         NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
    max_attempts    INT         NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 10),
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consumed_at     TIMESTAMPTZ,
    version         INT         NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (pin_expires_at > issued_at),
    CHECK (consumed_at IS NULL OR consumed_at >= issued_at)
);

CREATE INDEX IF NOT EXISTS idx_dsh_delivery_verification_challenges_client
    ON dsh_delivery_verification_challenges(client_id, issued_at DESC);

CREATE TABLE IF NOT EXISTS dsh_delivery_proofs (
    id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id              UUID        NOT NULL REFERENCES dsh_assignments(id) ON DELETE CASCADE,
    order_id                   UUID        NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,
    captain_id                 TEXT        NOT NULL,
    verification_challenge_id  UUID        REFERENCES dsh_delivery_verification_challenges(id) ON DELETE RESTRICT,
    method                     TEXT        NOT NULL CHECK (method IN ('otp_pin', 'photo', 'signature', 'composite')),
    status                     TEXT        NOT NULL CHECK (status IN ('submitted', 'pending_review', 'accepted', 'rejected', 'superseded')),
    photo_media_ref            TEXT        REFERENCES dsh_media_refs(media_ref) ON DELETE RESTRICT,
    signature_media_ref        TEXT        REFERENCES dsh_media_refs(media_ref) ON DELETE RESTRICT,
    captured_latitude          DOUBLE PRECISION,
    captured_longitude         DOUBLE PRECISION,
    captured_at                TIMESTAMPTZ NOT NULL,
    submitted_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at                TIMESTAMPTZ,
    reviewed_by_actor_id       TEXT,
    review_reason              TEXT,
    accepted_at                TIMESTAMPTZ,
    rejected_at                TIMESTAMPTZ,
    idempotency_key            TEXT        NOT NULL,
    request_fingerprint        TEXT        NOT NULL CHECK (length(request_fingerprint) = 64),
    version                    INT         NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (captured_latitude IS NULL OR captured_latitude BETWEEN -90 AND 90),
    CHECK (captured_longitude IS NULL OR captured_longitude BETWEEN -180 AND 180),
    CHECK (captured_at <= submitted_at + INTERVAL '5 minutes'),
    CHECK (method <> 'otp_pin' OR verification_challenge_id IS NOT NULL),
    CHECK (method <> 'photo' OR photo_media_ref IS NOT NULL),
    CHECK (method <> 'signature' OR signature_media_ref IS NOT NULL),
    CHECK (method <> 'composite' OR (verification_challenge_id IS NOT NULL AND (photo_media_ref IS NOT NULL OR signature_media_ref IS NOT NULL))),
    CHECK (status <> 'accepted' OR accepted_at IS NOT NULL),
    CHECK (status <> 'rejected' OR rejected_at IS NOT NULL),
    CHECK (reviewed_at IS NULL OR reviewed_by_actor_id IS NOT NULL),
    UNIQUE (assignment_id, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dsh_delivery_proofs_one_accepted_assignment
    ON dsh_delivery_proofs(assignment_id)
    WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_dsh_delivery_proofs_operator_queue
    ON dsh_delivery_proofs(status, submitted_at)
    WHERE status IN ('submitted', 'pending_review');

CREATE INDEX IF NOT EXISTS idx_dsh_delivery_proofs_order
    ON dsh_delivery_proofs(order_id, created_at DESC);

ALTER TABLE dsh_deliveries
    ADD COLUMN IF NOT EXISTS delivery_proof_id UUID REFERENCES dsh_delivery_proofs(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS pod_review_status TEXT,
    ADD COLUMN IF NOT EXISTS pod_verified_at TIMESTAMPTZ;

ALTER TABLE dsh_deliveries DROP CONSTRAINT IF EXISTS dsh_deliveries_pod_review_status_check;
ALTER TABLE dsh_deliveries ADD CONSTRAINT dsh_deliveries_pod_review_status_check
    CHECK (pod_review_status IS NULL OR pod_review_status IN ('pending_review', 'accepted', 'rejected'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_dsh_deliveries_delivery_proof
    ON dsh_deliveries(delivery_proof_id)
    WHERE delivery_proof_id IS NOT NULL;

-- The historical outbox already uses UNIQUE(order_id,event_type). Keep the
-- invariant explicit for installations that were migrated from older snapshots.
CREATE UNIQUE INDEX IF NOT EXISTS idx_dsh_wlt_outbox_delivery_completed_once
    ON dsh_wlt_outbox_events(order_id, event_type)
    WHERE event_type = 'delivery_completed';
