# Archived: ad-hoc refactor tooling (2026-08-06)

These files were committed into live repository paths as throwaway scripts during
an unauthorized automated refactor (`5fa36b2cb`, reverted in `d0494ee1a`). They
are archived here per the "archive, don't delete" policy — Git history is the
canonical record, but the files themselves must not sit in live source paths.

- `remove_stale_routes.js` — one-shot script to strip 11 hardcoded routes from
  `tools/guards/dsh-route-declaration-allowlist.json`. Not a general tool: the
  route list is hardcoded to a specific gap snapshot. Superseded by properly
  declaring those routes' OpenAPI operations instead of manipulating the
  allowlist file directly.

Do not restore these to the repository root or import them into build/CI.
