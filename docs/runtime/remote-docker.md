# Remote Docker

Remote Docker is a later fallback for running containers on a dedicated server. It is not Codespaces and it is not required for normal development.

Remote Docker must use Docker contexts over SSH. Public TCP Docker endpoints such as `tcp://host:2375` are forbidden by default. Do not use production secrets with remote development contexts.

Volumes are evaluated on the machine that runs the Docker daemon. If the daemon is remote, the repository path and mounted files must exist on that remote server.

The repository currently exposes read/reset helpers for the active Docker context:

```powershell
pnpm run runtime:context:status
pnpm run runtime:context:local
```

There is no canonical repository command for creating a remote context. If remote Docker is required, create/select the SSH context using the installed Docker CLI under an explicitly reviewed operational procedure, then confirm it with `runtime:context:status`. Do not add a documentation-only `pnpm` command that does not exist in `package.json`.

Prefer Codespaces first. Use a remote server only when Codespaces is not suitable and SSH access is controlled.
