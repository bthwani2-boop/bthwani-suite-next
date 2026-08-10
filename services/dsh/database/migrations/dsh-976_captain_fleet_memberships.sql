-- DSH-976: Sovereign operational fleet membership for Captains (J027).
-- Fixes the parallel truth bug left by J014. DSH owns the authoritative dispatch
-- affiliation and partner bounds, while Workforce owns the HR identity.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_captain_memberships (
    id                 TEXT        PRIMARY KEY DEFAULT 'cfm_' || replace(gen_random_uuid()::text, '-', ''),
    captain_actor_id   TEXT        NOT NULL,
    affiliation        TEXT        NOT NULL CHECK (affiliation IN ('BTHWANI', 'PARTNER')),
    partner_id         TEXT        NOT NULL DEFAULT '',
    store_id           TEXT        NOT NULL DEFAULT '',
    status             TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'ended', 'transfer_requested', 'invited')),
    branch_assignment  TEXT        NOT NULL DEFAULT '',
    delivery_assignment TEXT       NOT NULL DEFAULT '',
    effective_from     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_until    TIMESTAMPTZ,
    version            INTEGER     NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dsh_captain_memberships_partner_chk CHECK (
        (affiliation = 'BTHWANI') OR
        (affiliation = 'PARTNER' AND btrim(partner_id) <> '')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS dsh_captain_memberships_active_uidx
    ON dsh_captain_memberships(captain_actor_id)
    WHERE status = 'active' AND btrim(captain_actor_id) <> '';

CREATE INDEX IF NOT EXISTS dsh_captain_memberships_store_idx
    ON dsh_captain_memberships(store_id, status);

CREATE TABLE IF NOT EXISTS dsh_captain_membership_history (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id      TEXT        NOT NULL REFERENCES dsh_captain_memberships(id) ON DELETE CASCADE,
    action_label       TEXT        NOT NULL,
    actor_id           TEXT        NOT NULL,
    from_status        TEXT        NOT NULL,
    to_status          TEXT        NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrate any existing couriers from dsh_store_team_members
INSERT INTO dsh_captain_memberships (
    id, captain_actor_id, affiliation, partner_id, store_id, status,
    branch_assignment, delivery_assignment, version, created_at, updated_at
)
SELECT
    stm.id,
    COALESCE(stm.identity_actor_id, stm.invited_identity, ''),
    'PARTNER',
    s.partner_id,
    stm.store_id,
    stm.status,
    stm.branch_assignment,
    stm.delivery_assignment,
    stm.version,
    stm.created_at,
    stm.updated_at
FROM dsh_store_team_members stm
JOIN dsh_stores s ON stm.store_id = s.id
WHERE stm.role = 'courier'
ON CONFLICT DO NOTHING;

-- Repoint connection codes to the new table
ALTER TABLE dsh_partner_courier_connection_codes DROP CONSTRAINT IF EXISTS dsh_partner_courier_connection_codes_team_member_id_fkey;
ALTER TABLE dsh_partner_courier_connection_codes ADD CONSTRAINT dsh_partner_courier_connection_codes_team_member_id_fkey
    FOREIGN KEY (team_member_id) REFERENCES dsh_captain_memberships(id) ON DELETE CASCADE;

-- Repoint actions audit
ALTER TABLE dsh_store_team_member_actions DROP CONSTRAINT IF EXISTS dsh_store_team_member_actions_member_id_fkey;
-- Since we are dropping couriers from dsh_store_team_members, we migrate their actions to the new history table
INSERT INTO dsh_captain_membership_history (membership_id, action_label, actor_id, from_status, to_status, created_at)
SELECT member_id, action_label, actor_id, from_status, to_status, created_at
FROM dsh_store_team_member_actions
WHERE member_id IN (SELECT id FROM dsh_captain_memberships);
DELETE FROM dsh_store_team_member_actions WHERE member_id IN (SELECT id FROM dsh_captain_memberships);
ALTER TABLE dsh_store_team_member_actions ADD CONSTRAINT dsh_store_team_member_actions_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES dsh_store_team_members(id) ON DELETE CASCADE;

-- Remove the 'courier' role check constraint from dsh_store_team_members and restrict it
ALTER TABLE dsh_store_team_members DROP CONSTRAINT IF EXISTS dsh_store_team_members_role_check;
ALTER TABLE dsh_store_team_members ADD CONSTRAINT dsh_store_team_members_role_check
    CHECK (role IN ('owner','supervisor','staff'));

-- Clean up remaining courier rows
DELETE FROM dsh_store_team_members WHERE role = 'courier';

COMMIT;
