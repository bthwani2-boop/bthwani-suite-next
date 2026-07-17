-- DSH-059: partner courier -> captain identity connection codes
--
-- A partner may issue a short-lived one-time code for an existing courier team
-- member. The plaintext code is returned once and is never persisted. Only its
-- SHA-256 digest and last four characters are stored. Redemption binds the
-- authenticated captain actor to the sovereign dsh_store_team_members row used
-- by partner-delivery assignment.

CREATE TABLE IF NOT EXISTS dsh_partner_courier_connection_codes (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id                    TEXT NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
    team_member_id              TEXT NOT NULL REFERENCES dsh_store_team_members(id) ON DELETE CASCADE,
    code_hash                   TEXT NOT NULL,
    code_last4                  TEXT NOT NULL,
    status                      TEXT NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','redeemed','revoked','expired')),
    expires_at                  TIMESTAMPTZ NOT NULL,
    created_by_actor_id         TEXT NOT NULL,
    redeemed_by_captain_actor_id TEXT NOT NULL DEFAULT '',
    redeemed_at                 TIMESTAMPTZ,
    revoked_at                  TIMESTAMPTZ,
    version                     INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (code_hash)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_partner_courier_pending_code
    ON dsh_partner_courier_connection_codes (team_member_id)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_dsh_partner_courier_codes_store
    ON dsh_partner_courier_connection_codes (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_courier_codes_redeemed_actor
    ON dsh_partner_courier_connection_codes (redeemed_by_captain_actor_id)
    WHERE status = 'redeemed';

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_store_team_members_identity_actor
    ON dsh_store_team_members (identity_actor_id)
    WHERE identity_actor_id <> '';
