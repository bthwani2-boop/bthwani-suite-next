-- DSH-1042: prove the legacy administration role registry is gone.
--
-- dsh-1034 performed the historical cutover. This forward migration closes
-- the remaining cleanup obligation without a cascading delete and fails if a consumer
-- was missed or a future dependency has appeared.

BEGIN;

DO $$
DECLARE
    legacy_roles REGCLASS := to_regclass('public.dsh_admin_roles');
BEGIN
    IF legacy_roles IS NULL THEN
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE confrelid = legacy_roles
    ) THEN
        RAISE EXCEPTION 'dsh_admin_roles still has foreign-key consumers; refusing non-cascade drop';
    END IF;

    DROP TABLE public.dsh_admin_roles;
END
$$;

DO $$
BEGIN
    IF to_regclass('public.dsh_admin_roles') IS NOT NULL THEN
        RAISE EXCEPTION 'dsh_admin_roles remains after explicit non-cascade cleanup';
    END IF;
END
$$;

COMMIT;
