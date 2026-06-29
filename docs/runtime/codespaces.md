# Codespaces Runtime

Codespaces is the first heavy-runtime path for this repository. It runs Docker inside the GitHub-hosted codespace and does not require local Docker capacity on the user's machine.

Create a codespace when local Docker is unavailable, slow, or too resource-heavy. Stop it when runtime work is done. Delete it when the branch no longer needs stored workspace state. Closing the browser tab does not immediately stop the codespace; stop it explicitly from GitHub or the Codespaces CLI when finished.

Compute is consumed while the codespace is running. Storage remains allocated while the codespace exists. Runtime containers do not start automatically from `.devcontainer/devcontainer.json`.

Useful commands:

```powershell
pnpm run runtime:codespaces:check
pnpm run runtime:codespaces:core
pnpm run runtime:codespaces:wlt
pnpm run runtime:codespaces:smoke
pnpm run runtime:status
pnpm run runtime:down
```

Do not leave container logs or watch processes running when runtime proof is complete. Do not place production secrets in Codespaces repository files.
