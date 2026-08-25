-- identity-034: complete the canonical Identity vocabulary used by the live
-- provider and partner administration paths.
--
-- identity-020 seeded only the original public roles. The canonical RBAC
-- writer now validates every actor role and permission before it commits, so
-- the roles and Partner bundle actions used by production code must be
-- durable vocabulary rather than test-only or projection-only values.

INSERT INTO identity_roles(name, description)
VALUES
    ('field', 'Workforce-managed field provider'),
    ('employee', 'Workforce-managed administrative employee'),
    ('support', 'Identity support-session actor')
ON CONFLICT (name)
DO UPDATE SET description = EXCLUDED.description;

INSERT INTO identity_permission_vocabulary(service, surface, action, description)
VALUES
    ('dsh', 'app-partner', 'team.manage', 'Manage the partner store team'),
    ('dsh', 'app-partner', 'courier.manage', 'Manage partner store couriers'),
    ('dsh', 'app-partner', 'coverage.read', 'Read partner store coverage'),
    ('dsh', 'app-partner', 'catalog.manage', 'Manage partner catalog proposals'),
    ('dsh', 'app-partner', 'orders.manage', 'Manage partner store orders')
ON CONFLICT (service, surface, action)
DO UPDATE SET description = EXCLUDED.description;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM (VALUES
            ('field'),
            ('employee'),
            ('support')
        ) AS required(name)
        LEFT JOIN identity_roles role ON role.name = required.name
        WHERE role.id IS NULL OR role.active IS NOT TRUE
    ) THEN
        RAISE EXCEPTION 'canonical Identity role vocabulary is incomplete';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM (VALUES
            ('team.manage'),
            ('courier.manage'),
            ('coverage.read'),
            ('catalog.manage'),
            ('orders.manage')
        ) AS required(action)
        LEFT JOIN identity_permission_vocabulary permission
          ON permission.service = 'dsh'
         AND permission.surface = 'app-partner'
         AND permission.action = required.action
        WHERE permission.id IS NULL
    ) THEN
        RAISE EXCEPTION 'canonical Partner permission vocabulary is incomplete';
    END IF;
END
$$;
