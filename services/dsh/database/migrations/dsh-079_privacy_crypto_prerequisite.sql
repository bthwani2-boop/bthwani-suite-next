-- dsh-079_privacy_crypto_prerequisite.sql
-- pgcrypto provides digest() used to preserve auditability without retaining
-- raw client subjects in address privacy events.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
COMMIT;
