# WLT Docker Runtime Contract

Owner:

- infra/docker owns compose services, containers, networks, volumes, profiles, healthchecks.
- services/wlt/database owns WLT migrations, seeds, indexes, schema, read models.

Reserved runtime:

- profile: wlt
- container: bthwani-wlt-api-runtime
- host port: 58083
- internal port: 8083
- database: wlt_runtime
- network: bthwani-runtime

WLT owns:

- wallet
- payment
- refund
- settlement
- payout
- commission
- COD
- ledger
- reconciliation

Activation is forbidden until:

- WLT backend runtime exists
- WLT Dockerfile exists
- WLT DB migration exists
- WLT local seed exists
- /health and /ready exist
- financial smoke exists
- no financial mutation outside WLT
