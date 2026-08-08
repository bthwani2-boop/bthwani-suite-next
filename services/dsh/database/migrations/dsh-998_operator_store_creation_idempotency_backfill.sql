-- dsh-998_operator_store_creation_idempotency_backfill.sql
--
-- Preserve retry continuity across the dsh-997 cutover. Legacy create-store
-- entries stored a serialized DshStoreRow in response_body; DshStoreRow uses
-- Go's default JSON field names, so response_body->>'ID' identifies the created
-- store. Joining that store gives the authoritative OperatorContext.
--
-- Unresolvable legacy rows are intentionally left in the legacy ledger rather
-- than guessed into a context. New runtime writes use only the scoped ledger.

BEGIN;

INSERT INTO dsh_operator_store_creation_idempotency (
  operator_context_id,
  actor_id,
  idempotency_key,
  request_hash,
  response_body,
  created_at,
  expires_at
)
SELECT
  store.operator_context_id,
  legacy.actor_id,
  legacy.idempotency_key,
  legacy.request_hash,
  legacy.response_body,
  legacy.created_at,
  legacy.expires_at
FROM dsh_store_idempotency AS legacy
JOIN dsh_stores AS store
  ON store.id = NULLIF(btrim(legacy.response_body ->> 'ID'), '')
WHERE legacy.operation = 'create-store'
  AND btrim(store.operator_context_id) <> ''
ON CONFLICT (operator_context_id, actor_id, idempotency_key) DO NOTHING;

COMMIT;
