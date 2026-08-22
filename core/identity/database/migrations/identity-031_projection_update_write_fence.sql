-- identity-031: projection columns are compatibility readbacks only. Even an
-- UPDATE that happens to write the same non-empty JSON is rejected so legacy
-- writers cannot masquerade as a canonical mutation.

CREATE OR REPLACE FUNCTION identity_guard_actor_access_projection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF current_setting('bthwani.identity_access_projection', true) = '1' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF COALESCE(NEW.roles, ARRAY[]::text[]) = ARRAY[]::text[]
           AND COALESCE(NEW.permissions, '[]'::jsonb) = '[]'::jsonb THEN
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'identity actor access projection is read-only; use the canonical Identity RBAC writer';
    END IF;

    RAISE EXCEPTION 'identity actor access projection is read-only; use the canonical Identity RBAC writer';
END
$$;
