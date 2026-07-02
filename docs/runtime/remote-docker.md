# Remote Docker

Remote Docker is a later fallback for running containers on a dedicated server. It is not Codespaces and it is not required for normal development.

Remote Docker must use Docker contexts over SSH. Public TCP Docker endpoints such as `tcp://host:2375` are forbidden by default. Do not use production secrets with remote development contexts.

Volumes are evaluated on the machine that runs the Docker daemon. If the daemon is remote, the repository path and mounted files must exist on that remote server.

Useful commands:

```powershell
pnpm run runtime:context:status
pnpm run runtime:context:local
pnpm run runtime:context:remote -- -ContextName bthwani-remote -SshHost user@example.com
```

Prefer Codespaces first. Use a remote server only when Codespaces is not suitable and SSH access is controlled.
