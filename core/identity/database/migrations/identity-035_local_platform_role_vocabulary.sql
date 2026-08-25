-- identity-035: register the durable roles used by local platform bootstrap.
-- These are canonical Identity roles; the local bootstrap remains a consumer
-- of the RBAC writer and never creates role authority as a side effect.

INSERT INTO identity_roles(name, description)
VALUES
    ('platform-approver', 'Local platform variable approver'),
    ('platform-applier', 'Local platform variable applier'),
    ('platform-rollout-manager', 'Local platform rollout manager')
ON CONFLICT (name)
DO UPDATE SET description = EXCLUDED.description;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM (VALUES
            ('platform-approver'),
            ('platform-applier'),
            ('platform-rollout-manager')
        ) AS required(name)
        LEFT JOIN identity_roles role ON role.name = required.name
        WHERE role.id IS NULL OR role.active IS NOT TRUE
    ) THEN
        RAISE EXCEPTION 'local platform role vocabulary is incomplete';
    END IF;
END
$$;
