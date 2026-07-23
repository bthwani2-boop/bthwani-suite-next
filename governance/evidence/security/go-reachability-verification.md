# Go vulnerability reachability verification

- Branch: lianbassam
- Go toolchain: go version go1.26.5 linux/amd64
- OpenPGP imports: 0
- GO-2026-5932 scope: openpgp packages only
- Exception expiry: 2026-10-31
- Master merge: not performed

| Module | govulncheck | tests | build |
|---|---:|---:|---:|
| `core/identity/backend` | 0 | 0 | 0 |
| `services/dsh/backend` | 0 | 0 | 0 |

Result: PASS — no reachable known Go vulnerabilities were reported in the affected modules.
