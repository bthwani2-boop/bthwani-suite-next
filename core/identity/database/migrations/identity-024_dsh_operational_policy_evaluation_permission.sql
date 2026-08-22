-- Give existing DSH platform operators the dedicated read-only permission used
-- by the control-panel operational-policy simulation route.
WITH eligible AS (
  SELECT id, permissions
  FROM identity_actors
  WHERE 'employee' = ANY(roles)
    AND permissions @> '[{"service":"dsh","surface":"control-panel","action":"dsh.operational_policy.audit.read","scope":"all"}]'::jsonb
), updated AS (
  SELECT
    id,
    jsonb_agg(DISTINCT permission) AS permissions
  FROM eligible
  CROSS JOIN LATERAL jsonb_array_elements(
    permissions || '[{"service":"dsh","surface":"control-panel","action":"dsh.operational_policy.evaluate","scope":"all"}]'::jsonb
  ) AS expanded(permission)
  GROUP BY id
)
UPDATE identity_actors AS actor
SET permissions = updated.permissions,
    updated_at = now()
FROM updated
WHERE actor.id = updated.id
  AND actor.permissions IS DISTINCT FROM updated.permissions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM identity_actors
    WHERE 'employee' = ANY(roles)
      AND permissions @> '[{"service":"dsh","surface":"control-panel","action":"dsh.operational_policy.audit.read","scope":"all"}]'::jsonb
      AND NOT permissions @> '[{"service":"dsh","surface":"control-panel","action":"dsh.operational_policy.evaluate","scope":"all"}]'::jsonb
  ) THEN
    RAISE EXCEPTION 'DSH operational policy evaluation permission is incomplete';
  END IF;
END
$$;
