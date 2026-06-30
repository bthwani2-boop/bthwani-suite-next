#!/usr/bin/env bash
set -euo pipefail

PNPM_HOME="/workspaces/.codespaces/shared/pnpm-home"
mkdir -p "${PNPM_HOME}"
export PNPM_HOME
export PATH="${PNPM_HOME}:${PATH}"

command -v node
node --version
command -v corepack
corepack --version
corepack enable --install-directory "${PNPM_HOME}"
corepack prepare pnpm@10.34.2 --activate
hash -r || true
command -v pnpm
pnpm --version
test "$(pnpm --version)" = "10.34.2"

echo "on-create complete: pnpm is available from ${PNPM_HOME}"
