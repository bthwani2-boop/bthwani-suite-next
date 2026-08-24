-- DSH-1041: retire non-owner Administration projections.
--
-- Partner lifecycle state is owned by the Partner domain and captain
-- credentials are owned by Workforce. Administration had no canonical writer
-- for either table, and every route, contract, DTO, hook, and runtime reader has
-- moved away before this cutover. Deliberately omit CASCADE: an undiscovered
-- database consumer must block the migration instead of being deleted silently.

BEGIN;

DROP TABLE dsh_admin_partner_activations;
DROP TABLE dsh_admin_captain_credentials;

DO $$
BEGIN
  IF to_regclass('public.dsh_admin_partner_activations') IS NOT NULL
     OR to_regclass('public.dsh_admin_captain_credentials') IS NOT NULL THEN
    RAISE EXCEPTION 'dsh-1041 non-owner Administration projections remain after cutover'
      USING ERRCODE = '23514';
  END IF;
END;
$$;

COMMIT;
