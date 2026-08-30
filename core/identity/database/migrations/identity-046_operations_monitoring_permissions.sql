-- identity-046: make the DSH operator monitoring routes issuable by the
-- canonical Identity owner and backfill the existing Operations Manager and
-- platform-owner actors.
--
-- DSH already guards partner-delivery and pickup monitoring with these exact
-- actions. Keeping them out of Identity's vocabulary made those control-panel
-- readbacks unreachable for the employees who own Operations. The mutation
-- grants are limited to the same Operations-owned SLA acknowledgement routes;
-- sovereign incident override remains a separate, higher-risk capability.

BEGIN;

INSERT INTO identity_permission_vocabulary(service, surface, action, description)
VALUES
    ('dsh', 'control-panel', 'partner_delivery.read', 'Canonical capability consumed by Identity access policy: partner_delivery.read'),
    ('dsh', 'control-panel', 'partner_delivery.manage', 'Canonical capability consumed by Identity access policy: partner_delivery.manage'),
    ('dsh', 'control-panel', 'pickup.read', 'Canonical capability consumed by Identity access policy: pickup.read'),
    ('dsh', 'control-panel', 'pickup.manage', 'Canonical capability consumed by Identity access policy: pickup.manage')
ON CONFLICT (service, surface, action) DO NOTHING;

-- Existing employee projections identify the canonical administrative bundle
-- through Workforce's department-scoped employee:create permission. The
-- platform owner remains the employee+operator bundle used by Identity.
INSERT INTO identity_actor_direct_permissions(actor_id, permission_id, scope, granted_by)
SELECT actor.id, vocabulary.id, 'all', 'identity-046-operations-monitoring'
FROM identity_actors actor
CROSS JOIN (VALUES
    ('partner_delivery.read'),
    ('partner_delivery.manage'),
    ('pickup.read'),
    ('pickup.manage')
) AS required(action)
JOIN identity_permission_vocabulary vocabulary
  ON vocabulary.service = 'dsh'
 AND vocabulary.surface = 'control-panel'
 AND vocabulary.action = required.action
WHERE 'employee' = ANY(actor.roles)
  AND (
      actor.permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"department:operations"}]'::jsonb
      OR (
          'operator' = ANY(actor.roles)
          AND actor.permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"all"}]'::jsonb
      )
  )
ON CONFLICT (actor_id, permission_id, scope) DO NOTHING;

DO $$
DECLARE
    actor_id text;
BEGIN
    FOR actor_id IN
        SELECT actor.id
        FROM identity_actors actor
        WHERE 'employee' = ANY(actor.roles)
          AND (
              actor.permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"department:operations"}]'::jsonb
              OR (
                  'operator' = ANY(actor.roles)
                  AND actor.permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"all"}]'::jsonb
              )
          )
    LOOP
        PERFORM identity_rebuild_actor_access_projection(actor_id);
    END LOOP;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT actor.id
        FROM identity_actors actor
        WHERE 'employee' = ANY(actor.roles)
          AND (
              actor.permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"department:operations"}]'::jsonb
              OR (
                  'operator' = ANY(actor.roles)
                  AND actor.permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"all"}]'::jsonb
              )
          )
          AND NOT EXISTS (
              SELECT 1
              FROM identity_actor_direct_permissions direct_permission
              JOIN identity_permission_vocabulary vocabulary
                ON vocabulary.id = direct_permission.permission_id
              WHERE direct_permission.actor_id = actor.id
                AND direct_permission.scope = 'all'
                AND vocabulary.service = 'dsh'
                AND vocabulary.surface = 'control-panel'
                AND vocabulary.action IN (
                    'partner_delivery.read',
                    'partner_delivery.manage',
                    'pickup.read',
                    'pickup.manage'
                )
              GROUP BY direct_permission.actor_id
              HAVING COUNT(DISTINCT vocabulary.action) = 4
          )
    ) THEN
        RAISE EXCEPTION 'Operations monitoring permissions are incomplete';
    END IF;
END
$$;

COMMIT;
