# Infrastructure Foundation

Canonical Docker runtime file:

```text
infra/docker/compose.runtime.yml
```

Forbidden in Foundation-005:

```text
infra/docker/compose.local.yml
infra/docker/compose.full.yml
infra/docker/compose.slice.yml
per-journey compose files
```

Current data-plane policy:

- PostgreSQL runs by default through Docker.
- MinIO is profile-only for media.
- Redis is not active.
- MongoDB is forbidden unless a future explicit decision changes that.