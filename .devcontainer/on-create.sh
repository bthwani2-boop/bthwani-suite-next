#!/usr/bin/env bash
set -euo pipefail

echo "=== bthwani-suite-next: on-create ==="
echo "user: $(id -un)"
echo "path: ${PATH}"

command -v node
node --version

command -v corepack
corepack --version
corepack enable
corepack prepare pnpm@10.34.2 --activate
hash -r || true

command -v pnpm
pnpm --version
test "$(pnpm --version)" = "10.34.2"

command -v go
go version

command -v docker
docker --version
docker compose version

command -v gh
gh --version | head -1

command -v psql
psql --version

pnpm install --frozen-lockfile

echo "=== on-create complete ==="
