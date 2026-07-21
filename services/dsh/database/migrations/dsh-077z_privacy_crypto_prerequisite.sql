-- dsh-077z_privacy_crypto_prerequisite.sql
-- Sorted before dsh-078 so digest() is available while privacy functions and
-- triggers are created on clean and upgraded databases.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
COMMIT;
