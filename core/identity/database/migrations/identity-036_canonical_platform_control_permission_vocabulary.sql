-- identity-036: complete the canonical Identity vocabulary consumed by the
-- local platform-control actors. The canonical actor-access writer must only
-- bind durable vocabulary; local bootstrap must not invent authority.

INSERT INTO identity_permission_vocabulary(service, surface, action, description)
VALUES
    ('dsh', 'control-panel', 'platform:read', 'Read platform policy projections'),
    ('dsh', 'control-panel', 'platform:health:read', 'Read platform runtime health'),
    ('dsh', 'control-panel', 'platform:audit:read', 'Read platform change audit'),
    ('dsh', 'control-panel', 'platform:variables:propose', 'Propose platform variable changes'),
    ('dsh', 'control-panel', 'platform:variables:approve', 'Approve or reject platform variable changes'),
    ('dsh', 'control-panel', 'platform:variables:apply', 'Apply approved platform variable changes'),
    ('dsh', 'control-panel', 'platform:variables:rollback', 'Roll back applied platform variable changes'),
    ('dsh', 'control-panel', 'platform:rollouts:manage', 'Manage platform rollouts')
ON CONFLICT (service, surface, action)
DO UPDATE SET description = EXCLUDED.description;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM (VALUES
            ('platform:read'),
            ('platform:health:read'),
            ('platform:audit:read'),
            ('platform:variables:propose'),
            ('platform:variables:approve'),
            ('platform:variables:apply'),
            ('platform:variables:rollback'),
            ('platform:rollouts:manage')
        ) AS required(action)
        LEFT JOIN identity_permission_vocabulary vocabulary
          ON vocabulary.service = 'dsh'
         AND vocabulary.surface = 'control-panel'
         AND vocabulary.action = required.action
        WHERE vocabulary.id IS NULL
    ) THEN
        RAISE EXCEPTION 'canonical platform-control permission vocabulary is incomplete';
    END IF;
END
$$;
