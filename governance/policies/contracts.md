# Contract and Ownership Policy

Status: ACTIVE_CANONICAL

`contracts/master.openapi.yaml` is an index of exactly one entry contract per
bounded context. Each entry owns and declares its leaf modules. Every public
route has one owner, one unique `operationId`, one runtime implementation, and
one generated type source.

The binding chain is:

```text
owner OpenAPI → generated client → owned transport/controller → consumer state
```

Static binding does not prove network execution, authorization, persistence, or
runtime success. Runtime claims require same-commit request, response, negative
authorization, failure, and persistence evidence where applicable.

DSH owns operational commerce, catalog, checkout intent, orders, fulfillment,
and application-facing financial projections. WLT alone owns wallets, payments,
refunds, settlements, payouts, commission, COD financial truth, ledger,
reconciliation, and financial audit. Applications never call WLT directly.

`shared/ui-kit` owns shared visual tokens and reusable components. Applications
must use its public exports rather than parallel design systems or deep imports.
Generated outputs are reproducible artifacts and must not become editable truth.
