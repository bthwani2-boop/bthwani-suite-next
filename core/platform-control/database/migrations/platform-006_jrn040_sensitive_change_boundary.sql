-- PLATFORM-006 / JRN-040: database-final boundary for sensitive change-set targets.
-- The application already rejects secret-shaped input. This trigger ensures that
-- no internal caller can persist an item classified as sensitive or take a
-- rollback/validation snapshot of an existing sensitive platform variable.

CREATE OR REPLACE FUNCTION platform_jrn040_reject_sensitive_change_set_item()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    existing_classification TEXT;
    normalized_classification TEXT := lower(btrim(COALESCE(NEW.classification, '')));
BEGIN
    IF normalized_classification IN (
        'secret',
        'sensitive',
        'confidential',
        'restricted',
        'credential',
        'credentials',
        'password',
        'token',
        'private_key',
        'api_key',
        'client_secret'
    ) THEN
        RAISE EXCEPTION 'sensitive platform change-set classification is forbidden'
            USING ERRCODE = '22023';
    END IF;

    IF NEW.target_type = 'variable' THEN
        SELECT lower(btrim(classification))
          INTO existing_classification
          FROM platform_variables
         WHERE variable_key = NEW.target_key
           AND scope_type = NEW.scope_type
           AND scope_id = NEW.scope_id;

        IF existing_classification IN (
            'secret',
            'sensitive',
            'confidential',
            'restricted',
            'credential',
            'credentials',
            'password',
            'token',
            'private_key',
            'api_key',
            'client_secret'
        ) THEN
            RAISE EXCEPTION 'existing sensitive platform variable cannot enter a change set'
                USING ERRCODE = '22023';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_jrn040_sensitive_change_set_item_trigger
    ON platform_change_set_items;

CREATE TRIGGER platform_jrn040_sensitive_change_set_item_trigger
BEFORE INSERT OR UPDATE OF target_type, target_key, scope_type, scope_id, classification
ON platform_change_set_items
FOR EACH ROW
EXECUTE FUNCTION platform_jrn040_reject_sensitive_change_set_item();

COMMENT ON FUNCTION platform_jrn040_reject_sensitive_change_set_item() IS
    'JRN-040 final database guard: rejects sensitive classifications and existing sensitive variable targets before change-set persistence.';
