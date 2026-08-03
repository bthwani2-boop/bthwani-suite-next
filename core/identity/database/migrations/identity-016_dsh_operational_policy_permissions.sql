-- Backfill domain-specific DSH operational-policy permissions before route guards
-- stop accepting broad operations/platform grants. Existing broad permissions
-- remain for unrelated routes; this migration only adds the precise grants.
WITH employee_grants AS (
  SELECT
    id,
    permissions AS existing_permissions,
    CASE
      WHEN permissions @> '[{"service":"workforce","surface":"control-panel","action":"leadership:create","scope":"all"}]'::jsonb
        THEN '[
          {"service":"dsh","surface":"control-panel","action":"dsh.service_zones.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"dsh.service_zones.manage","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"dsh.fulfillment_sla.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"dsh.fulfillment_sla.manage","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"dsh.dispatch_capacity.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"dsh.dispatch_capacity.manage","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"dsh.operational_policy.audit.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"dsh.operational_policy.rollback","scope":"all"}
        ]'::jsonb
      WHEN permissions @> '[{"service":"workforce","surface":"control-panel","action":"leadership:read","scope":"all"}]'::jsonb
       AND permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"all"}]'::jsonb
        THEN '[
          {"service":"dsh","surface":"control-panel","action":"dsh.service_zones.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"dsh.fulfillment_sla.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"dsh.dispatch_capacity.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"dsh.operational_policy.audit.read","scope":"all"}
        ]'::jsonb
      WHEN permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"department:operations"}]'::jsonb
        THEN '[
          {"service":"dsh","surface":"control-panel","action":"dsh.service_zones.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"dsh.service_zones.manage","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"dsh.fulfillment_sla.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"dsh.fulfillment_sla.manage","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"dsh.dispatch_capacity.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"dsh.dispatch_capacity.manage","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"dsh.operational_policy.audit.read","scope":"all"}
        ]'::jsonb
      ELSE '[]'::jsonb
    END AS grants
  FROM identity_actors
  WHERE 'employee' = ANY(roles)
), merged_permissions AS (
  SELECT
    employee_grants.id,
    jsonb_agg(DISTINCT expanded.permission) AS permissions
  FROM employee_grants
  CROSS JOIN LATERAL jsonb_array_elements(
    employee_grants.existing_permissions || employee_grants.grants
  ) AS expanded(permission)
  WHERE employee_grants.grants <> '[]'::jsonb
  GROUP BY employee_grants.id
)
UPDATE identity_actors AS actor
SET permissions = merged_permissions.permissions,
    updated_at = now()
FROM merged_permissions
WHERE actor.id = merged_permissions.id
  AND actor.permissions IS DISTINCT FROM merged_permissions.permissions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM identity_actors
    WHERE 'employee' = ANY(roles)
      AND (
        permissions @> '[{"service":"workforce","surface":"control-panel","action":"leadership:create","scope":"all"}]'::jsonb
        OR permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"department:operations"}]'::jsonb
      )
      AND NOT permissions @> '[
        {"service":"dsh","surface":"control-panel","action":"dsh.service_zones.read","scope":"all"},
        {"service":"dsh","surface":"control-panel","action":"dsh.service_zones.manage","scope":"all"},
        {"service":"dsh","surface":"control-panel","action":"dsh.fulfillment_sla.read","scope":"all"},
        {"service":"dsh","surface":"control-panel","action":"dsh.fulfillment_sla.manage","scope":"all"},
        {"service":"dsh","surface":"control-panel","action":"dsh.dispatch_capacity.read","scope":"all"},
        {"service":"dsh","surface":"control-panel","action":"dsh.dispatch_capacity.manage","scope":"all"},
        {"service":"dsh","surface":"control-panel","action":"dsh.operational_policy.audit.read","scope":"all"}
      ]'::jsonb
  ) THEN
    RAISE EXCEPTION 'DSH operational manager permissions are incomplete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM identity_actors
    WHERE 'employee' = ANY(roles)
      AND permissions @> '[{"service":"workforce","surface":"control-panel","action":"leadership:create","scope":"all"}]'::jsonb
      AND NOT permissions @> '[{"service":"dsh","surface":"control-panel","action":"dsh.operational_policy.rollback","scope":"all"}]'::jsonb
  ) THEN
    RAISE EXCEPTION 'DSH operational rollback permission is missing for platform owner';
  END IF;
END
$$;
