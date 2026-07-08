# Verification Matrix

Tracks verified execution and checks.

| Phase | Check | Command / File | Status |
| --- | --- | --- | --- |
| 1 | DB Seeds Convergence | `apply-central-catalog-seed.ps1` | `PASS` |
| 2 | Backend Unit Tests | `go test ./...` | `PASS` |
| 3 | Backend Compile | `go build ./...` | `PASS` |
| 4 | Client Generation | `pnpm -w run openapi:generate` | `PASS` |
| 5 | Frontend Compile | `pnpm -w run typecheck` | `PASS` |
