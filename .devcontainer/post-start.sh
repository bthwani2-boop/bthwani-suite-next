#!/usr/bin/env bash
set -euo pipefail

if [ -s "${NVM_DIR:-/usr/local/share/nvm}/nvm.sh" ]; then
  . "${NVM_DIR:-/usr/local/share/nvm}/nvm.sh"
fi
hash -r || true

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          bthwani-suite-next — Codespace Ready            ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Port   │  Service                                       ║"
echo "║─────────┼────────────────────────────────────────────────║"
echo "║  58080  │  DSH API                                       ║"
echo "║  58083  │  WLT API                                       ║"
echo "║  58082  │  Identity API                                  ║"
echo "║  13000  │  control-panel                                 ║"
echo "║  18101  │  app-client                                    ║"
echo "║  18102  │  app-partner                                   ║"
echo "║  18103  │  app-captain                                   ║"
echo "║  18104  │  app-field                                     ║"
echo "║  8025   │  mailpit-ui                                    ║"
echo "║  58090  │  wiremock-financial-provider                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  user: $(id -un)"
echo "  node: $(node --version)   pnpm: $(pnpm --version)   go: $(go version | awk '{print $3}')"
echo "  docker: $(docker --version)"
echo ""
echo "  Run 'pnpm run runtime:codespaces:check' to verify Codespaces runtime."
echo ""
