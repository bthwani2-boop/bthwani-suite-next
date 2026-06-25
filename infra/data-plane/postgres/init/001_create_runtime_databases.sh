#!/bin/sh
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'identity_runtime') THEN
    CREATE ROLE identity_runtime LOGIN PASSWORD 'identity_runtime_password';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dsh_runtime') THEN
    CREATE ROLE dsh_runtime LOGIN PASSWORD 'dsh_runtime_password';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dsh_local') THEN
    CREATE ROLE dsh_local LOGIN PASSWORD 'dsh_local_password';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wlt_runtime') THEN
    CREATE ROLE wlt_runtime LOGIN PASSWORD 'wlt_runtime_password';
  END IF;
END
$$;

SELECT 'CREATE DATABASE identity_runtime OWNER identity_runtime'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'identity_runtime')\gexec

SELECT 'CREATE DATABASE dsh_runtime OWNER dsh_runtime'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dsh_runtime')\gexec

SELECT 'CREATE DATABASE dsh_local OWNER dsh_local'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dsh_local')\gexec

SELECT 'CREATE DATABASE wlt_runtime OWNER wlt_runtime'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'wlt_runtime')\gexec
SQL
