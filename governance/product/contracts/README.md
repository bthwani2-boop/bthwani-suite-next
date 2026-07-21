# Product Truth Contracts

This directory stores capability-specific Product Truth contracts validated by `tools/guards/sdlc/validate-product-truth.mjs`.

Rules:

- Copy `TEMPLATE.product-truth.json` only when a governed capability requires a contract.
- The filename must be `<capability-id>.product-truth.json` using lowercase filesystem-safe form.
- Do not commit runtime logs, screenshots, generated reports, or evidence packs here.
- A contract records product intent and acceptance ownership; it does not prove runtime, QA, security, release, or production status.
- SaaS and tenancy implementation are explicitly outside the current execution scope.
