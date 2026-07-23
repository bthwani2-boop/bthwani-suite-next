-- All declared DSH foreign-key column pairs must use exactly the same
-- PostgreSQL type and typmod. This prevents text/uuid and varchar-length drift.

DO $$
DECLARE
  mismatch RECORD;
BEGIN
  FOR mismatch IN
    SELECT
      child_rel.relname AS child_table,
      child_att.attname AS child_column,
      format_type(child_att.atttypid, child_att.atttypmod) AS child_type,
      parent_rel.relname AS parent_table,
      parent_att.attname AS parent_column,
      format_type(parent_att.atttypid, parent_att.atttypmod) AS parent_type,
      constraint_row.conname AS constraint_name
    FROM pg_constraint constraint_row
    JOIN pg_class child_rel
      ON child_rel.oid = constraint_row.conrelid
    JOIN pg_namespace child_namespace
      ON child_namespace.oid = child_rel.relnamespace
    JOIN pg_class parent_rel
      ON parent_rel.oid = constraint_row.confrelid
    JOIN unnest(constraint_row.conkey) WITH ORDINALITY child_key(attnum, ord)
      ON TRUE
    JOIN unnest(constraint_row.confkey) WITH ORDINALITY parent_key(attnum, ord)
      ON parent_key.ord = child_key.ord
    JOIN pg_attribute child_att
      ON child_att.attrelid = child_rel.oid
     AND child_att.attnum = child_key.attnum
    JOIN pg_attribute parent_att
      ON parent_att.attrelid = parent_rel.oid
     AND parent_att.attnum = parent_key.attnum
    WHERE constraint_row.contype = 'f'
      AND child_namespace.nspname = 'public'
      AND child_rel.relname LIKE 'dsh\_%' ESCAPE '\'
      AND format_type(child_att.atttypid, child_att.atttypmod)
          IS DISTINCT FROM format_type(parent_att.atttypid, parent_att.atttypmod)
  LOOP
    RAISE EXCEPTION
      'foreign key type mismatch: %.% (%) -> %.% (%) via %',
      mismatch.child_table,
      mismatch.child_column,
      mismatch.child_type,
      mismatch.parent_table,
      mismatch.parent_column,
      mismatch.parent_type,
      mismatch.constraint_name;
  END LOOP;
END
$$;
