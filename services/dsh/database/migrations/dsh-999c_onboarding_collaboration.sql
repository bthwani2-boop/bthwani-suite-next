-- U007: contextual collaboration for field onboarding.
-- A thread is always bound to the canonical partner draft and at least one
-- onboarding object; it is not a general-purpose chat channel.

CREATE TABLE IF NOT EXISTS dsh_onboarding_collaboration_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_context_id TEXT NOT NULL,
    partner_id TEXT NOT NULL REFERENCES dsh_partners(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES dsh_field_onboarding_assignments(id) ON DELETE SET NULL,
    document_id TEXT REFERENCES dsh_partner_documents(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
    created_by_actor_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (assignment_id IS NOT NULL OR document_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_onboarding_collab_thread_object
    ON dsh_onboarding_collaboration_threads (
        partner_id,
        COALESCE(assignment_id, '00000000-0000-0000-0000-000000000000'::UUID),
        COALESCE(document_id, '')
    );

CREATE INDEX IF NOT EXISTS idx_dsh_onboarding_collab_threads_context
    ON dsh_onboarding_collaboration_threads (operator_context_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS dsh_onboarding_collaboration_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES dsh_onboarding_collaboration_threads(id) ON DELETE CASCADE,
    sender_actor_id TEXT NOT NULL,
    sender_surface TEXT NOT NULL CHECK (sender_surface IN ('app-field', 'control-panel')),
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
    attachment_media_refs TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    client_message_id TEXT NOT NULL,
    sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (thread_id, sender_actor_id, client_message_id),
    UNIQUE (thread_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_dsh_onboarding_collab_messages_thread
    ON dsh_onboarding_collaboration_messages (thread_id, sequence_number ASC);

CREATE TABLE IF NOT EXISTS dsh_onboarding_collaboration_read_cursors (
    thread_id UUID NOT NULL REFERENCES dsh_onboarding_collaboration_threads(id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL,
    last_read_sequence INTEGER NOT NULL DEFAULT 0 CHECK (last_read_sequence >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (thread_id, actor_id)
);

CREATE TABLE IF NOT EXISTS dsh_onboarding_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES dsh_onboarding_collaboration_threads(id) ON DELETE CASCADE,
    target_kind TEXT NOT NULL CHECK (target_kind IN ('draft', 'document', 'assignment')),
    target_id TEXT NOT NULL,
    requested_by_actor_id TEXT NOT NULL,
    reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 5 AND 2000),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'responded', 'resolved', 'cancelled')),
    idempotency_key TEXT NOT NULL,
    resolved_by_actor_id TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (thread_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_dsh_onboarding_change_requests_thread
    ON dsh_onboarding_change_requests (thread_id, status, created_at DESC);
