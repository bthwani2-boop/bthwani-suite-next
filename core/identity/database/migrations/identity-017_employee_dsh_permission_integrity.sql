-- Repair permission arrays produced by identity-011 and enforce complete
-- DSH control-panel grants without mutating the historical migration.
WITH employee_grants AS (
  SELECT
    actor.id,
    actor.permissions AS existing_permissions,
    CASE
      WHEN actor.permissions @> '[{"service":"workforce","surface":"control-panel","action":"leadership:create","scope":"all"}]'::jsonb
        THEN '[
          {"service":"dsh","surface":"control-panel","action":"platform.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"platform.manage","scope":"all"}
        ]'::jsonb
      WHEN actor.permissions @> '[{"service":"workforce","surface":"control-panel","action":"leadership:read","scope":"all"}]'::jsonb
       AND actor.permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"all"}]'::jsonb
        THEN '[
          {"service":"dsh","surface":"control-panel","action":"platform.read","scope":"all"}
        ]'::jsonb
      WHEN actor.permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"department:operations"}]'::jsonb
        THEN '[
          {"service":"dsh","surface":"control-panel","action":"operations.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"operations.manage","scope":"all"}
        ]'::jsonb
      WHEN actor.permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"department:partners"}]'::jsonb
        THEN '[
          {"service":"dsh","surface":"control-panel","action":"partners.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"partners.manage","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"partners.activate","scope":"all"}
        ]'::jsonb
      WHEN actor.permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"department:finance"}]'::jsonb
        THEN '[
          {"service":"dsh","surface":"control-panel","action":"finance.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"finance.manage","scope":"all"}
        ]'::jsonb
      WHEN actor.permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"department:support"}]'::jsonb
        THEN '[
          {"service":"dsh","surface":"control-panel","action":"support.read","scope":"all"},
          {"service":"dsh","surface":"control-panel","action":"support.manage","scope":"all"}
        ]'::jsonb
      ELSE '[]'::jsonb
    END AS grants
  FROM identity_actors AS actor
  WHERE 'employee' = ANY(actor.roles)
),
normalized_permissions AS (
  SELECT
    employee_grants.id,
    CASE
      WHEN permission_item ? 'value'
       AND jsonb_typeof(permission_item->'value') = 'object'
        THEN permission_item->'value'
      ELSE permission_item
    END AS permission
  FROM employee_grants
  CROSS JOIN LATERAL jsonb_array_elements(employee_grants.existing_permissions) AS existing(permission_item)

  UNION ALL

  SELECT
    employee_grants.id,
    grant_item
  FROM employee_grants
  CROSS JOIN LATERAL jsonb_array_elements(employee_grants.grants) AS granted(grant_item)
),
merged_permissions AS (
  SELECT
    id,
    jsonb_agg(DISTINCT permission) AS permissions
  FROM normalized_permissions
  GROUP BY id
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
      AND permissions @> '[{"service":"workforce","surface":"control-panel","action":"leadership:create","scope":"all"}]'::jsonb
      AND NOT permissions @> '[
        {"service":"dsh","surface":"control-panel","action":"platform.read","scope":"all"},
        {"service":"dsh","surface":"control-panel","action":"platform.manage","scope":"all"}
      ]'::jsonb
  ) THEN
    RAISE EXCEPTION 'platform owner DSH permissions are incomplete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM identity_actors
    WHERE 'employee' = ANY(roles)
      AND permissions @> '[{"service":"workforce","surface":"control-panel","action":"leadership:read","scope":"all"}]'::jsonb
      AND permissions @> '[{"service":"workforce","surface":"control-panel","action":"employee:create","scope":"all"}]'::jsonb
      AND NOT permissions @> '[{"service":"dsh","surface":"control-panel","action":"platform.read","scope":"all"}]'::jsonb
  ) THEN
    RAISE EXCEPTION 'platform coordinator DSH permissions are incomplete';
  END IF;

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

  IF EXISTS (
    SELECT 1
    FROM identity_actors
    CROSS JOIN LATERAL jsonb_array_elements(permissions) AS permission(item)
    WHERE 'employee' = ANY(roles)
      AND permission.item ? 'value'
  ) THEN
    RAISE EXCEPTION 'wrapped permission objects remain after identity permission repair';
  END IF;
END
$$;
