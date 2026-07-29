# VC-003 retired verification

`wlt-retired-runtime-operations.test.mjs.retired` asserted the existence and
content of `services/wlt/contracts/retired-runtime-operations.json`, a
subtractive retirement registry. `tools/important-scripts/contracts-foundation.mjs`
now forbids that file's existence outright (a subtractive registry is a
second mutable definition of API truth). The registry file was removed;
this test — which required it to exist — became stale and, unguarded, threw
`ENOENT` instead of asserting.

Per `tools/validclean-repository-reconstruction/05_DELETION_RETENTION_PROTOCOL.md`
§5, existence-of-registry tests for a retired subtractive registry are in the
explicitly "removable after extraction" class. No other file references this
test (`git grep` confirmed zero consumers) — it is not wired into any
`package.json` script, CI workflow, or guard. Archived rather than deleted
per repository retention policy.
