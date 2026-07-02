# Local vs Codespaces Runtime

Local Docker is a lightweight fallback for focused checks. Codespaces is the preferred path for heavier Docker runtime work because the Docker daemon runs inside the GitHub-hosted environment.

Remote Docker is a later option for a dedicated server and must use SSH Docker contexts only. Git is the connection between local work and Codespaces; local Docker is not shared with the codespace.

Runtime remains opt-in:

```powershell
pnpm run runtime:dev-core
pnpm run runtime:dev-financial
pnpm run runtime:down
```

Do not expose Postgres, MinIO console, or financial simulators publicly.
