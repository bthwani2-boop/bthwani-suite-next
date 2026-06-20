$ErrorActionPreference = "Stop"

throw "DSH runtime is RESERVED_NOT_ACTIVE. Activate only inside a DSH slice after backend Dockerfile, migrations, seed, /health, /ready, and API smoke exist."
