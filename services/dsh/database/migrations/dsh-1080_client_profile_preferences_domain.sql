-- DSH-1080: Establish the canonical client profile preference domain.
-- Profile locale is a supported language code; profile currency follows the WLT YER domain.

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM dsh_client_profiles
        WHERE locale NOT IN ('ar', 'ar-SA', 'en', 'en-US')
    ) THEN
        RAISE EXCEPTION 'dsh_client_profiles contains an unsupported locale';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM dsh_client_profiles
        WHERE currency_preference NOT IN ('SAR', 'YER')
    ) THEN
        RAISE EXCEPTION 'dsh_client_profiles contains an unsupported currency preference';
    END IF;
END $$;

UPDATE dsh_client_profiles
SET locale = CASE WHEN locale LIKE 'ar%' THEN 'ar' ELSE 'en' END;
UPDATE dsh_client_profiles
SET currency_preference = 'YER'
WHERE currency_preference = 'SAR'; -- ALLOW_FOREIGN_CURRENCY_EXAMPLE

ALTER TABLE dsh_client_profiles
    DROP CONSTRAINT IF EXISTS dsh_client_profiles_locale_check,
    DROP CONSTRAINT IF EXISTS dsh_client_profiles_currency_check;

ALTER TABLE dsh_client_profiles
    ALTER COLUMN locale SET DEFAULT 'ar',
    ALTER COLUMN currency_preference SET DEFAULT 'YER';

ALTER TABLE dsh_client_profiles
    ADD CONSTRAINT dsh_client_profiles_locale_check CHECK (locale IN ('ar', 'en')),
    ADD CONSTRAINT dsh_client_profiles_currency_check CHECK (currency_preference = 'YER');

COMMIT;
