-- Backfill exact DSH control-panel permissions for administrative employees
-- created before role-based operator fallback was retired. Bundle identity is
-- inferred only from canonical Workforce permissions already persisted by
-- Identity; usernames and free-form labels are never trusted.
WITH employee_grants AS (
  SELECT
    id,
    permissions AS existing_permissions,
    CASE
      WHEN permissions @> '[{"service":"workforce","surface":"control-panel","action":"leadership:create","scope":"all"}]'::jsonb
        THEN '[
          {"service":"dsh","surface":"control-panel","action":"platform.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"platform.manage","scope":"all"}
        ]'::jsonb
      WHEN permissions @> '[{"service":"workforce","surface":"control-panel","action":"leadership:read","scope":"all"}]'::jsonb
       AND permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"all"}]'::jsonb
        THEN '[
          {"service":"dsh","surface":"control-panel","action":"platform.read","scope":"all"}
        ]'::jsonb
      WHEN permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"department:operations"}]'::jsonb
        THEN '[
          {"service":"dsh","surface":"control-panel","action":"operations.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"operations.manage","scope":"all"}
        ]'::jsonb
      WHEN permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"department:partners"}]'::jsonb
        THEN '[
          {"service":"dsh","surface":"control-panel","action":"partners.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"partners.manage","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"partners.activate","scope":"all"}
        ]'::jsonb
      WHEN permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"department:finance"}]'::jsonb
        THEN '[
          {"service":"dsh","surface":"control-panel","action":"finance.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"finance.manage","scope":"all"}
        ]'::jsonb
      WHEN permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"department:support"}]'::jsonb
        THEN '[
          {"service":"dsh","surface":"control-panel","action":"support.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"support.manage","scope":"all"}
        ]'::jsonb
      ELSE '[]'::jsonb
    END AS grants
  FROM identity_actors
  WHERE 'employee' = ANY(roles)
), merged_permissions AS (
  SELECT
    employee_grants.id,
    jsonb_agg(DISTINCT permission) AS permissions
  FROM employee_grants
  CROSS JOIN LATERAL jsonb_array_elements(
    employee_grants.existing_permissions || employee_grants.grants
  ) AS permission
  WHERE employee_grants.grants <> '[]'::jsonb
  GROUP BY employee_grants.id
)
UPDATE identity_actors AS actor
SET permissions = merged_permissions.permissions,
    updated_at = now()
FROM merged_permissions
WHERE actor.id = merged_permissions.id
  AND actor.permissions IS DISTINCT FROM merged_permissions.permissions;

-- Fail closed when a recognized administrative bundle is still missing any
-- exact DSH permission required by its domain.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM identity_actors
    WHERE 'employee' = ANY(roles)
      AND permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"department:operations"}]'::jsonb
      AND NOT permissions @> '[
        {"service":"dsh","surface":"control-panel","action":"operations.read","scope":"all"},
        {"service":"dsh","surface":"control-panel","action":"operations.manage","scope":"all"}
      ]'::jsonb
  ) THEN
    RAISE EXCEPTION 'operations manager DSH permissions are incomplete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM identity_actors
    WHERE 'employee' = ANY(roles)
      AND permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"department:partners"}]'::jsonb
      AND NOT permissions @> '[
        {"service":"dsh","surface":"control-panel","action":"partners.read","scope":"all"},
        {"service":"dsh","surface":"control-panel","action":"partners.manage","scope":"all"},
        {"service":"dsh","surface":"control-panel","action":"partners.activate","scope":"all"}
      ]'::jsonb
  ) THEN
    RAISE EXCEPTION 'partners manager DSH permissions are incomplete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM identity_actors
    WHERE 'employee' = ANY(roles)
      AND permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"department:finance"}]'::jsonb
      AND NOT permissions @> '[
        {"service":"dsh","surface":"control-panel","action":"finance.read","scope":"all"},
        {"service":"dsh","surface":"control-panel","action":"finance.manage","scope":"all"}
      ]'::jsonb
  ) THEN
    RAISE EXCEPTION 'finance manager DSH permissions are incomplete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM identity_actors
    WHERE 'employee' = ANY(roles)
      AND permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"department:support"}]'::jsonb
      AND NOT permissions @> '[
        {"service":"dsh","surface":"control-panel","action":"support.read","scope":"all"},
        {"service":"dsh","surface":"control-panel","action":"support.manage","scope":"all"}
      ]'::jsonb
  ) THEN
    RAISE EXCEPTION 'support manager DSH permissions are incomplete';
  END IF;
END
$$;
