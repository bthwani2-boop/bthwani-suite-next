#!/usr/bin/env bash
# post-start.sh — Runs on every Codespace start (after on-create).
# Prints port manifest and environment summary.
set -euo pipefail

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
echo "  node: $(node --version)   pnpm: $(pnpm --version)   go: $(go version | awk '{print $3}')"
echo ""
echo "  Run 'pnpm run foundation:gate' to verify workspace integrity."
echo ""
