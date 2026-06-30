#!/usr/bin/env bash
set -euo pipefail

PNPM_HOME="${HOME}/.local/bin"
mkdir -p "${PNPM_HOME}"
export PNPM_HOME
export PATH="${PNPM_HOME}:${PATH}"

if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable --install-directory "${PNPM_HOME}"
  corepack prepare pnpm@10.34.2 --activate
  hash -r || true
fi

node --version
pnpm --version

echo "bthwani-suite-next Codespace ready. pnpm is available from ${PNPM_HOME}."
