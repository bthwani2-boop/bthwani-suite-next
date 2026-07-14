-- LEGACY_FILENAME_ONLY — not a slice reference
INSERT INTO dsh_store_actor_scopes (actor_id, actor_role, store_id, scope_type)
VALUES
  ('partner-local-001', 'partner', 'store-test-grocery', 'own'),
  ('field-local-001', 'field', 'store-1002', 'assigned'),
  ('captain-local-001', 'captain', 'store-1005', 'assigned'),
  ('operator-local-001', 'operator', 'store-test-grocery', 'all')
ON CONFLICT (actor_id, actor_role, store_id) DO UPDATE SET
  scope_type = EXCLUDED.scope_type,
  active = true;
