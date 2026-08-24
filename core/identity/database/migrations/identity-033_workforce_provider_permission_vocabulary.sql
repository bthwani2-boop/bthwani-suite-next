-- identity-033: make Workforce-managed provider access vocabulary canonical.
-- ProvisionActor is the sole writer for field/captain provider actors and must
-- resolve every permission through this vocabulary before it can commit access.

INSERT INTO identity_permission_vocabulary(service, surface, action, description)
VALUES
    ('dsh', 'app-field', 'store:read', 'Read field store assignments'),
    ('dsh', 'app-field', 'store:write', 'Write field store assignments'),
    ('workforce', 'app-field', 'provider:read', 'Read the authenticated field provider'),
    ('workforce', 'app-field', 'provider:update', 'Update the authenticated field provider'),
    ('dsh', 'app-captain', 'store:read', 'Read captain store assignments'),
    ('dsh', 'app-captain', 'store:write', 'Write captain store assignments'),
    ('workforce', 'app-captain', 'provider:read', 'Read the authenticated captain provider'),
    ('workforce', 'app-captain', 'provider:update', 'Update the authenticated captain provider')
ON CONFLICT (service, surface, action)
DO UPDATE SET description = EXCLUDED.description;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM (
            VALUES
                ('dsh', 'app-field', 'store:read'),
                ('dsh', 'app-field', 'store:write'),
                ('workforce', 'app-field', 'provider:read'),
                ('workforce', 'app-field', 'provider:update'),
                ('dsh', 'app-captain', 'store:read'),
                ('dsh', 'app-captain', 'store:write'),
                ('workforce', 'app-captain', 'provider:read'),
                ('workforce', 'app-captain', 'provider:update')
        ) AS required(service, surface, action)
        LEFT JOIN identity_permission_vocabulary vocabulary
          ON vocabulary.service = required.service
         AND vocabulary.surface = required.surface
         AND vocabulary.action = required.action
        WHERE vocabulary.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Workforce provider permission vocabulary is incomplete';
    END IF;
END
$$;
