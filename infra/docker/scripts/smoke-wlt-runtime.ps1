$ErrorActionPreference = "Stop"

throw "WLT runtime is RESERVED_NOT_ACTIVE. Activate only inside a WLT/payment slice after backend Dockerfile, migrations, seed, /health, /ready, and financial smoke exist."
