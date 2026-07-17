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

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'workforce_runtime') THEN
    CREATE ROLE workforce_runtime LOGIN PASSWORD 'workforce_runtime_password';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'providers_runtime') THEN
    CREATE ROLE providers_runtime LOGIN PASSWORD 'providers_runtime_password';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'platform_control_runtime') THEN
    CREATE ROLE platform_control_runtime LOGIN PASSWORD 'platform_control_runtime_password';
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

SELECT 'CREATE DATABASE workforce_runtime OWNER workforce_runtime'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'workforce_runtime')\gexec

SELECT 'CREATE DATABASE providers_runtime OWNER providers_runtime'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'providers_runtime')\gexec

SELECT 'CREATE DATABASE platform_control_runtime OWNER platform_control_runtime'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'platform_control_runtime')\gexec
SQL
