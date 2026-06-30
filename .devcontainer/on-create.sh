#!/usr/bin/env bash
# on-create.sh — Runs once when the Codespace container is created.
# Installs and verifies all required toolchain components.
set -euo pipefail

echo "=== bthwani-suite-next: on-create ==="

# Enable corepack and pin pnpm version
corepack enable
corepack prepare pnpm@10.34.2 --activate
echo "pnpm: $(pnpm --version)"

# Verify Node version
echo "node: $(node --version)"

# Verify Go
echo "go: $(go version)"

# Verify Docker CLI
echo "docker: $(docker --version)"
echo "docker compose: $(docker compose version)"

# Verify GitHub CLI
echo "gh: $(gh --version | head -1)"

# Verify PostgreSQL client
echo "psql: $(psql --version)"

# Install root dependencies (frozen)
pnpm install --frozen-lockfile

echo "=== on-create complete ==="
